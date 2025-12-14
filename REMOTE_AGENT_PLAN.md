# 🌐 Sistema de Agentes Remotos - kuNNA

## 📋 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    kuNNA Central (Host)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Admin Console                                        │   │
│  │  - Gestionar servidores remotos                       │   │
│  │  - Configurar IP, usuario, SSH key                    │   │
│  │  - Deploy automático de agentes                       │   │
│  │  - Ver estado de todos los servidores                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Central API                                          │   │
│  │  - Recibe datos de agentes remotos                    │   │
│  │  - Agrega servicios remotos al SCADA                  │   │
│  │  - Mantiene conexiones WebSocket                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
                        WebSocket / HTTP
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│           Servidor Remoto 1 (192.168.x.100)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  kuNNA Agent (Docker Container)                       │   │
│  │  - Detecta contenedores locales                       │   │
│  │  - Captura métricas                                    │   │
│  │  - Envía datos al central                             │   │
│  │  - Heartbeat cada 10s                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  Docker Containers: postgres, nginx, api, redis...          │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│           Servidor Remoto 2 (192.168.x.101)                 │
│  kuNNA Agent + Docker Containers                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Componentes

### 1. **Admin Console** (Frontend)
- Página para gestionar servidores
- Formulario: IP, Usuario, SSH Key/Password
- Botón "Deploy Agent"
- Lista de servidores conectados
- Estado: Online/Offline/Error

### 2. **Central API** (Backend)
- Endpoints para gestionar servidores
- SSH deployment automático
- WebSocket server para agentes
- Agregación de datos de múltiples fuentes

### 3. **kuNNA Agent** (Cliente instalable)
- Container Docker ligero
- Script de instalación one-line
- Detecta servicios locales
- Envía datos al central
- Auto-reconexión

## 📦 Estructura de Archivos

```
kunna/
├── admin/                      # Admin Console
│   ├── servers.html           # UI de gestión
│   └── deploy.js              # Lógica de deployment
│
├── agent/                      # Agente remoto
│   ├── Dockerfile             # Container del agente
│   ├── agent.py               # Cliente principal
│   ├── install.sh             # Script de instalación
│   └── config.yaml            # Configuración
│
├── backend/
│   ├── app.py                 # API central (extendida)
│   ├── ssh_deployer.py        # Deploy via SSH
│   └── agent_manager.py       # Gestión de agentes
│
└── docker-compose.yml         # Updated
```

## 🔑 Flujo de Deployment

1. **Admin introduce datos del servidor:**
   ```
   IP: 192.168.x.100
   Usuario: ubuntu
   SSH Key: ~/.ssh/id_rsa
   ```

2. **Backend ejecuta deployment:**
   ```bash
   ssh ubuntu@192.168.x.100 'bash -s' < install.sh
   ```

3. **install.sh hace:**
   - Instala Docker (si no existe)
   - Pull de imagen `kunna-agent`
   - Crea container con config
   - Inicia agente

4. **Agente se conecta al central:**
   ```
   WebSocket: ws://central-ip:8000/ws/agent/register
   ```

5. **Central recibe datos:**
   ```json
   {
     "server_id": "srv-001",
     "hostname": "web-server-1",
     "ip": "192.168.x.100",
     "services": [...],
     "metrics": {...}
   }
   ```

## 🔐 Seguridad

- SSH keys para autenticación
- API tokens para agentes
- Encriptación TLS en WebSocket
- Whitelist de IPs permitidas
- Rate limiting

## 📊 Datos que Captura el Agente

```json
{
  "server_info": {
    "id": "srv-001",
    "hostname": "web-server-1",
    "ip": "192.168.x.100",
    "os": "Ubuntu 22.04",
    "docker_version": "24.0.7"
  },
  "containers": [
    {
      "id": "abc123",
      "name": "nginx-prod",
      "image": "nginx:latest",
      "status": "running",
      "ports": ["80:80", "443:443"],
      "networks": ["web-network"],
      "cpu": 2.5,
      "memory": 128000000
    }
  ],
  "metrics": {
    "cpu_percent": 45.2,
    "memory_percent": 67.8,
    "disk_percent": 54.1,
    "uptime": 3600000
  },
  "timestamp": "2025-12-14T19:35:00Z"
}
```

## 🎨 Admin Console UI

```
┌─────────────────────────────────────────────────────┐
│  🌐 Servidores Remotos                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [+ Agregar Servidor]                               │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🟢 web-server-1      192.168.x.100    Online  │ │
│  │    5 contenedores    CPU: 45%   RAM: 68%      │ │
│  │    [Ver] [Config] [Desconectar]               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🟢 db-server        192.168.x.101    Online   │ │
│  │    3 contenedores    CPU: 22%   RAM: 81%      │ │
│  │    [Ver] [Config] [Desconectar]               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔴 cache-server     192.168.x.102    Offline  │ │
│  │    Última conexión: hace 5 min                 │ │
│  │    [Reconectar] [Config] [Eliminar]           │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 🚀 One-line Install

En el servidor remoto:
```bash
curl -sSL https://kunna.local/install.sh | bash -s -- \
  --central=192.168.x.1:8000 \
  --token=eyJhbGc...
```

## 🔄 API Endpoints Nuevos

```
POST   /api/servers              # Agregar servidor
GET    /api/servers              # Listar servidores
GET    /api/servers/{id}         # Info de servidor
DELETE /api/servers/{id}         # Eliminar servidor
POST   /api/servers/{id}/deploy  # Deploy agent
GET    /api/servers/{id}/status  # Estado actual

WS     /ws/agent/register        # Registro de agente
WS     /ws/agent/data            # Stream de datos
```

## 📝 Próximos Pasos

1. ✅ Crear estructura de directorios
2. ✅ Implementar Admin Console UI
3. ✅ Desarrollar kuNNA Agent
4. ✅ SSH Deployer en backend
5. ✅ WebSocket para agentes
6. ✅ Integrar con SCADA
7. ✅ Testing y documentación

---

**¿Listo para empezar? Vamos paso a paso!** 🚀
