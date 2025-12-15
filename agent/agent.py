#!/usr/bin/env python3
"""
kuNNA Agent - Cliente para monitoreo remoto de Docker
Detecta contenedores y envía datos al servidor central
"""

import docker
import socket
import platform
import time
import json
import os
import sys
import asyncio
import websockets
from datetime import datetime
import psutil

# Configuración desde variables de entorno
CENTRAL_URL = os.getenv('KUNNA_CENTRAL_URL', 'ws://localhost:8000')
AGENT_TOKEN = os.getenv('KUNNA_AGENT_TOKEN', 'default-token')
SERVER_ID = os.getenv('KUNNA_SERVER_ID', socket.gethostname())
HEARTBEAT_INTERVAL = int(os.getenv('KUNNA_HEARTBEAT_INTERVAL', '10'))

class KunnaAgent:
    def __init__(self):
        self.docker_client = None
        self.websocket = None
        self.server_info = self.get_server_info()
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}", flush=True)
    
    def get_server_info(self):
        """Obtiene información del servidor"""
        return {
            "id": SERVER_ID,
            "hostname": socket.gethostname(),
            "ip": self.get_ip_address(),
            "os": f"{platform.system()} {platform.release()}",
            "architecture": platform.machine(),
            "python_version": platform.python_version()
        }
    
    def get_ip_address(self):
        """Obtiene la IP del servidor"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def connect_docker(self):
        """Conecta con Docker"""
        try:
            # Conectar explícitamente al socket de Docker
            self.docker_client = docker.DockerClient(base_url='unix:///var/run/docker.sock')
            version = self.docker_client.version()
            self.server_info['docker_version'] = version.get('Version', 'unknown')
            self.log(f"✅ Conectado a Docker: {version.get('Version')}")
            return True
        except Exception as e:
            self.log(f"❌ Error conectando a Docker: {e}", "ERROR")
            return False
    
    def get_containers(self):
        """Obtiene lista de contenedores con métricas"""
        if not self.docker_client:
            return []
        
        containers = []
        try:
            for container in self.docker_client.containers.list(all=True):
                # Info básica
                info = {
                    "id": container.short_id,
                    "name": container.name,
                    "image": container.image.tags[0] if container.image.tags else "unknown",
                    "status": container.status,
                    "state": container.attrs['State']['Status'],
                }
                
                # Puertos
                ports = []
                port_bindings = container.attrs['NetworkSettings'].get('Ports', {})
                for container_port, host_bindings in port_bindings.items():
                    if host_bindings:
                        # Puerto expuesto al host
                        for binding in host_bindings:
                            ports.append(f"{binding['HostPort']}:{container_port}")
                    else:
                        # Puerto interno sin binding al host (ej: servicios detrás de proxy)
                        # Extraer solo el número de puerto (ej: "5678/tcp" -> "5678")
                        internal_port = container_port.split('/')[0]
                        ports.append(f"internal:{internal_port}")
                info['ports'] = ports
                
                # Networks
                info['networks'] = list(container.attrs['NetworkSettings']['Networks'].keys())
                
                # Labels
                labels = container.labels
                info['app_group'] = labels.get('kunna.app', 
                                              labels.get('com.docker.compose.project', 'uncategorized'))
                
                # Métricas (solo si está corriendo)
                if container.status == 'running':
                    try:
                        stats = container.stats(stream=False)
                        # CPU
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                   stats['precpu_stats']['cpu_usage']['total_usage']
                        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                      stats['precpu_stats']['system_cpu_usage']
                        cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0.0
                        
                        # Memoria
                        mem_usage = stats['memory_stats']['usage']
                        mem_limit = stats['memory_stats']['limit']
                        mem_percent = (mem_usage / mem_limit) * 100.0
                        
                        info['metrics'] = {
                            'cpu_percent': round(cpu_percent, 2),
                            'memory_usage': mem_usage,
                            'memory_percent': round(mem_percent, 2)
                        }
                    except:
                        info['metrics'] = None
                else:
                    info['metrics'] = None
                
                containers.append(info)
                
        except Exception as e:
            self.log(f"Error obteniendo contenedores: {e}", "ERROR")
        
        return containers
    
    def get_system_metrics(self):
        """Obtiene métricas del sistema"""
        try:
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent,
                "uptime": int(time.time() - psutil.boot_time())
            }
        except:
            return {}
    
    def build_payload(self):
        """Construye el payload completo para enviar"""
        return {
            "type": "agent_data",
            "server_info": self.server_info,
            "containers": self.get_containers(),
            "metrics": self.get_system_metrics(),
            "timestamp": datetime.now().isoformat()
        }
    
    async def send_heartbeat(self, websocket):
        """Envía datos periódicamente al servidor central"""
        while True:
            try:
                payload = self.build_payload()
                await websocket.send(json.dumps(payload))
                self.log(f"📊 Datos enviados: {len(payload['containers'])} contenedores")
                await asyncio.sleep(HEARTBEAT_INTERVAL)
            except Exception as e:
                self.log(f"Error enviando heartbeat: {e}", "ERROR")
                raise
    
    async def receive_commands(self, websocket):
        """Recibe y procesa comandos del servidor central"""
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                
                msg_type = data.get('type')
                
                if msg_type == 'container_control':
                    # Comando de control de contenedor
                    action = data.get('action')
                    container_id = data.get('container_id')
                    
                    self.log(f"🎮 Comando recibido: {action} en {container_id}")
                    
                    response = await self.handle_container_control(action, container_id)
                    await websocket.send(json.dumps(response))
                    
                else:
                    self.log(f"⚠️  Tipo de mensaje desconocido: {msg_type}", "WARNING")
                    
            except Exception as e:
                self.log(f"Error recibiendo comandos: {e}", "ERROR")
                raise
    
    async def handle_container_control(self, action: str, container_id: str):
        """Maneja comandos de control de contenedores"""
        try:
            container = self.client.containers.get(container_id)
            
            if action == 'start':
                container.start()
                self.log(f"✅ Contenedor {container.name} iniciado")
                return {
                    "status": "success",
                    "message": f"Contenedor {container.name} iniciado",
                    "container_id": container_id
                }
            
            elif action == 'stop':
                container.stop(timeout=10)
                self.log(f"🛑 Contenedor {container.name} detenido")
                return {
                    "status": "success",
                    "message": f"Contenedor {container.name} detenido",
                    "container_id": container_id
                }
            
            elif action == 'restart':
                container.restart(timeout=10)
                self.log(f"🔄 Contenedor {container.name} reiniciado")
                return {
                    "status": "success",
                    "message": f"Contenedor {container.name} reiniciado",
                    "container_id": container_id
                }
            
            else:
                return {
                    "status": "error",
                    "error": f"Acción desconocida: {action}",
                    "container_id": container_id
                }
        
        except docker.errors.NotFound:
            return {
                "status": "error",
                "error": f"Contenedor no encontrado: {container_id}",
                "container_id": container_id
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "container_id": container_id
            }
    
    async def send_data(self):
        """Envía datos al servidor central"""
        ws_url = f"{CENTRAL_URL}/ws/agent/data"
        
        while True:
            try:
                async with websockets.connect(
                    ws_url,
                    extra_headers={"Authorization": f"Bearer {AGENT_TOKEN}"}
                ) as websocket:
                    self.websocket = websocket
                    self.log(f"✅ Conectado al central: {CENTRAL_URL}")
                    
                    # Enviar registro inicial
                    registration = {
                        "type": "agent_register",
                        "server_info": self.server_info,
                        "token": AGENT_TOKEN
                    }
                    await websocket.send(json.dumps(registration))
                    self.log(f"📡 Agente registrado: {SERVER_ID}")
                    
                    # Crear tareas concurrentes para enviar datos y recibir comandos
                    send_task = asyncio.create_task(self.send_heartbeat(websocket))
                    receive_task = asyncio.create_task(self.receive_commands(websocket))
                    
                    # Esperar a que alguna tarea termine (usualmente por error)
                    done, pending = await asyncio.wait(
                        [send_task, receive_task],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    # Cancelar tareas pendientes
                    for task in pending:
                        task.cancel()
                        
            except websockets.exceptions.ConnectionClosed:
                self.log("🔌 Conexión cerrada, reconectando en 5s...", "WARNING")
                await asyncio.sleep(5)
            except Exception as e:
                self.log(f"❌ Error: {e}", "ERROR")
                await asyncio.sleep(5)
    
    async def run(self):
        """Ejecuta el agente"""
        self.log(f"🚀 Iniciando kuNNA Agent")
        self.log(f"   Servidor: {SERVER_ID}")
        self.log(f"   Central: {CENTRAL_URL}")
        self.log(f"   Intervalo: {HEARTBEAT_INTERVAL}s")
        
        if not self.connect_docker():
            self.log("❌ No se pudo conectar a Docker, saliendo...", "ERROR")
            sys.exit(1)
        
        await self.send_data()

def main():
    agent = KunnaAgent()
    asyncio.run(agent.run())

if __name__ == "__main__":
    main()
