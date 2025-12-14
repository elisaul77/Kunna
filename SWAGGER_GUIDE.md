# 🎨 Guía de Personalización de Swagger UI en kuNNA

## 1. Cambiar información básica

Edita `/home/elisaul77/Documentos/Docker/kunna/backend/app.py`:

```python
app = FastAPI(
    title="Mi API Personalizada",
    description="Una descripción más detallada de mi API",
    version="2.0.0",
    terms_of_service="http://example.com/terms/",
    contact={
        "name": "Tu Nombre",
        "url": "http://tu-sitio.com",
        "email": "tu@email.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)
```

## 2. Agregar descripciones a endpoints

```python
@app.get(
    "/api/services",
    response_model=List[Service],
    summary="Lista todos los servicios",
    description="""
    Obtiene una lista de todos los servicios registrados.
    
    Puedes filtrar por:
    - **category**: Filtra por categoría específica
    - **active**: Muestra solo servicios activos (true/false)
    """,
    response_description="Lista de servicios",
    tags=["Servicios"]  # Agrupa endpoints en secciones
)
def get_services(category: Optional[str] = None, active: Optional[bool] = None):
    # tu código aquí
    pass
```

## 3. Agregar ejemplos a los modelos

```python
from pydantic import BaseModel, Field

class Service(BaseModel):
    id: Optional[str] = Field(None, description="ID único del servicio")
    name: str = Field(..., description="Nombre del servicio", example="PostgreSQL")
    description: str = Field(..., description="Descripción breve", example="Base de datos relacional")
    url: str = Field(..., description="URL del servicio", example="http://localhost:5432")
    icon: Optional[str] = Field("🔗", description="Emoji representativo", example="🐘")
    category: str = Field("general", description="Categoría", example="Databases")
    color: Optional[str] = Field("#3b82f6", description="Color en formato hex", example="#336791")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Redis",
                "description": "Base de datos en memoria",
                "url": "http://localhost:6379",
                "icon": "🔴",
                "category": "Databases",
                "color": "#DC382D"
            }
        }
```

## 4. Organizar con tags

```python
@app.get("/api/services", tags=["Servicios"])
def get_services():
    pass

@app.post("/api/services", tags=["Servicios"])
def create_service():
    pass

@app.get("/api/health", tags=["Sistema"])
def health_check():
    pass

@app.get("/api/categories", tags=["Categorías"])
def get_categories():
    pass
```

## 5. Cambiar el tema/colores (Avanzado)

Crear archivo `custom_swagger.py`:

```python
from fastapi.openapi.docs import get_swagger_ui_html

def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="kuNNA API Docs",
        swagger_favicon_url="https://tu-favicon.png",
        swagger_ui_parameters={
            "syntaxHighlight.theme": "monokai",  # Tema oscuro
            "defaultModelsExpandDepth": -1,      # Ocultar modelos por defecto
        }
    )

# En app.py
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return custom_swagger_ui_html()
```

## 6. Agregar autenticación en la documentación

```python
from fastapi.security import HTTPBasic, HTTPBearer

security = HTTPBearer()

@app.get("/api/services", dependencies=[Depends(security)])
def get_services():
    pass
```

## 7. Documentar respuestas de error

```python
@app.get(
    "/api/services/{service_id}",
    responses={
        200: {
            "description": "Servicio encontrado",
            "content": {
                "application/json": {
                    "example": {
                        "id": "1",
                        "name": "MLflow",
                        "url": "http://localhost:5000"
                    }
                }
            }
        },
        404: {
            "description": "Servicio no encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Servicio no encontrado"}
                }
            }
        }
    }
)
def get_service(service_id: str):
    pass
```

## 8. Aplicar cambios

Después de editar `app.py`:

```bash
cd /home/elisaul77/Documentos/Docker/kunna

# Reiniciar el backend para aplicar cambios
docker-compose restart backend

# Ver logs
docker-compose logs -f backend
```

## 9. Desactivar la documentación (Producción)

Si quieres desactivar Swagger UI en producción:

```python
app = FastAPI(
    title="kuNNA API",
    docs_url=None,      # Desactiva /docs
    redoc_url=None,     # Desactiva /redoc
    openapi_url=None    # Desactiva /openapi.json
)
```

O condicionalmente:

```python
import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(
    title="kuNNA API",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if ENVIRONMENT == "development" else None,
)
```

## 10. Ver diferentes formatos de documentación

FastAPI genera múltiples formatos:

```bash
# Swagger UI (interactivo)
http://localhost:8000/docs

# ReDoc (más limpio, mejor para lectura)
http://localhost:8000/redoc

# OpenAPI Schema JSON (para importar en otras herramientas)
http://localhost:8000/openapi.json

# Puedes importar este JSON en:
# - Postman
# - Insomnia
# - API testing tools
# - Code generators
```

## 📚 Recursos adicionales

- [FastAPI Docs](https://fastapi.tiangolo.com/tutorial/metadata/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Tip**: FastAPI actualiza la documentación automáticamente cuando modificas el código, 
gracias al modo `--reload` en el contenedor.
