from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import json
import os
from datetime import datetime
import time
import asyncio
import docker
import psutil
import socket

# Import agent manager and ssh deployer
from agent_manager import agent_manager
from ssh_deployer import deployer

# Docker client for local container control
try:
    docker_client = docker.from_env()
except Exception as e:
    print(f"⚠️  Warning: Could not connect to Docker: {e}")
    docker_client = None

app = FastAPI(
    title="kuNNA API",
    description="API para gestionar servicios y enlaces",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Middleware para capturar requests
@app.middleware("http")
async def track_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    # Solo trackear endpoints de API (no assets)
    if request.url.path.startswith("/api/"):
        event = {
            "type": "request",
            "from": "external",
            "to": "kunna-backend",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration": round(duration * 1000, 2),  # ms
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast a clientes WebSocket
        if manager.active_connections:
            asyncio.create_task(manager.broadcast(event))
    
    return response

DATA_FILE = "/app/data/services.json"

class TrafficEvent(BaseModel):
    """Modelo para eventos de tráfico entre servicios"""
    from_service: str
    to_service: str
    method: str = "HTTP"
    path: Optional[str] = None
    status: Optional[int] = None
    duration: Optional[float] = None  # en milisegundos
    timestamp: Optional[str] = None

class Service(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    url: str
    icon: Optional[str] = "🔗"
    category: str = "general"
    color: Optional[str] = "#3b82f6"
    isActive: bool = True
    status: Optional[str] = "running"
    container_id: Optional[str] = None
    app_group: Optional[str] = "uncategorized"
    networks: Optional[List[str]] = []
    createdAt: Optional[str] = None
    is_remote: Optional[bool] = False
    server_id: Optional[str] = None
    server_hostname: Optional[str] = None

def load_services():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_services(services):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2, ensure_ascii=False)

def initialize_default_services():
    if not os.path.exists(DATA_FILE):
        # Inicializar con lista vacía - los servicios se agregarán automáticamente por el monitor
        save_services([])

initialize_default_services()

@app.get("/")
def read_root():
    return {
        "message": "kuNNA API - Gestión de servicios",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "services": "/api/services",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/system/ips")
def get_system_ips():
    """Obtiene todas las IPs disponibles en las interfaces de red"""
    ips = []
    interfaces = psutil.net_if_addrs()
    for interface_name, interface_addresses in interfaces.items():
        for address in interface_addresses:
            if address.family == socket.AF_INET:
                # Ignorar localhost si hay otras IPs
                if address.address == "127.0.0.1":
                    continue
                
                # Determinar tipo de red (heurística)
                net_type = "Local"
                if interface_name.startswith(('wg', 'tun', 'vpn', 'tailscale')):
                    net_type = "VPN"
                elif interface_name.startswith(('docker', 'br-', 'veth')):
                    net_type = "Docker"
                
                ips.append({
                    "interface": interface_name,
                    "address": address.address,
                    "type": net_type
                })
    
    # Si no hay nada más que localhost, incluirlo
    if not ips:
        ips.append({"interface": "lo", "address": "127.0.0.1", "type": "Loopback"})
        
    return {"ips": ips}

@app.get("/api/services", response_model=List[Service])
def get_services(category: Optional[str] = None, active: Optional[bool] = None):
    # Servicios locales del archivo JSON
    services = load_services()
    
    # Agregar servicios remotos de los agentes
    remote_containers = agent_manager.get_all_containers()
    for container in remote_containers:
        # Extraer puertos expuestos (formato: "HostPort:ContainerPort" o "internal:Port")
        ports = container.get('ports', [])
        
        # Priorizar puertos HTTP comunes (80, 443, 8080, 8443, 3000, 5000, 5678)
        http_ports = ['80', '443', '8080', '8443', '3000', '5000', '5678']
        selected_port = None
        is_internal = False
        
        if ports:
            # Buscar puerto HTTP común (primero externos, luego internos)
            for port_mapping in ports:
                if port_mapping.startswith('internal:'):
                    # Puerto interno
                    internal_port = port_mapping.split(':')[1]
                    if internal_port in http_ports and not selected_port:
                        selected_port = internal_port
                        is_internal = True
                else:
                    # Puerto expuesto al host
                    host_port = port_mapping.split(':')[0]
                    if host_port in http_ports:
                        selected_port = host_port
                        is_internal = False
                        break
            
            # Si no hay puerto HTTP común, usar el primero disponible
            if not selected_port:
                first_port = ports[0]
                if first_port.startswith('internal:'):
                    selected_port = first_port.split(':')[1]
                    is_internal = True
                else:
                    selected_port = first_port.split(':')[0]
                    is_internal = False
        
        # Construir URL usando la IP real del servidor (server_id) y el puerto expuesto
        if selected_port and not is_internal:
            url = f"http://{container['server_id']}:{selected_port}"
            description = f"Remote: {container['image']} on {container['server_hostname']}"
        elif selected_port and is_internal:
            # Puerto interno - probablemente detrás de proxy
            url = "#"
            description = f"🔒 Internal: {container['image']} on {container['server_hostname']} (port {selected_port} via proxy)"
        else:
            # Sin puerto expuesto - servicio interno
            url = "#"
            description = f"🔒 Internal: {container['image']} on {container['server_hostname']} (no exposed ports)"
        
        # Convertir contenedor remoto a formato de servicio
        remote_service = {
            "id": f"remote-{container['server_id']}-{container['id']}",
            "name": container['name'],
            "description": description,
            "url": url,
            "icon": "🌐",
            "category": "Remote Services",
            "color": "#9333ea",
            "isActive": container['status'] == 'running',
            "status": container['status'],
            "container_id": f"remote-{container['server_id']}-{container['id']}",
            "app_group": f"{container['server_hostname']}-{container.get('app_group', 'unknown')}",
            "networks": container.get('networks', []),
            "is_remote": True,
            "server_id": container['server_id'],
            "server_hostname": container['server_hostname'],
            "createdAt": None
        }
        services.append(remote_service)
    
    if category:
        services = [s for s in services if s.get("category") == category]
    
    if active is not None:
        services = [s for s in services if s.get("isActive") == active]
    
    return services

@app.get("/api/services/{service_id}", response_model=Service)
def get_service(service_id: str):
    services = load_services()
    service = next((s for s in services if s["id"] == service_id), None)
    
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    return service

@app.post("/api/services", response_model=Service)
def create_service(service: Service):
    services = load_services()
    
    # Verificar si ya existe un servicio con el mismo nombre (evitar duplicados del docker-monitor)
    existing = next((s for s in services if s.get("name") == service.name), None)
    if existing:
        # Si ya existe, actualizarlo en lugar de crear uno nuevo
        service.id = existing["id"]
        service.createdAt = existing.get("createdAt", datetime.now().isoformat())
        
        index = next((i for i, s in enumerate(services) if s["id"] == existing["id"]), None)
        services[index] = service.dict()
        save_services(services)
        return service
    
    # Si no existe, crear nuevo con ID incremental
    new_id = str(max([int(s["id"]) for s in services if s["id"].isdigit()] + [0]) + 1)
    service.id = new_id
    service.createdAt = datetime.now().isoformat()
    
    services.append(service.dict())
    save_services(services)
    
    return service

@app.put("/api/services/{service_id}", response_model=Service)
def update_service(service_id: str, service: Service):
    services = load_services()
    
    index = next((i for i, s in enumerate(services) if s["id"] == service_id), None)
    
    if index is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    service.id = service_id
    if not service.createdAt:
        service.createdAt = services[index].get("createdAt", datetime.now().isoformat())
    
    services[index] = service.dict()
    save_services(services)
    
    return service

@app.delete("/api/services/{service_id}")
def delete_service(service_id: str):
    services = load_services()
    
    services = [s for s in services if s["id"] != service_id]
    save_services(services)
    
    return {"message": "Servicio eliminado correctamente"}

@app.get("/api/categories")
def get_categories():
    services = load_services()
    categories = list(set(s.get("category", "general") for s in services))
    return {"categories": sorted(categories)}

@app.get("/api/topology")
def get_topology():
    """Obtiene la topología de servicios para visualización SCADA (incluye locales + remotos)"""
    # Servicios locales
    local_services = load_services()
    
    # Servicios remotos
    remote_containers = agent_manager.get_all_containers()
    
    # Combinar todos los servicios
    all_services = local_services.copy()
    
    # Convertir contenedores remotos a formato servicio
    for container in remote_containers:
        all_services.append({
            "id": f"remote-{container['server_id']}-{container['id']}",
            "name": container["name"],
            "status": container.get("status", "unknown"),
            "isActive": container.get("status") == "running",
            "icon": "🌐",
            "networks": container.get("networks", []),
            "app_group": f"remote-{container['server_hostname']}",
            "is_remote": True,
            "server_id": container['server_id'],
            "server_hostname": container['server_hostname'],
            "container_id": f"remote-{container['server_id']}-{container['id']}"
        })
    
    # Agrupar por app_group
    groups = {}
    connections = []
    
    for service in all_services:
        app_group = service.get("app_group", "uncategorized")
        
        if app_group not in groups:
            groups[app_group] = {
                "id": app_group,
                "name": app_group,
                "services": []
            }
        
        groups[app_group]["services"].append({
            "id": service["id"],
            "name": service["name"],
            "status": service.get("status", "unknown"),
            "isActive": service.get("isActive", True),
            "icon": service.get("icon", "🔗"),
            "networks": service.get("networks", []),
            "is_remote": service.get("is_remote", False),
            "server_hostname": service.get("server_hostname"),
            "container_id": service.get("container_id")
        })
    
    # Detectar conexiones entre servicios (por redes compartidas)
    network_map = {}
    for service in all_services:
        for network in service.get("networks", []):
            if network not in network_map:
                network_map[network] = []
            network_map[network].append(service["id"])
    
    # Crear conexiones entre servicios en la misma red
    for network, service_ids in network_map.items():
        if len(service_ids) > 1:
            for i, source in enumerate(service_ids):
                for target in service_ids[i+1:]:
                    connections.append({
                        "source": source,
                        "target": target,
                        "network": network
                    })
    
    return {
        "groups": list(groups.values()),
        "connections": connections,
        "total_services": len(all_services),
        "active_services": len([s for s in all_services if s.get("isActive", True)])
    }

@app.patch("/api/services/{service_id}")
def patch_service(service_id: str, updates: dict):
    """Actualiza parcialmente un servicio (para estados)"""
    services = load_services()
    
    index = next((i for i, s in enumerate(services) if s["id"] == service_id), None)
    
    if index is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    allowed_fields = {
        "description",
        "url",
        "icon",
        "category",
        "color",
        "isActive",
        "status",
        "container_id",
        "app_group",
        "networks",
        "is_remote",
        "server_id",
        "server_hostname",
    }

    # Actualizar solo los campos permitidos (y permitir agregar nuevos campos conocidos)
    for key, value in updates.items():
        if key in allowed_fields:
            services[index][key] = value
    
    save_services(services)
    
    return services[index]

@app.post("/api/traffic")
async def report_traffic(event: TrafficEvent):
    """Endpoint para que servicios externos reporten tráfico al SCADA"""
    # Completar timestamp si no viene
    if not event.timestamp:
        event.timestamp = datetime.now().isoformat()
    
    # Crear evento en formato compatible con WebSocket
    traffic_event = {
        "type": "request",
        "from": event.from_service,
        "to": event.to_service,
        "method": event.method,
        "path": event.path or "/",
        "status": event.status or 200,
        "duration": event.duration or 0,
        "timestamp": event.timestamp
    }
    
    # Broadcast a clientes SCADA
    if manager.active_connections:
        await manager.broadcast(traffic_event)
    
    return {"status": "ok", "broadcasted_to": len(manager.active_connections)}

# ============= CONTROL DE CONTENEDORES =============

@app.post("/api/containers/{container_id}/start")
async def start_container(container_id: str):
    """Inicia un contenedor (local o remoto)"""
    # Detectar si es remoto por el formato del ID
    if container_id.startswith("remote-"):
        # Formato: remote-{server_id}-{container_id}
        parts = container_id.split("-", 2)
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="ID de contenedor remoto inválido")
        
        server_id = parts[1]
        real_container_id = parts[2]
        
        # Enviar comando al agente remoto
        server = agent_manager.servers.get(server_id)
        if not server:
            raise HTTPException(status_code=404, detail="Servidor remoto no encontrado")
        
        try:
            response = await agent_manager.container_control(
                server_id=server_id,
                action="start",
                container_id=real_container_id,
                timeout=2.0,
            )

            if response.get("status") == "success":
                return {"status": "success", "message": response.get("message") or f"Contenedor {real_container_id} iniciado en {server.hostname}"}

            raise HTTPException(status_code=500, detail=response.get("error", "Error desconocido"))
        except asyncio.TimeoutError:
            # Compatibilidad: agentes antiguos ejecutan el comando pero no responden con request_id
            return JSONResponse(
                status_code=202,
                content={
                    "status": "accepted",
                    "message": f"Comando enviado al agente ({server.hostname}). Esperando actualización de estado...",
                },
            )
        except ConnectionError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # Contenedor local
        if not docker_client:
            raise HTTPException(status_code=503, detail="Docker no disponible")
        
        try:
            def _start_local():
                container = docker_client.containers.get(container_id)
                container.start()
                return container.name

            name = await asyncio.to_thread(_start_local)
            return {"status": "success", "message": f"Contenedor {name} iniciado"}
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Contenedor no encontrado")
        except docker.errors.APIError as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/containers/{container_id}/stop")
async def stop_container(container_id: str):
    """Detiene un contenedor (local o remoto)"""
    # Detectar si es remoto
    if container_id.startswith("remote-"):
        parts = container_id.split("-", 2)
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="ID de contenedor remoto inválido")
        
        server_id = parts[1]
        real_container_id = parts[2]
        
        server = agent_manager.servers.get(server_id)
        if not server:
            raise HTTPException(status_code=404, detail="Servidor remoto no encontrado")
        
        try:
            response = await agent_manager.container_control(
                server_id=server_id,
                action="stop",
                container_id=real_container_id,
                timeout=2.0,
            )

            if response.get("status") == "success":
                return {"status": "success", "message": response.get("message") or f"Contenedor {real_container_id} detenido en {server.hostname}"}

            raise HTTPException(status_code=500, detail=response.get("error", "Error desconocido"))
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=202,
                content={
                    "status": "accepted",
                    "message": f"Comando enviado al agente ({server.hostname}). Esperando actualización de estado...",
                },
            )
        except ConnectionError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # Contenedor local
        if not docker_client:
            raise HTTPException(status_code=503, detail="Docker no disponible")
        
        try:
            def _stop_local():
                container = docker_client.containers.get(container_id)
                container.stop(timeout=10)
                return container.name

            name = await asyncio.to_thread(_stop_local)
            return {"status": "success", "message": f"Contenedor {name} detenido"}
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Contenedor no encontrado")
        except docker.errors.APIError as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/containers/{container_id}/restart")
async def restart_container(container_id: str):
    """Reinicia un contenedor (local o remoto)"""
    # Detectar si es remoto
    if container_id.startswith("remote-"):
        parts = container_id.split("-", 2)
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="ID de contenedor remoto inválido")
        
        server_id = parts[1]
        real_container_id = parts[2]
        
        server = agent_manager.servers.get(server_id)
        if not server:
            raise HTTPException(status_code=404, detail="Servidor remoto no encontrado")
        
        try:
            response = await agent_manager.container_control(
                server_id=server_id,
                action="restart",
                container_id=real_container_id,
                timeout=2.0,
            )

            if response.get("status") == "success":
                return {"status": "success", "message": response.get("message") or f"Contenedor {real_container_id} reiniciado en {server.hostname}"}

            raise HTTPException(status_code=500, detail=response.get("error", "Error desconocido"))
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=202,
                content={
                    "status": "accepted",
                    "message": f"Comando enviado al agente ({server.hostname}). Esperando actualización de estado...",
                },
            )
        except ConnectionError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # Contenedor local
        if not docker_client:
            raise HTTPException(status_code=503, detail="Docker no disponible")
        
        try:
            def _restart_local():
                container = docker_client.containers.get(container_id)
                container.restart(timeout=10)
                return container.name

            name = await asyncio.to_thread(_restart_local)
            return {"status": "success", "message": f"Contenedor {name} reiniciado"}
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Contenedor no encontrado")
        except docker.errors.APIError as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket para transmitir eventos de tráfico en tiempo real"""
    await manager.connect(websocket)
    try:
        while True:
            # Mantener conexión abierta
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============= ENDPOINTS PARA AGENTES REMOTOS =============

@app.websocket("/ws/agent/data")
async def agent_websocket(websocket: WebSocket):
    """WebSocket para recibir datos de agentes remotos"""
    await websocket.accept()
    server_id = None
    
    try:
        while True:
            # Recibir mensaje del agente
            message = await websocket.receive_text()
            data = json.loads(message)
            
            msg_type = data.get('type')
            
            if msg_type == 'agent_register':
                # Registro inicial
                server_info = data.get('server_info', {})
                server = await agent_manager.register_agent(server_info, websocket)
                server_id = server.id
                
                # Confirmar registro
            
            elif msg_type == 'traffic_event':
                # Evento de tráfico desde agente remoto
                event = data.get('event', {})
                print(f"🚦 Traffic event recibido: {event.get('from_service')} → {event.get('to_service')}")
                
                # Reenviar al WebSocket de tráfico con metadata del servidor
                traffic_msg = {
                    "type": "request",
                    "from": event.get('from_service'),
                    "to": event.get('to_service'),
                    "method": event.get('method', 'HTTP'),
                    "path": event.get('path', '/'),
                    "status": event.get('status', 200),
                    "duration": event.get('duration', 0),
                    "timestamp": event.get('timestamp'),
                    "server_id": event.get('server_id'),
                    "server_hostname": event.get('server_hostname'),
                    "is_remote": True
                }
                
                # Broadcast a clientes SCADA
                if manager.active_connections:
                    print(f"📡 Broadcasting a {len(manager.active_connections)} clientes SCADA")
                    await manager.broadcast(traffic_msg)
                else:
                    print("⚠️  No hay clientes SCADA conectados")
                await websocket.send_json({
                    "type": "registration_confirmed",
                    "server_id": server_id,
                    "message": "Agente registrado correctamente"
                })
                
            elif msg_type == 'agent_data':
                # Actualización de datos
                if server_id:
                    agent_manager.update_agent_data(server_id, data)
                else:
                    # Si no está registrado, extraer server_id de los datos
                    server_info = data.get('server_info', {})
                    server_id = server_info.get('id')
                    if server_id:
                        agent_manager.update_agent_data(server_id, data)

            elif msg_type == 'container_control_response':
                # Respuesta a un comando previo (start/stop/restart)
                agent_manager.handle_agent_response(data)
                        
    except WebSocketDisconnect:
        if server_id:
            agent_manager.disconnect_agent(server_id)
    except Exception as e:
        print(f"Error en agent_websocket: {e}")
        if server_id:
            agent_manager.disconnect_agent(server_id)

@app.get("/api/remote/servers")
def get_remote_servers():
    """Obtiene lista de servidores remotos"""
    servers = agent_manager.get_all_servers()
    return {
        "total": len(servers),
        "connected": len(agent_manager.get_connected_servers()),
        "servers": [s.to_dict() for s in servers]
    }

@app.get("/api/remote/servers/{server_id}")
def get_remote_server(server_id: str):
    """Obtiene información de un servidor específico"""
    server = agent_manager.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")
    
    return server.to_dict()

@app.get("/api/remote/containers")
def get_remote_containers():
    """Obtiene todos los contenedores de servidores remotos"""
    containers = agent_manager.get_all_containers()
    return {
        "total": len(containers),
        "containers": containers
    }

@app.get("/api/remote/metrics")
def get_remote_metrics():
    """Obtiene métricas agregadas de todos los servidores"""
    return agent_manager.get_aggregated_metrics()

# ============= DEPLOYMENT ENDPOINTS =============

class DeploymentRequest(BaseModel):
    host: str
    port: int = 22
    username: str
    auth_method: str = "password"  # "password" or "key"
    password: Optional[str] = None
    private_key: Optional[str] = None
    central_url: Optional[str] = "ws://localhost:8000"
    docker_network: Optional[str] = None  # Red Docker para WireGuard/VPN

@app.post("/api/remote/deploy")
async def deploy_agent_endpoint(request: DeploymentRequest):
    """Despliega un agente en un servidor remoto via SSH"""
    
    # Validar autenticación
    if request.auth_method == "password" and not request.password:
        raise HTTPException(status_code=400, detail="Password requerido")
    if request.auth_method == "key" and not request.private_key:
        raise HTTPException(status_code=400, detail="Private key requerida")
    
    # Ejecutar deployment
    result = deployer.full_deployment(
        host=request.host,
        port=request.port,
        username=request.username,
        password=request.password,
        private_key=request.private_key,
        central_url=request.central_url,
        docker_network=request.docker_network
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {
        "success": True,
        "message": result["message"],
        "token": result["token"],
        "steps": result["steps"],
        "agent_will_connect_to": request.central_url
    }

@app.get("/api/topology/unified")
def get_unified_topology():
    """Obtiene topología unificada: local + remota"""
    # Servicios locales
    local_services = load_services()
    
    # Contenedores remotos
    remote_containers = agent_manager.get_all_containers()
    
    # Convertir contenedores remotos a formato de servicio
    remote_services = []
    for container in remote_containers:
        remote_services.append({
            "id": f"remote-{container['server_id']}-{container['id']}",
            "name": container['name'],
            "description": f"Remote container on {container['server_hostname']}",
            "url": f"http://{container['server_ip']}",
            "icon": "🌐",
            "category": "remote",
            "color": "#9333ea",
            "isActive": container['status'] == 'running',
            "status": container['status'],
            "app_group": f"{container['server_hostname']}-{container.get('app_group', 'unknown')}",
            "networks": container.get('networks', []),
            "server_id": container['server_id'],
            "server_hostname": container['server_hostname'],
            "is_remote": True
        })
    
    # Combinar todos los servicios
    all_services = local_services + remote_services
    
    # Agrupar por app_group
    groups = {}
    connections = []
    
    for service in all_services:
        app_group = service.get('app_group', 'uncategorized')
        
        if app_group not in groups:
            groups[app_group] = {
                "id": app_group,
                "name": app_group,
                "services": [],
                "is_remote": service.get('is_remote', False)
            }
        
        groups[app_group]["services"].append({
            "id": service["id"],
            "name": service["name"],
            "status": service.get("status", "unknown"),
            "isActive": service.get("isActive", True),
            "icon": service.get("icon", "🔗"),
            "networks": service.get("networks", []),
            "is_remote": service.get("is_remote", False),
            "server_hostname": service.get("server_hostname", "local")
        })
    
    # Detectar conexiones
    network_map = {}
    for service in all_services:
        for network in service.get("networks", []):
            if network not in network_map:
                network_map[network] = []
            network_map[network].append(service["id"])
    
    for network, service_ids in network_map.items():
        if len(service_ids) > 1:
            for i, source in enumerate(service_ids):
                for target in service_ids[i+1:]:
                    connections.append({
                        "source": source,
                        "target": target,
                        "network": network
                    })
    
    return {
        "groups": list(groups.values()),
        "connections": connections,
        "total_services": len(all_services),
        "local_services": len(local_services),
        "remote_services": len(remote_services),
        "active_services": len([s for s in all_services if s.get("isActive", True)])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
