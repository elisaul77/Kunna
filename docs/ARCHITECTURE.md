# Arquitectura y Funcionamiento de kuNNA 🎯

Este documento describe de manera técnica y visual cómo funciona kuNNA, sus componentes y los flujos de datos principales.

## 🏗️ Arquitectura de Alto Nivel

kuNNA utiliza una arquitectura distribuida basada en microservicios para el monitoreo y gestión de contenedores Docker, tanto locales como remotos.

```mermaid
graph TB
    subgraph "Usuario"
        Browser[Navegador Web]
    end

    subgraph "Servidor Central (kuNNA Host)"
        FE[Frontend - Nginx]
        BE[Backend - FastAPI]
        DB[(services.json)]
        Mon[Docker Monitor]
        Sock1[docker.sock]
    end

    subgraph "Servidor Remoto (Agent Host)"
        Agent[kuNNA Agent]
        Sock2[docker.sock]
        App[Aplicación Instrumentada]
    end

    %% Conexiones Usuario
    Browser -->|HTTP/3000| FE
    Browser -->|REST/WS| BE

    %% Conexiones Internas
    FE -->|Proxy /api| BE
    Mon -->|Escaneo| Sock1
    Mon -->|REST POST/PATCH| BE
    BE <-->|Lectura/Escritura| DB

    %% Conexiones Remotas
    Agent -->|WebSocket/WS| BE
    Agent -->|Escaneo| Sock2
    App -->|Traffic Events| BE
    BE -->|SSH Deploy| Agent
```

---

## 🔍 Descubrimiento de Servicios

kuNNA descubre servicios de dos formas: localmente mediante un monitor dedicado y remotamente mediante agentes.

### 1. Descubrimiento Local (Docker Monitor)

El `docker-monitor` es un servicio independiente que observa el socket de Docker local y sincroniza el estado con el backend.

```mermaid
sequenceDiagram
    participant Docker as Docker Engine
    participant Mon as Docker Monitor
    participant BE as Backend API
    participant DB as services.json

    loop Cada 10 segundos
        Mon->>Docker: Listar contenedores
        Docker-->>Mon: Lista de contenedores
        Mon->>Mon: Procesar etiquetas y puertos
        Mon->>BE: GET /api/services
        BE-->>Mon: Lista actual
        alt Nuevo Contenedor
            Mon->>BE: POST /api/services (Crear)
            BE->>DB: Guardar
        else Cambio de Estado
            Mon->>BE: PATCH /api/services/{id} (Actualizar)
            BE->>DB: Guardar
        end
    end
```

### 2. Descubrimiento Remoto (Agents)

Los agentes se conectan al servidor central mediante WebSockets, manteniendo una conexión persistente para reportar cambios en tiempo real.

```mermaid
sequenceDiagram
    participant Agent as kuNNA Agent
    participant BE as Backend (Agent Manager)
    participant UI as Frontend (Dashboard)

    Agent->>BE: Conexión WebSocket (/ws/agent)
    BE->>BE: Registrar Servidor en Memoria
    
    loop Heartbeat & Updates
        Agent->>BE: Enviar estado de contenedores + Métricas
        BE->>BE: Actualizar AgentManager (In-memory)
        BE-->>UI: Broadcast actualización (vía WS)
    end

    Note over Agent,BE: Si el agente se desconecta, los servicios remotos desaparecen del dashboard
```

---

## 📊 Monitoreo de Tráfico (SCADA)

El sistema SCADA visualiza el tráfico entre servicios en tiempo real.

```mermaid
sequenceDiagram
    participant App as App (con Tracer)
    participant BE as Backend (Traffic API)
    participant UI as Frontend (SCADA View)

    App->>BE: POST /api/traffic (Evento de tráfico)
    BE->>BE: Procesar evento
    BE-->>UI: Enviar vía WebSocket (/ws/traffic)
    UI->>UI: Dibujar línea/animación en el mapa
```

---

## 🚀 Flujo de Despliegue de Agentes (SSH Deployment)

kuNNA permite expandir su red de monitoreo desplegando agentes en servidores nuevos directamente desde la interfaz. Este proceso automatiza la configuración del entorno y la ejecución del agente.

### 🔐 Credenciales y Seguridad
El sistema soporta dos métodos de autenticación para la conexión SSH:
- **Contraseña**: Autenticación tradicional por usuario/password.
- **Llave Privada (RSA/ED25519)**: Método recomendado para mayor seguridad.
- **Sudo**: El sistema detecta automáticamente si el usuario requiere privilegios de `sudo` para interactuar con Docker.

### 🔄 Proceso de Despliegue Paso a Paso

```mermaid
sequenceDiagram
    participant UI as Frontend (Dashboard)
    participant BE as Backend (SSH Deployer)
    participant Remote as Servidor Remoto

    UI->>BE: POST /api/remote/deploy (Host, User, Auth, CentralURL)
    Note over BE: Inicializa cliente Paramiko
    
    BE->>Remote: 1. Conexión SSH
    
    rect rgb(240, 240, 240)
        Note right of BE: Fase de Verificación
        BE->>Remote: ¿Docker está instalado?
        Remote-->>BE: No
        BE->>Remote: 2. Instalar Docker (apt-get install...)
    end

    rect rgb(230, 245, 230)
        Note right of BE: Fase de Transferencia
        BE->>Remote: 3. Crear directorio ~/kunna-agent
        BE->>Remote: 4. Transferir agent.py, Dockerfile, requirements.txt (SFTP)
    end

    rect rgb(230, 230, 255)
        Note right of BE: Fase de Ejecución
        BE->>Remote: 5. Build nativo (docker build -t kunna-agent)
        BE->>Remote: 6. Run (docker run -d --name kunna-agent)
    end

    Remote->>BE: 7. Conexión WebSocket (Agent -> Central)
    BE-->>UI: Respuesta Exitosa (Token generado)
```

### 🛠️ Detalles Técnicos del Despliegue
1.  **Token de Seguridad**: El backend genera un `AGENT_TOKEN` único para cada despliegue, el cual se inyecta como variable de entorno en el contenedor del agente para autenticar la conexión WebSocket.
2.  **Detección de Arquitectura**: El agente se construye nativamente en el servidor remoto (`docker build`), lo que garantiza compatibilidad tanto con **AMD64** como con **ARM64** (ej: Raspberry Pi).
3.  **Aislamiento**: El agente corre dentro de un contenedor Docker, pero tiene acceso al socket del host (`/var/run/docker.sock`) para monitorear otros contenedores.
4.  **Persistencia**: Se configura para reiniciarse automáticamente (`--restart unless-stopped`).

---

## 💾 Modelo de Datos

### Servicio (Service)
Es la entidad principal que representa un enlace o contenedor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | Identificador único |
| `name` | String | Nombre del servicio |
| `url` | String | URL de acceso |
| `status` | String | `running`, `stopped`, `error` |
| `is_remote` | Boolean | Indica si viene de un agente |
| `app_group` | String | Agrupación para la topología |

### Evento de Tráfico (TrafficEvent)
Representa una comunicación entre dos puntos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `from_service` | String | ID del origen |
| `to_service` | String | ID del destino |
| `method` | String | Método (GET, POST, etc) |
| `duration` | Float | Tiempo de respuesta en ms |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript Vanilla, Mermaid.js (para diagramas dinámicos).
- **Backend**: Python 3.9+, FastAPI, Uvicorn.
- **Monitoreo**: Docker SDK para Python, Psutil.
- **Comunicación**: WebSockets (bidireccional), REST API.
- **Persistencia**: JSON File (Simple & Portable).
