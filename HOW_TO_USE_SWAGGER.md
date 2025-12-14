# 🧪 Guía Rápida de Uso de Swagger UI

## ¿Qué es Swagger UI?

Es la página interactiva de documentación en **http://localhost:8000/docs** que te permite:
- Ver todos los endpoints de tu API
- Probar la API SIN escribir código
- Ver ejemplos de requests y responses
- Validar datos automáticamente

## 🚀 Cómo usar Swagger UI paso a paso

### 1. Acceder a la documentación

```bash
# Abre en tu navegador
http://localhost:8000/docs
```

### 2. Explorar los endpoints

Verás algo como esto:

```
kuNNA API 1.0.0

▼ default
  GET  /              Read Root
  GET  /api/health    Health Check
  GET  /api/services  Get Services
  GET  /api/services/{service_id}  Get Service
  POST /api/services  Create Service
  PUT  /api/services/{service_id}  Update Service
  DELETE /api/services/{service_id}  Delete Service
  GET  /api/categories  Get Categories
```

### 3. Probar un endpoint (GET)

**Ejemplo: Listar todos los servicios**

1. Click en **GET /api/services**
2. Click en "Try it out" (esquina derecha)
3. (Opcional) Completa los parámetros de filtro
4. Click en "Execute"
5. Verás la respuesta abajo:
   - **Request URL**: La URL completa que se usó
   - **Response Body**: Los datos JSON que devolvió
   - **Response Code**: 200 (éxito) o error
   - **Response Headers**: Headers HTTP

**Captura de pantalla conceptual:**
```
┌─────────────────────────────────────────────┐
│ GET /api/services                           │
│                                             │
│ Parameters:                                 │
│ category [string]  □                        │
│ active   [boolean] □                        │
│                                             │
│ [Try it out]  [Execute]                     │
│                                             │
│ Response:                                   │
│ Code: 200                                   │
│ {                                           │
│   "id": "1",                                │
│   "name": "MLflow",                         │
│   ...                                       │
│ }                                           │
└─────────────────────────────────────────────┘
```

### 4. Probar un endpoint (POST)

**Ejemplo: Crear un nuevo servicio**

1. Click en **POST /api/services**
2. Click en "Try it out"
3. Verás un JSON de ejemplo editable:

```json
{
  "name": "string",
  "description": "string",
  "url": "string",
  "icon": "🔗",
  "category": "general",
  "color": "#3b82f6",
  "isActive": true
}
```

4. Edita el JSON con tus datos:

```json
{
  "name": "Grafana",
  "description": "Monitoreo y dashboards",
  "url": "http://localhost:3001",
  "icon": "📈",
  "category": "Monitoring",
  "color": "#F46800",
  "isActive": true
}
```

5. Click en "Execute"
6. Verás la respuesta con el servicio creado (incluyendo el ID asignado)

### 5. Probar un endpoint con parámetros (GET by ID)

**Ejemplo: Obtener un servicio específico**

1. Click en **GET /api/services/{service_id}**
2. Click en "Try it out"
3. Ingresa un ID en el campo **service_id**: `1`
4. Click en "Execute"
5. Verás el servicio con ese ID

### 6. Probar actualización (PUT)

**Ejemplo: Actualizar un servicio**

1. Click en **PUT /api/services/{service_id}**
2. Click en "Try it out"
3. Ingresa el ID del servicio: `1`
4. Modifica el JSON con los nuevos datos
5. Click en "Execute"

### 7. Probar eliminación (DELETE)

**Ejemplo: Eliminar un servicio**

1. Click en **DELETE /api/services/{service_id}**
2. Click en "Try it out"
3. Ingresa el ID: `1`
4. Click en "Execute"
5. Verás mensaje de confirmación

## 🎯 Ventajas de usar Swagger UI

✅ **No necesitas Postman** - Todo está en el navegador  
✅ **Documentación siempre actualizada** - Se genera del código  
✅ **Ver ejemplos reales** - Respuestas de tu API real  
✅ **Validación automática** - Te avisa si faltan campos  
✅ **Copiar como cURL** - Para usar en terminal  

## 🔍 Entender las secciones

### Schemas (Modelos)

Al final de la página verás "Schemas" con modelos como:

```
Service {
  id         string
  name       string (required)
  description string (required)
  url        string (required)
  icon       string
  category   string
  color      string
  isActive   boolean
  createdAt  string
}
```

Esto te muestra qué campos acepta cada modelo.

### Responses

Cada endpoint muestra las posibles respuestas:

- **200**: Éxito
- **404**: No encontrado
- **422**: Error de validación (datos incorrectos)
- **500**: Error del servidor

## 💡 Tips avanzados

### 1. Copiar como cURL

En la respuesta de cualquier request, puedes copiar el comando cURL:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/services' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Grafana",
  "description": "Monitoring",
  "url": "http://localhost:3001",
  "icon": "📈",
  "category": "Monitoring",
  "color": "#F46800"
}'
```

### 2. Probar filtros

En **GET /api/services**:

```
category: ML & AI
active: true
```

Esto filtra solo servicios de ML que estén activos.

### 3. Ver Request URL

Después de ejecutar, verás la URL completa:

```
http://localhost:8000/api/services?category=ML%20%26%20AI&active=true
```

Puedes copiarla y usarla en tu código.

### 4. Validación automática

Si intentas crear un servicio sin campos requeridos:

```json
{
  "name": "Test"
  // Falta description y url
}
```

Swagger UI te mostrará error **422** con detalles de qué falta.

## 🎨 Comparar con ReDoc

También puedes ver la documentación en ReDoc (más limpia):

```bash
http://localhost:8000/redoc
```

**Diferencias:**
- **Swagger UI**: Interactivo, puedes probar
- **ReDoc**: Solo lectura, más elegante para documentación

## 🔗 Exportar documentación

### Obtener el schema OpenAPI

```bash
curl http://localhost:8000/openapi.json > kunna-api.json
```

Luego puedes:
- Importarlo en **Postman**
- Generar clientes en otros lenguajes
- Usarlo en herramientas de testing

## 📝 Ejemplo completo de flujo

1. **Crear servicio** (POST /api/services)
2. **Ver todos** (GET /api/services)
3. **Obtener uno específico** (GET /api/services/3)
4. **Actualizar** (PUT /api/services/3)
5. **Eliminar** (DELETE /api/services/3)

Todo desde el navegador, sin escribir código! 🎉

## 🎓 Recursos

- **Tu API docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **FastAPI Docs**: https://fastapi.tiangolo.com

---

**¡Ya no necesitas Postman para probar tu API!** Todo está integrado en Swagger UI.
