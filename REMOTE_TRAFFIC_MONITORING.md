# Monitoreo de Tráfico para Servidores Remotos

Este documento explica cómo instrumentar aplicaciones en servidores remotos para reportar tráfico al SCADA de kuNNA.

## 🏗️ Arquitectura

```
App remota → POST http://localhost:9000/traffic → Agente → WebSocket → Backend → SCADA
```

**Ventajas:**
- ✅ Apps solo necesitan conectar al agente local (no atraviesan firewall/VPN)
- ✅ Funciona en redes aisladas
- ✅ El agente bufferea eventos si pierde conexión con el backend
- ✅ Reduce carga en el backend central

---

## 📡 Endpoint Local del Agente

En cada servidor remoto con kuNNA Agent, hay un endpoint HTTP disponible:

```
POST http://localhost:9000/traffic
Content-Type: application/json

{
  "from_service": "mi-app",
  "to_service": "postgres",
  "method": "SELECT",       // Opcional, default: "HTTP"
  "path": "/users",         // Opcional
  "status": 200,            // Opcional
  "duration": 45.2          // Opcional (ms)
}
```

**Respuesta:**
```json
{
  "status": "ok",
  "message": "Evento de tráfico recibido",
  "buffered": 3
}
```

---

## 🐍 Python (FastAPI/Flask)

### Cliente Simplificado

```python
import requests
import time
from functools import wraps

# Configuración
AGENT_URL = "http://localhost:9000"
SERVICE_NAME = "mi-api"

def report_traffic(to_service, method="HTTP", path="/", status=200, duration=None):
    """Reporta tráfico al agente local"""
    try:
        requests.post(f"{AGENT_URL}/traffic", json={
            "from_service": SERVICE_NAME,
            "to_service": to_service,
            "method": method,
            "path": path,
            "status": status,
            "duration": duration
        }, timeout=1)
    except:
        pass  # No bloquear si el agente no está disponible

# Decorador para tracear funciones
def trace(to_service, method="CALL", path=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = (time.time() - start) * 1000
                report_traffic(to_service, method, path or func.__name__, 200, duration)
                return result
            except Exception as e:
                duration = (time.time() - start) * 1000
                report_traffic(to_service, method, path or func.__name__, 500, duration)
                raise
        return wrapper
    return decorator

# Uso
@trace("postgres", "SELECT", "/users")
def get_users():
    # Tu código aquí
    return db.query("SELECT * FROM users")

@trace("redis", "GET", "/cache")
def get_from_cache(key):
    return redis_client.get(key)
```

### Middleware FastAPI

```python
from fastapi import FastAPI
import time

app = FastAPI()

@app.middleware("http")
async def track_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    
    # Reportar al agente local
    report_traffic(
        to_service=SERVICE_NAME,
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration=duration
    )
    
    return response
```

---

## 🟢 Node.js (Express)

```javascript
const axios = require('axios');

const AGENT_URL = 'http://localhost:9000';
const SERVICE_NAME = 'mi-nodejs-app';

async function reportTraffic(toService, method, path, status, duration) {
  try {
    await axios.post(`${AGENT_URL}/traffic`, {
      from_service: SERVICE_NAME,
      to_service: toService,
      method,
      path,
      status,
      duration
    }, { timeout: 1000 });
  } catch (error) {
    // Ignorar errores
  }
}

// Middleware Express
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    reportTraffic(SERVICE_NAME, req.method, req.path, res.statusCode, duration);
  });
  
  next();
});

// Para llamadas a otros servicios
app.get('/call-db', async (req, res) => {
  const start = Date.now();
  
  try {
    const result = await db.query('SELECT * FROM users');
    const duration = Date.now() - start;
    
    await reportTraffic('postgres', 'SELECT', '/users', 200, duration);
    
    res.json(result);
  } catch (error) {
    const duration = Date.now() - start;
    await reportTraffic('postgres', 'SELECT', '/users', 500, duration);
    res.status(500).json({ error: 'Error' });
  }
});
```

---

## 🦀 Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
)

const (
    agentURL    = "http://localhost:9000"
    serviceName = "mi-go-service"
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
    http.Post(agentURL+"/traffic", "application/json", bytes.NewBuffer(data))
}

// Middleware
func trackingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &statusWriter{ResponseWriter: w, statusCode: 200}
        
        next.ServeHTTP(wrapped, r)
        
        go reportTraffic(serviceName, r.Method, r.URL.Path, wrapped.statusCode, time.Since(start))
    })
}
```

---

## 🐳 Docker Compose

Asegúrate de que tus apps puedan alcanzar al agente:

```yaml
version: '3.8'

services:
  kunna-agent:
    image: kunna/agent:latest
    container_name: kunna-agent
    ports:
      - "9000:9000"  # API de tráfico
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - KUNNA_CENTRAL_URL=ws://IP_CENTRAL:8000
      - KUNNA_AGENT_TOKEN=tu-token
      - KUNNA_SERVER_ID=mi-servidor
      - KUNNA_TRAFFIC_PORT=9000
    networks:
      - app-network

  mi-app:
    image: mi-app:latest
    environment:
      - KUNNA_AGENT=http://kunna-agent:9000
      - SERVICE_NAME=mi-app
    networks:
      - app-network
    depends_on:
      - kunna-agent

networks:
  app-network:
    driver: bridge
```

---

## 🧪 Testing

### Test Manual

```bash
# Desde cualquier contenedor en la red
curl -X POST http://localhost:9000/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "from_service": "test-app",
    "to_service": "database",
    "method": "SELECT",
    "path": "/users",
    "status": 200,
    "duration": 25.5
  }'
```

### Health Check del Agente

```bash
curl http://localhost:9000/health
# {"status":"healthy"}
```

### Ver Logs del Agente

```bash
# En el servidor remoto
docker logs -f kunna-agent

# Deberías ver:
# 🌐 API de tráfico escuchando en puerto 9000
# 🚦 Tráfico recibido: test-app → database
# 📡 Enviados 1 eventos de tráfico
```

---

## 📊 Verificación en SCADA

1. Abre http://localhost:3000/scada.html (desde el servidor central)
2. Los servicios remotos aparecerán con badge `🌐 hostname`
3. Las animaciones de tráfico mostrarán las interacciones en tiempo real

**Colores:**
- 🟢 Verde: Status 2xx
- 🟡 Amarillo: Status 4xx
- 🔴 Rojo: Status 5xx

---

## 🔧 Troubleshooting

### El agente no recibe tráfico

```bash
# Verificar que el puerto esté abierto
docker exec kunna-agent netstat -tuln | grep 9000

# Verificar que el agente esté corriendo
docker ps | grep kunna-agent

# Ver logs del agente
docker logs kunna-agent --tail 50
```

### Las apps no pueden conectar al agente

```bash
# Verificar red Docker
docker network inspect <nombre-red>

# Verificar conectividad desde la app
docker exec mi-app curl http://kunna-agent:9000/health
```

### Los eventos no llegan al SCADA

```bash
# Verificar conexión WebSocket del agente al backend
docker logs kunna-agent | grep "Conectado al central"

# Verificar logs del backend
docker logs kunna-backend | grep "traffic_event"
```

---

## 💡 Best Practices

1. **Timeout cortos**: Usa timeout de 1s para no bloquear tu app si el agente cae
2. **Fire and forget**: No esperes respuesta del agente en flujos críticos
3. **Buffer local**: El agente bufferea eventos automáticamente si pierde conexión
4. **Nombres consistentes**: Usa los mismos nombres de servicio que en Docker Compose
5. **Health checks**: Monitorea el agente con `http://localhost:9000/health`

---

## 🚀 Redeploy de Agentes

Para actualizar agentes existentes con soporte de tráfico:

```bash
# Desde el backend central
curl -X POST http://localhost:8000/api/remote/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "host": "IP_DEL_SERVIDOR",
    "port": 22,
    "username": "usuario",
    "auth_method": "password",
    "password": "contraseña",
    "central_url": "ws://IP_CENTRAL:8000"
  }'
```

El nuevo agente automáticamente:
- ✅ Expone puerto 9000 para tráfico
- ✅ Bufferea eventos localmente
- ✅ Los envía al backend central vía WebSocket
- ✅ Se muestra en el SCADA en tiempo real
