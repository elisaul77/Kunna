#!/usr/bin/env python3
"""
Monitor de Docker para kuNNA
Detecta automáticamente contenedores y los registra en kuNNA
"""

import docker
import requests
import time
import sys
import os
from datetime import datetime

# Configuración
KUNNA_API_BASE = os.getenv("KUNNA_API_URL", "http://localhost:8000/api")
KUNNA_API = f"{KUNNA_API_BASE}/services"
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
    """Obtiene todos los contenedores (corriendo y detenidos)"""
    try:
        client = docker.from_env()
        # Obtener TODOS los contenedores (incluyendo detenidos)
        containers = client.containers.list(all=True)
        
        container_info = []
        for container in containers:
            port = extract_port_mapping(container)
            
            # Obtener labels para detectar grupos/aplicaciones
            labels = container.labels
            app_group = labels.get('kunna.app', labels.get('com.docker.compose.project', 'uncategorized'))
            
            # Obtener networks para detectar conexiones
            networks = list(container.attrs['NetworkSettings']['Networks'].keys())
            
            info = {
                'id': container.short_id,
                'name': container.name,
                'image': container.image.tags[0] if container.image.tags else 'unknown',
                'status': container.status,  # running, exited, paused, etc
                'state': container.attrs['State']['Status'],
                'port': port,
                'app_group': app_group,
                'networks': networks,
                'health': container.attrs['State'].get('Health', {}).get('Status', 'none'),
            }
            
            # Agregar siempre: aunque no tenga puerto/labels, necesitamos trackear
            # el estado (running/exited) para habilitar start/stop desde el dashboard.
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
        log("No se encontraron contenedores")
        return
    
    log(f"Encontrados {len(containers)} contenedores")
    
    # Obtener servicios ya registrados
    existing_services = get_existing_services()
    
    # Registrar o actualizar contenedores
    for container in containers:
        name = container['name']
        
        # Verificar si ya está registrado
        if name in existing_services:
            existing = existing_services[name]

            updates = {}

            # Mantener status/isActive sincronizados
            if existing.get('status') != container['status']:
                updates['status'] = container['status']
                updates['isActive'] = container['status'] == 'running'

            # Asegurar container_id (clave para habilitar start/stop en UI)
            if not existing.get('container_id') and container.get('id'):
                updates['container_id'] = container['id']

            # Completar metadatos si faltan
            if (not existing.get('app_group')) and container.get('app_group'):
                updates['app_group'] = container['app_group']
            if (not existing.get('networks')) and container.get('networks'):
                updates['networks'] = container['networks']

            # Completar URL si es desconocida y hay puerto
            if (not existing.get('url') or existing.get('url') == '#') and container.get('port'):
                updates['url'] = f"http://localhost:{container['port']}"

            if updates:
                patch_service(existing['id'], updates)

            if DEBUG:
                log(f"⏭️ {name} ya está registrado (estado: {container['status']})", "DEBUG")
            continue
        
        # Solo registrar contenedores corriendo
        if container['status'] != 'running':
            continue
            
        # Preparar datos del servicio
        category = get_container_category(name)
        icon = get_container_icon(name)
        color = get_container_color(category)
        
        service_data = {
            'name': name,
            'description': f"Contenedor Docker: {container['image']}",
            'url': f"http://localhost:{container['port']}" if container['port'] else '#',
            'icon': icon,
            'category': category,
            'color': color,
            'isActive': True,
            'status': container['status'],
            'container_id': container['id'],
            'app_group': container['app_group'],
            'networks': container['networks'],
        }
        
        # Registrar en kuNNA
        register_service(service_data)

    # Detectar servicios locales que ya no existen en Docker
    container_names = {c['name'] for c in containers}
    for name, existing in existing_services.items():
        # Solo procesar servicios locales (no remotos) que tengan container_id
        # Si no está en la lista de contenedores actuales, es que fue eliminado (docker rm)
        if not existing.get('is_remote') and existing.get('container_id'):
            if name not in container_names:
                log(f"🗑️ El contenedor {name} ya no existe en el host local. Eliminando servicio de kuNNA.")
                delete_service_api(existing['id'])

def update_service_status(service_id, status):
    """Actualiza el estado de un servicio"""
    try:
        is_active = status == 'running'
        response = requests.patch(
            f"{KUNNA_API}/{service_id}",
            json={"isActive": is_active, "status": status},
            timeout=5
        )
        if response.status_code == 200:
            log(f"🔄 Actualizado estado de servicio {service_id}: {status}")
    except Exception as e:
        log(f"Error actualizando estado: {e}", "ERROR")

def patch_service(service_id, updates):
    """Actualiza parcialmente un servicio en kuNNA (PATCH)"""
    try:
        response = requests.patch(
            f"{KUNNA_API}/{service_id}",
            json=updates,
            timeout=5,
        )
        if response.status_code == 200:
            if DEBUG:
                log(f"🧩 Patch service {service_id}: {', '.join(updates.keys())}", "DEBUG")
            return True
        log(f"⚠️ No se pudo actualizar servicio {service_id}: {response.text}", "WARNING")
        return False
    except Exception as e:
        log(f"Error actualizando servicio {service_id}: {e}", "ERROR")
        return False

def delete_service_api(service_id):
    """Elimina un servicio de kuNNA (DELETE)"""
    try:
        response = requests.delete(
            f"{KUNNA_API}/{service_id}",
            timeout=5,
        )
        if response.status_code == 200:
            log(f"🗑️ Servicio {service_id} eliminado de kuNNA")
            return True
        log(f"⚠️ No se pudo eliminar servicio {service_id}: {response.text}", "WARNING")
        return False
    except Exception as e:
        log(f"Error eliminando servicio {service_id}: {e}", "ERROR")
        return False

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
