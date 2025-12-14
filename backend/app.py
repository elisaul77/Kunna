from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import json
import os
from datetime import datetime

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
