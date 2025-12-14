"""
Agent Manager - Gestión de agentes remotos
Maneja conexiones, registro y datos de agentes
"""

from typing import Dict, List, Optional
from datetime import datetime
import asyncio
from fastapi import WebSocket
import json

class RemoteServer:
    """Representa un servidor remoto registrado"""
    def __init__(self, server_id: str, hostname: str, ip: str):
        self.id = server_id
        self.hostname = hostname
        self.ip = ip
        self.os = ""
        self.docker_version = ""
        self.connected = False
        self.last_heartbeat = None
        self.containers = []
        self.metrics = {}
        self.websocket: Optional[WebSocket] = None
        self.registered_at = datetime.now()
        
    def to_dict(self):
        return {
            "id": self.id,
            "hostname": self.hostname,
            "ip": self.ip,
            "os": self.os,
            "docker_version": self.docker_version,
            "connected": self.connected,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "containers_count": len(self.containers),
            "metrics": self.metrics,
            "registered_at": self.registered_at.isoformat()
        }

class AgentManager:
    """Gestor de agentes remotos"""
    
    def __init__(self):
        self.servers: Dict[str, RemoteServer] = {}
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def register_agent(self, server_info: dict, websocket: WebSocket) -> RemoteServer:
        """Registra un nuevo agente"""
        server_id = server_info.get('id')
        
        if server_id in self.servers:
            server = self.servers[server_id]
            server.connected = True
            server.websocket = websocket
        else:
            server = RemoteServer(
                server_id=server_id,
                hostname=server_info.get('hostname', 'unknown'),
                ip=server_info.get('ip', 'unknown')
            )
            server.os = server_info.get('os', '')
            server.docker_version = server_info.get('docker_version', '')
            server.connected = True
            server.websocket = websocket
            self.servers[server_id] = server
        
        self.active_connections[server_id] = websocket
        print(f"✅ Agente registrado: {server.hostname} ({server.ip})")
        
        return server
    
    def disconnect_agent(self, server_id: str):
        """Desconecta un agente"""
        if server_id in self.servers:
            self.servers[server_id].connected = False
            self.servers[server_id].websocket = None
            print(f"🔌 Agente desconectado: {server_id}")
        
        if server_id in self.active_connections:
            del self.active_connections[server_id]
    
    def update_agent_data(self, server_id: str, data: dict):
        """Actualiza los datos de un agente"""
        if server_id not in self.servers:
            return
        
        server = self.servers[server_id]
        server.containers = data.get('containers', [])
        server.metrics = data.get('metrics', {})
        server.last_heartbeat = datetime.now()
        
        # Actualizar info del servidor si viene
        if 'server_info' in data:
            info = data['server_info']
            server.os = info.get('os', server.os)
            server.docker_version = info.get('docker_version', server.docker_version)
    
    def get_server(self, server_id: str) -> Optional[RemoteServer]:
        """Obtiene un servidor por ID"""
        return self.servers.get(server_id)
    
    def get_all_servers(self) -> List[RemoteServer]:
        """Obtiene todos los servidores"""
        return list(self.servers.values())
    
    def get_connected_servers(self) -> List[RemoteServer]:
        """Obtiene servidores conectados"""
        return [s for s in self.servers.values() if s.connected]
    
    def get_all_containers(self) -> List[dict]:
        """Obtiene todos los contenedores de todos los servidores"""
        all_containers = []
        
        for server in self.servers.values():
            for container in server.containers:
                # Agregar info del servidor al contenedor
                container_data = container.copy()
                container_data['server_id'] = server.id
                container_data['server_hostname'] = server.hostname
                container_data['server_ip'] = server.ip
                container_data['is_remote'] = True
                all_containers.append(container_data)
        
        return all_containers
    
    def get_aggregated_metrics(self) -> dict:
        """Obtiene métricas agregadas de todos los servidores"""
        total_containers = 0
        total_servers = len(self.servers)
        connected_servers = len(self.get_connected_servers())
        
        for server in self.servers.values():
            total_containers += len(server.containers)
        
        return {
            "total_servers": total_servers,
            "connected_servers": connected_servers,
            "total_containers": total_containers,
            "servers": [s.to_dict() for s in self.servers.values()]
        }
    
    async def broadcast_to_agents(self, message: dict):
        """Envía un mensaje a todos los agentes conectados"""
        disconnected = []
        
        for server_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error enviando a {server_id}: {e}")
                disconnected.append(server_id)
        
        # Limpiar desconectados
        for server_id in disconnected:
            self.disconnect_agent(server_id)

# Instancia global
agent_manager = AgentManager()
