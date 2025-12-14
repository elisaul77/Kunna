#!/usr/bin/env python3
"""
Monitor de Docker para kuNNA
Detecta automáticamente contenedores y los registra en kuNNA
"""

import docker
import requests
import time
import sys
from datetime import datetime

# Configuración
KUNNA_API = "http://localhost:8000/api/services"
SCAN_INTERVAL = 10  # Segundos entre escaneos
DEBUG = True

# Emojis por tipo de contenedor (heurística)
CONTAINER_ICONS = {
    'postgres': '🐘',
    'mysql': '🐬',
    'mongo': '🍃',
    'redis': '🔴',
    'nginx': '🌐',
    'jupyter': '📊',
    'mlflow': '🤖',
    'grafana': '📈',
    'prometheus': '📊',
    'elasticsearch': '🔍',
    'kibana': '📊',
    'rabbitmq': '🐰',
    'kafka': '📨',
    'minio': '📦',
    'docker': '🐳',
    'node': '💚',
    'python': '🐍',
    'backend': '⚙️',
    'frontend': '🎨',
    'api': '🔌',
    'web': '🌐',
}

# Categorías por tipo
CONTAINER_CATEGORIES = {
    'postgres': 'Databases',
    'mysql': 'Databases',
    'mongo': 'Databases',
    'redis': 'Databases',
    'nginx': 'Web Servers',
    'jupyter': 'Data Science',
    'mlflow': 'ML & AI',
    'grafana': 'Monitoring',
    'prometheus': 'Monitoring',
    'elasticsearch': 'Search',
    'kibana': 'Monitoring',
    'rabbitmq': 'Message Queue',
    'kafka': 'Message Queue',
    'minio': 'Storage',
}

def log(message, level="INFO"):
    """Log con timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def get_container_icon(name):
    """Determina el emoji según el nombre del contenedor"""
    name_lower = name.lower()
    for keyword, icon in CONTAINER_ICONS.items():
        if keyword in name_lower:
            return icon
    return '🐳'  # Default: Docker whale

def get_container_category(name):
    """Determina la categoría según el nombre del contenedor"""
    name_lower = name.lower()
    for keyword, category in CONTAINER_CATEGORIES.items():
        if keyword in name_lower:
            return category
    return 'Docker Services'

def get_container_color(category):
    """Asigna color según la categoría"""
    colors = {
        'Databases': '#336791',
        'Web Servers': '#009639',
        'Data Science': '#F37626',
        'ML & AI': '#0194e2',
        'Monitoring': '#F46800',
        'Search': '#005571',
        'Message Queue': '#FF6600',
        'Storage': '#C72E49',
        'Docker Services': '#2496ed',
    }
    return colors.get(category, '#3b82f6')

def get_existing_services():
    """Obtiene servicios ya registrados en kuNNA"""
    try:
        response = requests.get(KUNNA_API, timeout=5)
        if response.status_code == 200:
            return {s['name']: s for s in response.json()}
        return {}
    except Exception as e:
        log(f"Error obteniendo servicios existentes: {e}", "ERROR")
        return {}

def register_service(service_data):
    """Registra un servicio en kuNNA"""
    try:
        response = requests.post(KUNNA_API, json=service_data, timeout=5)
        if response.status_code == 200:
            log(f"✅ Registrado: {service_data['name']}")
            return True
        else:
            log(f"⚠️ No se pudo registrar {service_data['name']}: {response.text}", "WARNING")
            return False
    except Exception as e:
        log(f"❌ Error registrando {service_data['name']}: {e}", "ERROR")
        return False

def extract_port_mapping(container):
    """Extrae el primer puerto mapeado del contenedor"""
    ports = container.ports
    
    if not ports:
        return None
    
    # Buscar el primer puerto público mapeado
    for container_port, host_info in ports.items():
        if host_info:
            # host_info puede ser una lista de mappings
            if isinstance(host_info, list) and len(host_info) > 0:
                host_port = host_info[0].get('HostPort')
                if host_port:
                    return int(host_port)
    
    return None

def get_running_containers():
    """Obtiene todos los contenedores en ejecución"""
    try:
        client = docker.from_env()
        containers = client.containers.list()
        
        container_info = []
        for container in containers:
            port = extract_port_mapping(container)
            
            if port:
                info = {
                    'id': container.short_id,
                    'name': container.name,
                    'image': container.image.tags[0] if container.image.tags else 'unknown',
                    'status': container.status,
                    'port': port
                }
                container_info.append(info)
        
        return container_info
    except Exception as e:
        log(f"Error conectando con Docker: {e}", "ERROR")
        return []

def sync_containers():
    """Sincroniza contenedores de Docker con kuNNA"""
    log("🔍 Escaneando contenedores Docker...")
    
    # Obtener contenedores activos
    containers = get_running_containers()
    
    if not containers:
        log("No se encontraron contenedores con puertos expuestos")
        return
    
    log(f"Encontrados {len(containers)} contenedores con puertos")
    
    # Obtener servicios ya registrados
    existing_services = get_existing_services()
    
    # Registrar nuevos contenedores
    for container in containers:
        name = container['name']
        
        # Verificar si ya está registrado
        if name in existing_services:
            if DEBUG:
                log(f"⏭️ {name} ya está registrado", "DEBUG")
            continue
        
        # Preparar datos del servicio
        category = get_container_category(name)
        icon = get_container_icon(name)
        color = get_container_color(category)
        
        service_data = {
            'name': name,
            'description': f"Contenedor Docker: {container['image']}",
            'url': f"http://localhost:{container['port']}",
            'icon': icon,
            'category': category,
            'color': color,
            'isActive': True
        }
        
        # Registrar en kuNNA
        register_service(service_data)

def monitor_loop():
    """Loop principal de monitoreo"""
    log("🚀 Iniciando monitor de Docker para kuNNA")
    log(f"Intervalo de escaneo: {SCAN_INTERVAL} segundos")
    log(f"API kuNNA: {KUNNA_API}")
    log("Presiona Ctrl+C para detener\n")
    
    try:
        while True:
            sync_containers()
            log(f"⏳ Esperando {SCAN_INTERVAL} segundos...\n")
            time.sleep(SCAN_INTERVAL)
    except KeyboardInterrupt:
        log("\n👋 Monitor detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        log(f"Error fatal: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    # Verificar conexión con Docker
    try:
        client = docker.from_env()
        client.ping()
        log("✅ Conexión con Docker establecida")
    except Exception as e:
        log(f"❌ No se puede conectar con Docker: {e}", "ERROR")
        log("Asegúrate de que Docker esté corriendo y tengas permisos", "ERROR")
        sys.exit(1)
    
    # Verificar conexión con kuNNA
    try:
        response = requests.get(KUNNA_API.replace('/services', '/health'), timeout=5)
        if response.status_code == 200:
            log("✅ Conexión con kuNNA establecida")
        else:
            raise Exception("API no responde correctamente")
    except Exception as e:
        log(f"❌ No se puede conectar con kuNNA: {e}", "ERROR")
        log("Asegúrate de que kuNNA esté corriendo en http://localhost:8000", "ERROR")
        sys.exit(1)
    
    # Iniciar monitoreo
    monitor_loop()
