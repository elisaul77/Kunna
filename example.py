#!/usr/bin/env python3
"""
Script de ejemplo para interactuar con kuNNA API
Puedes usar este script para automatizar la gestión de servicios
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

class KunnaClient:
    """Cliente para interactuar con kuNNA API"""
    
    def __init__(self, base_url=API_BASE):
        self.base_url = base_url
    
    def health_check(self):
        """Verifica el estado de la API"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()
    
    def list_services(self, category=None, active=None):
        """Lista todos los servicios"""
        params = {}
        if category:
            params['category'] = category
        if active is not None:
            params['active'] = str(active).lower()
        
        response = requests.get(f"{self.base_url}/services", params=params)
        return response.json()
    
    def get_service(self, service_id):
        """Obtiene un servicio específico"""
        response = requests.get(f"{self.base_url}/services/{service_id}")
        return response.json()
    
    def create_service(self, name, description, url, icon="🔗", 
                      category="general", color="#3b82f6"):
        """Crea un nuevo servicio"""
        data = {
            "name": name,
            "description": description,
            "url": url,
            "icon": icon,
            "category": category,
            "color": color,
            "isActive": True
        }
        
        response = requests.post(f"{self.base_url}/services", json=data)
        return response.json()
    
    def update_service(self, service_id, name, description, url, 
                      icon="🔗", category="general", color="#3b82f6", 
                      is_active=True):
        """Actualiza un servicio existente"""
        data = {
            "name": name,
            "description": description,
            "url": url,
            "icon": icon,
            "category": category,
            "color": color,
            "isActive": is_active
        }
        
        response = requests.put(f"{self.base_url}/services/{service_id}", json=data)
        return response.json()
    
    def delete_service(self, service_id):
        """Elimina un servicio"""
        response = requests.delete(f"{self.base_url}/services/{service_id}")
        return response.json()
    
    def get_categories(self):
        """Obtiene todas las categorías"""
        response = requests.get(f"{self.base_url}/categories")
        return response.json()


def main():
    """Ejemplo de uso del cliente"""
    client = KunnaClient()
    
    # 1. Health check
    print("🔍 Verificando estado de la API...")
    health = client.health_check()
    print(f"✅ Estado: {health['status']}\n")
    
    # 2. Crear servicios de ejemplo
    print("➕ Agregando servicios de ejemplo...")
    
    services_to_add = [
        {
            "name": "PostgreSQL",
            "description": "Base de datos relacional",
            "url": "http://localhost:5432",
            "icon": "🐘",
            "category": "Databases",
            "color": "#336791"
        },
        {
            "name": "Redis",
            "description": "Base de datos en memoria",
            "url": "http://localhost:6379",
            "icon": "🔴",
            "category": "Databases",
            "color": "#DC382D"
        },
        {
            "name": "Jupyter Lab",
            "description": "Entorno de desarrollo para Data Science",
            "url": "http://localhost:8888",
            "icon": "📊",
            "category": "Data Science",
            "color": "#F37626"
        },
        {
            "name": "Grafana",
            "description": "Monitoreo y visualización",
            "url": "http://localhost:3001",
            "icon": "📈",
            "category": "Monitoring",
            "color": "#F46800"
        }
    ]
    
    for service in services_to_add:
        try:
            result = client.create_service(**service)
            print(f"✅ Agregado: {service['name']} (ID: {result['id']})")
        except Exception as e:
            print(f"⚠️  {service['name']}: {str(e)}")
    
    print()
    
    # 3. Listar todos los servicios
    print("📋 Lista de servicios:")
    services = client.list_services()
    for service in services:
        print(f"  {service['icon']} {service['name']} - {service['url']}")
    
    print()
    
    # 4. Filtrar por categoría
    print("🗂️  Servicios de Databases:")
    db_services = client.list_services(category="Databases")
    for service in db_services:
        print(f"  {service['icon']} {service['name']}")
    
    print()
    
    # 5. Obtener categorías
    print("📂 Categorías disponibles:")
    categories = client.get_categories()
    for cat in categories['categories']:
        print(f"  - {cat}")
    
    print(f"\n🌐 Ver en: http://localhost:3000")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se puede conectar a kuNNA API")
        print("   Asegúrate de que los contenedores estén corriendo:")
        print("   cd /home/elisaul77/Documentos/Docker/kunna && docker-compose up -d")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
