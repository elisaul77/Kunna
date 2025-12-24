# Scripts de kuNNA

Esta carpeta contiene todos los scripts, herramientas y ejemplos del proyecto kuNNA organizados por categoría.

## 📁 Estructura

```
scripts/
├── README.md                    # Este archivo
├── utilities/                   # Scripts de utilidad y automatización
├── tests/                       # Scripts de pruebas y testing
├── examples/                    # Ejemplos de uso y demos
└── tools/                       # Herramientas y librerías
```

## 🛠️ Utilities (Utilidades)

### [add-service.sh](utilities/add-service.sh)
Script interactivo para agregar servicios a kuNNA mediante la API.

**Uso:**
```bash
./scripts/utilities/add-service.sh
```

**Funcionalidad:**
- Solicita datos del servicio de forma interactiva
- Valida la URL ingresada
- Crea el servicio usando la API REST
- Muestra confirmación con formato JSON

## 🧪 Tests (Pruebas)

### [test_traffic.py](tests/test_traffic.py)
Script para probar el sistema de monitoreo de tráfico del SCADA.

**Uso:**
```bash
python scripts/tests/test_traffic.py
```

**Funcionalidad:**
- Simula tráfico entre servicios
- Reporta eventos al sistema de monitoreo
- Verifica la visualización en el SCADA
- Incluye pruebas unitarias y workflows completos

## 📚 Examples (Ejemplos)

### [example.py](examples/example.py)
Cliente Python completo para interactuar con la API de kuNNA.

**Uso:**
```python
from scripts.examples.example import KunnaClient

client = KunnaClient()
services = client.get_services()
```

**Funcionalidades:**
- Cliente completo de la API
- Operaciones CRUD de servicios
- Manejo de errores
- Ejemplos de uso

### [example_traced_app.py](examples/example_traced_app.py)
Ejemplo completo de una aplicación FastAPI instrumentada con kuNNA Tracer.

**Uso:**
```bash
python scripts/examples/example_traced_app.py
```

**Funcionalidades:**
- Aplicación FastAPI de ejemplo
- Instrumentación automática con middleware
- Reportes de tráfico al SCADA
- Múltiples métodos de integración

## 🔧 Tools (Herramientas)

### [kunna_tracer.py](tools/kunna_tracer.py)
Librería Python para instrumentar aplicaciones y reportar tráfico al SCADA de kuNNA.

**Uso:**
```python
from scripts.tools.kunna_tracer import tracer

# Reportar manualmente
tracer.report("database", method="SELECT", status=200, duration=25.5)

# Decorador automático
@tracer.trace("api-externa")
def llamar_api():
    return requests.get("http://api/data")

# Middleware FastAPI
from scripts.tools.kunna_tracer import fastapi_middleware
app.add_middleware(fastapi_middleware)
```

**Funcionalidades:**
- Tracer manual con decoradores
- Middleware para FastAPI
- Hooks para Flask
- Cliente HTTP instrumentado
- Configuración flexible

## 🚀 Cómo usar los scripts

### Permisos de ejecución
```bash
# Dar permisos a scripts bash
chmod +x scripts/utilities/*.sh

# Ejecutar scripts Python
python scripts/examples/example.py
python scripts/tests/test_traffic.py
```

### Requisitos
- Python 3.8+
- requests library: `pip install requests`
- fastapi (para ejemplos): `pip install fastapi uvicorn`
- kuNNA backend ejecutándose en `http://localhost:8000`

### Variables de entorno
Algunos scripts respetan estas variables de entorno:

```bash
export KUNNA_BACKEND="http://localhost:8000"  # URL del backend
export KUNNA_SERVICE_NAME="mi-servicio"      # Nombre del servicio
```

## 🔗 Integración con el proyecto

- Los scripts en `/utilities/` pueden usarse en CI/CD
- Los ejemplos en `/examples/` sirven como documentación ejecutable  
- Las herramientas en `/tools/` se pueden importar en otros proyectos
- Los tests en `/tests/` validan funcionalidad específica

---

Para más información sobre kuNNA, consulta el [README principal](../README.md) y la [documentación](../docs/).