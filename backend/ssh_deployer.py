"""
SSH Deployer - Despliega agentes en servidores remotos via SSH
"""

import paramiko
import time
import secrets
from typing import Optional, Callable
import io

class SSHDeployer:
    """Gestiona el deployment de agentes via SSH"""
    
    def __init__(self):
        self.client: Optional[paramiko.SSHClient] = None
        
    def connect(self, host: str, port: int, username: str, 
                password: Optional[str] = None, 
                private_key: Optional[str] = None) -> bool:
        """Conecta al servidor via SSH"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            connect_kwargs = {
                'hostname': host,
                'port': port,
                'username': username,
                'timeout': 10
            }
            
            if private_key:
                # Usar llave privada
                key_file = io.StringIO(private_key)
                pkey = paramiko.RSAKey.from_private_key(key_file)
                connect_kwargs['pkey'] = pkey
            elif password:
                # Usar contraseña
                connect_kwargs['password'] = password
            else:
                raise ValueError("Se requiere password o private_key")
            
            self.client.connect(**connect_kwargs)
            return True
            
        except Exception as e:
            print(f"Error conectando SSH: {e}")
            return False
    
    def disconnect(self):
        """Cierra la conexión SSH"""
        if self.client:
            self.client.close()
            self.client = None
    
    def execute_command(self, command: str, sudo: bool = False) -> tuple[int, str, str]:
        """Ejecuta un comando en el servidor remoto"""
        if not self.client:
            return -1, "", "No hay conexión SSH"
        
        try:
            if sudo:
                command = f"sudo {command}"
            
            stdin, stdout, stderr = self.client.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            
            return exit_code, output, error
            
        except Exception as e:
            return -1, "", str(e)
    
    def check_docker(self) -> bool:
        """Verifica si Docker está instalado"""
        exit_code, output, _ = self.execute_command("docker --version")
        return exit_code == 0
    
    def install_docker(self, os_type: str = "ubuntu") -> bool:
        """Instala Docker en el servidor"""
        print("📦 Instalando Docker...")
        
        if os_type in ["ubuntu", "debian"]:
            commands = [
                "sudo apt-get update",
                "sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common",
                "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -",
                "sudo add-apt-repository 'deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable'",
                "sudo apt-get update",
                "sudo apt-get install -y docker-ce docker-ce-cli containerd.io",
                "sudo systemctl start docker",
                "sudo systemctl enable docker"
            ]
        else:
            print(f"❌ OS no soportado: {os_type}")
            return False
        
        for cmd in commands:
            exit_code, output, error = self.execute_command(cmd, sudo=False)
            if exit_code != 0:
                print(f"❌ Error ejecutando: {cmd}")
                print(f"   Error: {error}")
                return False
        
        return True
    
    def generate_agent_token(self) -> str:
        """Genera un token único para el agente"""
        return secrets.token_urlsafe(32)
    
    def deploy_agent(self, central_url: str, token: str) -> bool:
        """Despliega el agente kuNNA usando Python directamente"""
        try:
            # Detener contenedor existente
            print("🛑 Deteniendo agente existente (si existe)...")
            self.execute_command("docker rm -f kunna-agent", sudo=True)
            
            # Obtener hostname
            _, hostname, _ = self.execute_command("hostname")
            hostname = hostname.strip()
            
            # Crear el código del agente inline
            agent_code = f'''
import docker
import websockets
import asyncio
import json
import psutil
import time
from datetime import datetime

CENTRAL_URL = "{central_url}"
AGENT_TOKEN = "{token}"
SERVER_ID = "{hostname}"
HEARTBEAT_INTERVAL = 10

client = docker.from_env()

async def send_data():
    uri = CENTRAL_URL.replace("http://", "ws://").replace("https://", "wss://")
    uri = f"{{uri}}/ws/agent"
    
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                print(f"✅ Conectado a {{CENTRAL_URL}}")
                
                # Handshake
                await websocket.send(json.dumps({{
                    "type": "register",
                    "token": AGENT_TOKEN,
                    "server_id": SERVER_ID
                }}))
                
                while True:
                    # Recopilar datos
                    containers = []
                    for c in client.containers.list(all=True):
                        containers.append({{
                            "id": c.id[:12],
                            "name": c.name,
                            "image": c.image.tags[0] if c.image.tags else "unknown",
                            "status": c.status,
                            "state": c.attrs.get("State", {{}})
                        }})
                    
                    cpu = psutil.cpu_percent(interval=1)
                    memory = psutil.virtual_memory()
                    disk = psutil.disk_usage("/")
                    
                    data = {{
                        "type": "heartbeat",
                        "server_id": SERVER_ID,
                        "timestamp": datetime.now().isoformat(),
                        "containers": containers,
                        "metrics": {{
                            "cpu_percent": cpu,
                            "memory_percent": memory.percent,
                            "memory_used_gb": round(memory.used / (1024**3), 2),
                            "memory_total_gb": round(memory.total / (1024**3), 2),
                            "disk_percent": disk.percent,
                            "disk_used_gb": round(disk.used / (1024**3), 2),
                            "disk_total_gb": round(disk.total / (1024**3), 2)
                        }}
                    }}
                    
                    await websocket.send(json.dumps(data))
                    await asyncio.sleep(HEARTBEAT_INTERVAL)
                    
        except Exception as e:
            print(f"❌ Error: {{e}}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(send_data())
'''
            
            # Crear directorio
            print("📁 Creando directorio para el agente...")
            self.execute_command("sudo mkdir -p /tmp/kunna-agent && sudo chmod 777 /tmp/kunna-agent", sudo=False)
            
            # Crear archivo agent.py
            print("📝 Creando script del agente...")
            # Escapar comillas para bash
            agent_code_escaped = agent_code.replace('"', '\\"').replace('$', '\\$')
            create_file_cmd = f'echo "{agent_code_escaped}" | sudo tee /tmp/kunna-agent/agent.py > /dev/null'
            exit_code, output, error = self.execute_command(create_file_cmd, sudo=False)
            
            if exit_code != 0:
                print(f"❌ Error creando archivo: {error}")
                return False
            
            # Crear Dockerfile
            print("🐳 Creando Dockerfile...")
            dockerfile_content = """FROM python:3.11-slim
WORKDIR /app
RUN pip install docker websockets psutil
COPY agent.py .
CMD ["python", "agent.py"]
"""
            create_dockerfile_cmd = f'echo "{dockerfile_content}" | sudo tee /tmp/kunna-agent/Dockerfile > /dev/null'
            self.execute_command(create_dockerfile_cmd, sudo=False)
            
            # Build imagen
            print("🔨 Construyendo imagen del agente...")
            exit_code, output, error = self.execute_command(
                "cd /tmp/kunna-agent && sudo docker build -t kunna-agent:local .",
                sudo=False
            )
            
            if exit_code != 0:
                print(f"❌ Error building: {error}")
                return False
            
            # Run contenedor
            print("🚀 Desplegando agente...")
            docker_cmd = f"""sudo docker run -d \
                --name kunna-agent \
                --restart unless-stopped \
                -v /var/run/docker.sock:/var/run/docker.sock:ro \
                kunna-agent:local"""
            
            exit_code, output, error = self.execute_command(docker_cmd, sudo=False)
            
            if exit_code != 0:
                print(f"❌ Error desplegando: {error}")
                return False
            
            # Verificar
            time.sleep(3)
            exit_code, output, _ = self.execute_command("sudo docker ps --filter name=kunna-agent", sudo=False)
            
            if "kunna-agent" in output:
                print("✅ Agente desplegado correctamente")
                return True
            else:
                print("❌ El agente no está corriendo")
                # Ver logs para debug
                self.execute_command("sudo docker logs kunna-agent", sudo=False)
                return False
                
        except Exception as e:
            print(f"❌ Error en deploy_agent: {e}")
            return False
    
    def full_deployment(self, host: str, port: int, username: str,
                       password: Optional[str], private_key: Optional[str],
                       central_url: str, 
                       progress_callback: Optional[Callable] = None) -> dict:
        """
        Realiza el deployment completo del agente
        
        Returns:
            dict con status, message, token
        """
        result = {
            "success": False,
            "message": "",
            "token": None,
            "steps": []
        }
        
        def log_progress(step: str, status: str = "info"):
            result["steps"].append({"step": step, "status": status})
            if progress_callback:
                progress_callback(step, status)
        
        try:
            # 1. Conectar SSH
            log_progress("🔍 Conectando al servidor...")
            if not self.connect(host, port, username, password, private_key):
                result["message"] = "No se pudo conectar via SSH"
                log_progress("❌ Conexión fallida", "error")
                return result
            
            log_progress("✅ Conexión establecida", "success")
            
            # 2. Verificar Docker
            log_progress("🐳 Verificando Docker...")
            if not self.check_docker():
                log_progress("⚠️ Docker no instalado, instalando...", "warning")
                if not self.install_docker():
                    result["message"] = "No se pudo instalar Docker"
                    log_progress("❌ Instalación de Docker fallida", "error")
                    return result
                log_progress("✅ Docker instalado", "success")
            else:
                log_progress("✅ Docker ya instalado", "success")
            
            # 3. Generar token
            log_progress("🔑 Generando token de autenticación...")
            token = self.generate_agent_token()
            result["token"] = token
            log_progress("✅ Token generado", "success")
            
            # 4. Desplegar agente
            log_progress("🚀 Desplegando kuNNA Agent...")
            if not self.deploy_agent(central_url, token):
                result["message"] = "No se pudo desplegar el agente"
                log_progress("❌ Deployment fallido", "error")
                return result
            
            log_progress("✅ Agente desplegado correctamente", "success")
            
            # 5. Esperar conexión
            log_progress("🔗 Esperando conexión del agente...")
            time.sleep(5)  # Dar tiempo para que se conecte
            log_progress("✅ Deployment completado", "success")
            
            result["success"] = True
            result["message"] = "Agente desplegado exitosamente"
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            log_progress(f"❌ Error: {str(e)}", "error")
        
        finally:
            self.disconnect()
        
        return result

# Instancia global
deployer = SSHDeployer()
