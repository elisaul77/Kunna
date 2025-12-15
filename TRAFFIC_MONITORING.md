# Traffic Monitoring - Monitoreo de Tráfico entre Servicios

Este documento explica cómo instrumentar tus aplicaciones para que reporten tráfico al SCADA de kuNNA.

## 🎯 Endpoint de Reporte

```
POST http://kunna-backend:8000/api/traffic
Content-Type: application/json

{
  "from_service": "nombre-servicio-origen",
  "to_service": "nombre-servicio-destino",
  "method": "GET",           // Opcional, default: "HTTP"
  "path": "/api/users",      // Opcional
  "status": 200,             // Opcional
  "duration": 45.2,          // Opcional (en milisegundos)
  "timestamp": "2025-12-14T10:30:00"  // Opcional (se genera automático)
}
```

---

## 📋 Opción 1: Instrumentación Manual (Recomendado)

### Python (FastAPI/Flask)

```python
import requests
import time

KUNNA_BACKEND = "http://kunna-backend:8000"
SERVICE_NAME = "mi-api"

def report_traffic(to_service, method, path, status, duration_ms):
    """Reporta tráfico al SCADA de kuNNA"""
    try:
        requests.post(f"{KUNNA_BACKEND}/api/traffic", json={
            "from_service": SERVICE_NAME,
            "to_service": to_service,
            "method": method,
            "path": path,
            "status": status,
            "duration": duration_ms
        }, timeout=1)
    except:
        pass  # No bloquear si kuNNA no está disponible

# Ejemplo en FastAPI
from fastapi import FastAPI

app = FastAPI()

@app.middleware("http")
async def track_traffic(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    
    # Reportar a kuNNA
    report_traffic(
        to_service=SERVICE_NAME,
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration=duration
    )
    
    return response

# Ejemplo para llamadas salientes
@app.get("/call-other-service")
async def call_other():
    start = time.time()
    
    # Llamar a otro servicio
    response = requests.get("http://otro-servicio:8080/api/data")
    
    duration = (time.time() - start) * 1000
    
    # Reportar la interacción
    report_traffic(
        to_service="otro-servicio",
        method="GET",
        path="/api/data",
        status=response.status_code,
        duration=duration
    )
    
    return response.json()
```

### Node.js (Express)

```javascript
const axios = require('axios');

const KUNNA_BACKEND = 'http://kunna-backend:8000';
const SERVICE_NAME = 'mi-nodejs-app';

async function reportTraffic(toService, method, path, status, duration) {
  try {
    await axios.post(`${KUNNA_BACKEND}/api/traffic`, {
      from_service: SERVICE_NAME,
      to_service: toService,
      method,
      path,
      status,
      duration
    }, { timeout: 1000 });
  } catch (error) {
    // Ignorar errores para no bloquear
  }
}

// Middleware para Express
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    reportTraffic(
      SERVICE_NAME,
      req.method,
      req.path,
      res.statusCode,
      duration
    );
  });
  
  next();
});

// Para llamadas salientes
app.get('/call-other-service', async (req, res) => {
  const start = Date.now();
  
  try {
    const response = await axios.get('http://otro-servicio:3000/api/data');
    const duration = Date.now() - start;
    
    // Reportar
    await reportTraffic('otro-servicio', 'GET', '/api/data', 200, duration);
    
    res.json(response.data);
  } catch (error) {
    const duration = Date.now() - start;
    await reportTraffic('otro-servicio', 'GET', '/api/data', 500, duration);
    res.status(500).json({ error: 'Error' });
  }
});
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
)

const (
    kunnaBackend = "http://kunna-backend:8000"
    serviceName  = "mi-go-service"
)

type TrafficEvent struct {
    FromService string  `json:"from_service"`
    ToService   string  `json:"to_service"`
    Method      string  `json:"method"`
    Path        string  `json:"path"`
    Status      int     `json:"status"`
    Duration    float64 `json:"duration"`
}

func reportTraffic(toService, method, path string, status int, duration time.Duration) {
    event := TrafficEvent{
        FromService: serviceName,
        ToService:   toService,
        Method:      method,
        Path:        path,
        Status:      status,
        Duration:    float64(duration.Milliseconds()),
    }
    
    data, _ := json.Marshal(event)
    http.Post(kunnaBackend+"/api/traffic", "application/json", bytes.NewBuffer(data))
}

// Middleware
func trackingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Wrapper para capturar status code
        wrapped := &statusWriter{ResponseWriter: w, statusCode: 200}
        
        next.ServeHTTP(wrapped, r)
        
        duration := time.Since(start)
        
        go reportTraffic(serviceName, r.Method, r.URL.Path, wrapped.statusCode, duration)
    })
}

type statusWriter struct {
    http.ResponseWriter
    statusCode int
}

func (w *statusWriter) WriteHeader(code int) {
    w.statusCode = code
    w.ResponseWriter.WriteHeader(code)
}
```

---

## 📋 Opción 2: Cliente Python Simplificado

Crea un archivo `kunna_tracer.py` en tu proyecto:

```python
import requests
import time
from functools import wraps
from typing import Optional

class KunnaTracer:
    def __init__(self, service_name: str, kunna_url: str = "http://kunna-backend:8000"):
        self.service_name = service_name
        self.kunna_url = kunna_url
    
    def report(self, to_service: str, method: str = "HTTP", path: str = "/", 
               status: int = 200, duration: Optional[float] = None):
        """Reporta tráfico a kuNNA"""
        try:
            requests.post(f"{self.kunna_url}/api/traffic", json={
                "from_service": self.service_name,
                "to_service": to_service,
                "method": method,
                "path": path,
                "status": status,
                "duration": duration
            }, timeout=1)
        except:
            pass
    
    def trace_call(self, to_service: str):
        """Decorador para tracear llamadas a otros servicios"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = (time.time() - start) * 1000
                    self.report(to_service, "CALL", func.__name__, 200, duration)
                    return result
                except Exception as e:
                    duration = (time.time() - start) * 1000
                    self.report(to_service, "CALL", func.__name__, 500, duration)
                    raise
            return wrapper
        return decorator

# Uso
tracer = KunnaTracer("mi-servicio")

@tracer.trace_call("base-de-datos")
def consultar_usuarios():
    # Tu código aquí
    return db.query("SELECT * FROM users")

@tracer.trace_call("api-externa")
def llamar_api_externa():
    return requests.get("http://api-externa:8080/data")
```

---

## 📋 Opción 3: Sidecar con Nginx (Sin modificar código)

Si no quieres modificar tu aplicación, puedes usar un proxy nginx como sidecar:

```yaml
# docker-compose.yml
services:
  mi-app:
    image: mi-app:latest
    networks:
      - app-network
  
  mi-app-proxy:
    image: nginx:alpine
    volumes:
      - ./nginx-tracer.conf:/etc/nginx/nginx.conf:ro
      - ./report-traffic.sh:/usr/local/bin/report-traffic.sh:ro
    networks:
      - app-network
    ports:
      - "8080:80"
```

```nginx
# nginx-tracer.conf
events {}

http {
    log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"request":"$request",'
        '"status": "$status",'
        '"request_time":"$request_time",'
        '"upstream_response_time":"$upstream_response_time"'
    '}';

    access_log /var/log/nginx/access.log json_combined;
    
    server {
        listen 80;
        
        location / {
            proxy_pass http://mi-app:3000;
            
            # Reportar tráfico con log post-action
            log_by_lua_block {
                local cjson = require "cjson"
                local http = require "resty.http"
                
                local httpc = http.new()
                httpc:request_uri("http://kunna-backend:8000/api/traffic", {
                    method = "POST",
                    body = cjson.encode({
                        from_service = "external",
                        to_service = "mi-app",
                        method = ngx.var.request_method,
                        path = ngx.var.uri,
                        status = tonumber(ngx.var.status),
                        duration = tonumber(ngx.var.request_time) * 1000
                    }),
                    headers = {
                        ["Content-Type"] = "application/json",
                    }
                })
            }
        }
    }
}
```

---

## 🧪 Testing

Prueba que funciona:

```bash
# Desde cualquier contenedor en la red de Docker
curl -X POST http://kunna-backend:8000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "from_service": "test-service",
    "to_service": "database",
    "method": "SELECT",
    "path": "/users",
    "status": 200,
    "duration": 25.5
  }'
```

Luego abre el SCADA en http://localhost:3000/scada.html y verás la animación de tráfico en tiempo real.

---

## 📊 Visualización en SCADA

El SCADA automáticamente:
- 🟢 **Verde**: Status 2xx (success)
- 🟡 **Amarillo**: Status 4xx (client error)
- 🔴 **Rojo**: Status 5xx (server error)
- 🔵 **Azul**: Otros métodos (default)

La velocidad de la animación depende del `duration` reportado.

---

## 🔧 Configuración en Docker Compose

Asegúrate de que tus servicios estén en la misma red:

```yaml
networks:
  kunna-network:
    external: true

services:
  mi-app:
    networks:
      - kunna-network
    environment:
      - KUNNA_BACKEND=http://kunna-backend:8000
```

---

## 💡 Tips

1. **Performance**: El endpoint `/api/traffic` es fire-and-forget. No bloquea tu aplicación.
2. **Timeout**: Usa timeout cortos (1s) para evitar retrasos si kuNNA no está disponible
3. **Nombres**: Usa nombres consistentes con los del `docker-compose.yml` para que el SCADA encuentre las conexiones
4. **Redes**: Asegúrate de que servicios que se comunican compartan redes Docker para que el SCADA detecte las conexiones
