from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import json
import os
from datetime import datetime
import time
import asyncio

app = FastAPI(
    title="kuNNA API",
    description="API para gestionar servicios y enlaces",
    version="1.0.0"
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
        
        # Log para debug
        print(f"🚦 Evento capturado: {request.method} {request.url.path} - {response.status_code}")
        print(f"   Clientes conectados: {len(manager.active_connections)}")
        
        # Broadcast a clientes WebSocket
        if manager.active_connections:
            asyncio.create_task(manager.broadcast(event))
        else:
            print("   ⚠️ No hay clientes WebSocket conectados")
    
    return response

DATA_FILE = "/app/data/services.json"

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
    app_group: Optional[str] = "uncategorized"
    networks: Optional[List[str]] = []
    createdAt: Optional[str] = None

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

@app.get("/api/services", response_model=List[Service])
def get_services(category: Optional[str] = None, active: Optional[bool] = None):
    services = load_services()
    
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
    """Obtiene la topología de servicios para visualización SCADA"""
    services = load_services()
    
    # Agrupar por app_group
    groups = {}
    connections = []
    
    for service in services:
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
            "networks": service.get("networks", [])
        })
    
    # Detectar conexiones entre servicios (por redes compartidas)
    network_map = {}
    for service in services:
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
        "total_services": len(services),
        "active_services": len([s for s in services if s.get("isActive", True)])
    }

@app.patch("/api/services/{service_id}")
def patch_service(service_id: str, updates: dict):
    """Actualiza parcialmente un servicio (para estados)"""
    services = load_services()
    
    index = next((i for i, s in enumerate(services) if s["id"] == service_id), None)
    
    if index is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Actualizar solo los campos proporcionados
    for key, value in updates.items():
        if key in services[index]:
            services[index][key] = value
    
    save_services(services)
    
    return services[index]

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
