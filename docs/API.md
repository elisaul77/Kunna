# kuNNA API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication
Currently, no authentication is required. For production use, implement JWT or OAuth2.

## Endpoints

### Health Check

#### `GET /api/health`
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-14T16:30:00.000000"
}
```

---

### Services

#### `GET /api/services`
Get all services with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category name
- `active` (optional): Filter by active status (true/false)

**Response:**
```json
[
  {
    "id": "1",
    "name": "MLflow",
    "description": "Plataforma de Machine Learning para tracking de experimentos",
    "url": "http://localhost:5000",
    "icon": "🤖",
    "category": "ML & AI",
    "color": "#0194e2",
    "isActive": true,
    "createdAt": "2024-12-14T16:00:00.000000"
  }
]
```

**Examples:**
```bash
# Get all services
curl http://localhost:8000/api/services

# Get only ML & AI services
curl "http://localhost:8000/api/services?category=ML%20%26%20AI"

# Get only active services
curl "http://localhost:8000/api/services?active=true"
```

---

#### `GET /api/services/{service_id}`
Get a specific service by ID.

**Path Parameters:**
- `service_id`: Service ID

**Response:**
```json
{
  "id": "1",
  "name": "MLflow",
  "description": "Plataforma de Machine Learning",
  "url": "http://localhost:5000",
  "icon": "🤖",
  "category": "ML & AI",
  "color": "#0194e2",
  "isActive": true,
  "createdAt": "2024-12-14T16:00:00.000000"
}
```

**Error Response (404):**
```json
{
  "detail": "Servicio no encontrado"
}
```

---

#### `POST /api/services`
Create a new service.

**Request Body:**
```json
{
  "name": "PostgreSQL",
  "description": "Base de datos relacional",
  "url": "http://localhost:5432",
  "icon": "🐘",
  "category": "Databases",
  "color": "#336791",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "3",
  "name": "PostgreSQL",
  "description": "Base de datos relacional",
  "url": "http://localhost:5432",
  "icon": "🐘",
  "category": "Databases",
  "color": "#336791",
  "isActive": true,
  "createdAt": "2024-12-14T16:30:00.000000"
}
```

**Example:**
```bash
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

---

#### `PUT /api/services/{service_id}`
Update an existing service.

**Path Parameters:**
- `service_id`: Service ID to update

**Request Body:**
```json
{
  "name": "PostgreSQL Updated",
  "description": "Base de datos relacional actualizada",
  "url": "http://localhost:5433",
  "icon": "🐘",
  "category": "Databases",
  "color": "#336791",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "3",
  "name": "PostgreSQL Updated",
  "description": "Base de datos relacional actualizada",
  "url": "http://localhost:5433",
  "icon": "🐘",
  "category": "Databases",
  "color": "#336791",
  "isActive": true,
  "createdAt": "2024-12-14T16:30:00.000000"
}
```

---

#### `DELETE /api/services/{service_id}`
Delete a service.

**Path Parameters:**
- `service_id`: Service ID to delete

**Response:**
```json
{
  "message": "Servicio eliminado correctamente"
}
```

---

#### `GET /api/categories`
Get all available categories.

**Response:**
```json
{
  "categories": [
    "Dashboard",
    "Databases",
    "ML & AI",
    "Monitoring"
  ]
}
```

---

## Data Models

### Service
```typescript
{
  id?: string;              // Auto-generated
  name: string;             // Required
  description: string;      // Required
  url: string;              // Required (valid URL)
  icon?: string;            // Optional (default: "🔗")
  category: string;         // Required (default: "general")
  color?: string;           // Optional (hex color, default: "#3b82f6")
  isActive: boolean;        // Optional (default: true)
  createdAt?: string;       // Auto-generated (ISO 8601)
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 404  | Resource not found |
| 422  | Validation error |
| 500  | Internal server error |

---

## Interactive Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Examples with Different Tools

### cURL
```bash
# Create service
curl -X POST http://localhost:8000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Redis","description":"Cache","url":"http://localhost:6379","icon":"🔴","category":"Databases","color":"#DC382D"}'
```

### Python (requests)
```python
import requests

# Get all services
response = requests.get('http://localhost:8000/api/services')
services = response.json()

# Create service
new_service = {
    "name": "Redis",
    "description": "In-memory database",
    "url": "http://localhost:6379",
    "icon": "🔴",
    "category": "Databases",
    "color": "#DC382D"
}
response = requests.post('http://localhost:8000/api/services', json=new_service)
```

### JavaScript (fetch)
```javascript
// Get all services
fetch('http://localhost:8000/api/services')
  .then(res => res.json())
  .then(data => console.log(data));

// Create service
const newService = {
  name: "Redis",
  description: "In-memory database",
  url: "http://localhost:6379",
  icon: "🔴",
  category: "Databases",
  color: "#DC382D"
};

fetch('http://localhost:8000/api/services', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newService)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## Rate Limiting
Currently not implemented. Consider adding rate limiting for production use.

---

## CORS Configuration
CORS is enabled for all origins by default. Modify in `backend/app.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Restrict to specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
