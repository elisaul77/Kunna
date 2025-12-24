# Guía de Integración de kuNNA

Esta guía te muestra cómo integrar nuevos servicios en kuNNA automáticamente cuando los crees.

## 🔧 Integración Manual

### Opción 1: Interfaz Web
1. Abre http://localhost:3000
2. Click en "➕ Agregar Servicio"
3. Completa el formulario
4. Guarda

### Opción 2: Script Bash
```bash
cd /home/elisaul77/Documentos/Docker/kunna
./scripts/utilities/add-service.sh
```

### Opción 3: cURL directo
```bash
curl -X POST http://localhost:8000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Servicio",
    "description": "Descripción del servicio",
    "url": "http://localhost:8080",
    "icon": "🚀",
    "category": "Development",
    "color": "#3b82f6"
  }'
```

## 🤖 Integración Automática

### Python
```python
import requests

def register_service_in_kunna(name, description, url, icon, category, color):
    """Registra un servicio en kuNNA"""
    data = {
        "name": name,
        "description": description,
        "url": url,
        "icon": icon,
        "category": category,
        "color": color,
        "isActive": True
    }
    
    response = requests.post(
        "http://localhost:8000/api/services",
        json=data
    )
    
    if response.status_code == 200:
        print(f"✅ Servicio '{name}' registrado en kuNNA")
        return response.json()
    else:
        print(f"❌ Error al registrar servicio: {response.text}")
        return None

# Ejemplo de uso
if __name__ == "__main__":
    register_service_in_kunna(
        name="Mi App Flask",
        description="API REST desarrollada en Flask",
        url="http://localhost:5001",
        icon="🐍",
        category="APIs",
        color="#000000"
    )
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function registerServiceInKunna(serviceData) {
    try {
        const response = await axios.post(
            'http://localhost:8000/api/services',
            {
                name: serviceData.name,
                description: serviceData.description,
                url: serviceData.url,
                icon: serviceData.icon || '🔗',
                category: serviceData.category || 'general',
                color: serviceData.color || '#3b82f6',
                isActive: true
            }
        );
        
        console.log(`✅ Servicio '${serviceData.name}' registrado en kuNNA`);
        return response.data;
    } catch (error) {
        console.error('❌ Error al registrar servicio:', error.message);
        return null;
    }
}

// Ejemplo de uso
registerServiceInKunna({
    name: 'Mi App Express',
    description: 'API REST desarrollada en Express',
    url: 'http://localhost:3001',
    icon: '⚡',
    category: 'APIs',
    color: '#68a063'
});
```

## 🐳 Integración con Docker Compose

Puedes agregar un paso en tu `docker-compose.yml` para registrar automáticamente el servicio:

```yaml
version: '3.8'

services:
  mi-app:
    build: .
    ports:
      - "8080:8080"
    networks:
      - app-network
  
  register-service:
    image: curlimages/curl:latest
    depends_on:
      - mi-app
    networks:
      - app-network
    command: >
      sh -c '
        sleep 5 &&
        curl -X POST http://kunna-backend:8000/api/services \
          -H "Content-Type: application/json" \
          -d "{
            \"name\": \"Mi Aplicación\",
            \"description\": \"Descripción de mi app\",
            \"url\": \"http://localhost:8080\",
            \"icon\": \"🚀\",
            \"category\": \"Applications\",
            \"color\": \"#ff6b6b\"
          }"
      '

networks:
  app-network:
    external:
      name: kunna_kunna-network
```

## 🔄 Actualización Automática

### Script de Monitoreo (Python)
```python
#!/usr/bin/env python3
"""
Script que monitorea servicios Docker y los registra en kuNNA
"""
import docker
import requests
import time

KUNNA_API = "http://localhost:8000/api/services"
client = docker.from_env()

def get_running_containers():
    """Obtiene contenedores en ejecución"""
    return client.containers.list()

def register_container(container):
    """Registra un contenedor en kuNNA"""
    # Extraer información del contenedor
    name = container.name
    ports = container.ports
    
    # Determinar URL del servicio
    if ports:
        first_port = list(ports.keys())[0].split('/')[0]
        url = f"http://localhost:{first_port}"
    else:
        return
    
    # Crear servicio en kuNNA
    data = {
        "name": name,
        "description": f"Contenedor Docker: {name}",
        "url": url,
        "icon": "🐳",
        "category": "Docker Services",
        "color": "#2496ed"
    }
    
    try:
        response = requests.post(KUNNA_API, json=data)
        if response.status_code == 200:
            print(f"✅ Registrado: {name}")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🔍 Monitoreando contenedores Docker...")
    while True:
        containers = get_running_containers()
        for container in containers:
            register_container(container)
        time.sleep(60)  # Verificar cada minuto

if __name__ == "__main__":
    main()
```

## 🎯 Casos de Uso

### 1. Nuevo Servicio de ML
```bash
# Cuando levantas un nuevo servicio de ML
docker-compose up -d jupyter

# Registrarlo automáticamente
curl -X POST http://localhost:8000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jupyter Notebook",
    "description": "Entorno interactivo de Python",
    "url": "http://localhost:8888",
    "icon": "📓",
    "category": "Data Science",
    "color": "#F37726"
  }'
```

### 2. Nueva Base de Datos
```bash
# Postgres
docker run -d -p 5432:5432 --name postgres postgres

# Registrar
curl -X POST http://localhost:8000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL",
    "description": "Base de datos relacional",
    "url": "http://localhost:5432",
    "icon": "🐘",
    "category": "Databases",
    "color": "#336791"
  }'
```

### 3. API personalizada
```python
# En tu código de startup de la API
import requests
from flask import Flask

app = Flask(__name__)

def register_in_kunna():
    requests.post("http://localhost:8000/api/services", json={
        "name": "Mi API",
        "description": "API REST personalizada",
        "url": "http://localhost:5000",
        "icon": "⚡",
        "category": "APIs",
        "color": "#10b981"
    })

@app.route('/')
def home():
    return "API Running"

if __name__ == "__main__":
    register_in_kunna()  # Registrar al iniciar
    app.run(port=5000)
```

## 🔐 Mejores Prácticas

1. **Verificar antes de crear**: Consulta si el servicio ya existe
2. **Usar nombres únicos**: Evita duplicados
3. **Colores consistentes**: Usa paletas de colores por categoría
4. **URLs completas**: Incluye protocolo (http/https)
5. **Categorías descriptivas**: Agrupa servicios similares

## 📊 Monitoreo de Estado

```python
# Script para actualizar el estado de servicios
import requests

def check_service_health(service_id, url):
    """Verifica si un servicio está activo"""
    try:
        response = requests.get(url, timeout=5)
        is_active = response.status_code == 200
    except:
        is_active = False
    
    # Actualizar en kuNNA
    requests.put(
        f"http://localhost:8000/api/services/{service_id}",
        json={"isActive": is_active}
    )
    
    return is_active
```

## 🚀 Automatización Completa

Para automatizar todo el proceso, puedes crear un hook en tu pipeline CI/CD:

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - docker-compose up -d
    - |
      curl -X POST http://kunna.local:8000/api/services \
        -H "Content-Type: application/json" \
        -d "{
          \"name\": \"$CI_PROJECT_NAME\",
          \"description\": \"$CI_COMMIT_MESSAGE\",
          \"url\": \"http://$SERVICE_URL\",
          \"icon\": \"🚀\",
          \"category\": \"Production\",
          \"color\": \"#10b981\"
        }"
```

---

¿Necesitas ayuda? Consulta la documentación completa en `README.md` y `API.md`
