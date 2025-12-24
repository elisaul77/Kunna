# kuNNA 🎯

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa)](https://github.com/sponsors/elisaul77)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue)](https://paypal.me/eflorezp)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00)](https://buymeacoffee.com/elisaul77)

> 🚀 Dashboard & Remote Monitoring System for Docker Containers

kuNNA es un orquestador de servicios Docker con capacidad de monitoreo remoto mediante agentes SSH. Gestiona contenedores locales, en VPN y en la nube desde una interfaz unificada con visualización en tiempo real.

---

## ✨ Características Principales

- 🐳 **Gestión de Flota Docker**: Control centralizado de múltiples servidores
- 🔄 **Tiempo Real**: Monitoreo y actualizaciones en vivo vía WebSocket
- 🤖 **Auto-Discovery**: Detección automática de contenedores Docker
- 🌐 **Multi-Cloud**: Soporte para infraestructura local, VPN y cloud
- 📊 **Visualización SCADA**: Topología interactiva de servicios
- 🔐 **Despliegue SSH**: Deploy automatizado de agentes remotos
- 🛣️ **Ruteo Inteligente**: Soporte nativo para VPN/WireGuard


## 🚀 Inicio Rápido

```bash
cd /home/elisaul77/Documentos/Docker/kunna
docker-compose up -d
```

## 🌐 Acceso

- **Frontend (Dashboard)**: http://localhost:3000
- **Backend (API)**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

## ✨ Características

### 🎨 Frontend
- **Interfaz moderna** con diseño tipo galería
- **Búsqueda en tiempo real** de servicios
- **Filtrado por categorías** dinámico
- **Tarjetas personalizables** con iconos, colores y categorías
- **Responsive** - funciona en desktop y móvil
- **Animaciones suaves** para mejor UX

### 🔧 Backend (API REST)
- **FastAPI** - API moderna y rápida
- **Documentación automática** con Swagger/OpenAPI
- **CRUD completo** para gestión de servicios
- **Persistencia de datos** en JSON
- **Filtros avanzados** por categoría y estado
- **CORS habilitado** para desarrollo

### 📡 Monitoreo Remoto (Agentes)
- **Despliegue SSH automático** desde la interfaz
- **Soporte para VPN/WireGuard** con ruteo persistente
- **Monitoreo en tiempo real** vía WebSockets
- **Compatibilidad Multi-Cloud** (GCP, AWS, On-premise)
- **Detección automática de IPs** locales y de VPN

## 📚 Documentación Detallada

- [Arquitectura y Funcionamiento](docs/ARCHITECTURE.md)
- [Guía de Despliegue Remoto](docs/USER_GUIDE_DEPLOYMENT.md)
- [Detalle Técnico SSH y Red](docs/SSH_DEPLOYMENT_DETAIL.md)
- [Guía de la API (Swagger)](docs/SWAGGER_GUIDE.md)

### Endpoints Principales

#### 1. Listar todos los servicios
```bash
curl http://localhost:8000/api/services
```

#### 2. Obtener un servicio específico
```bash
curl http://localhost:8000/api/services/1
```

#### 3. Crear un nuevo servicio
```bash
curl -X POST http://localhost:8000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL",
    "description": "Base de datos PostgreSQL",
    "url": "http://localhost:5432",
    "icon": "🐘",
    "category": "Databases",
    "color": "#336791"
  }'
```

#### 4. Actualizar un servicio
```bash
curl -X PUT http://localhost:8000/api/services/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL Updated",
    "description": "Base de datos PostgreSQL actualizada",
    "url": "http://localhost:5432",
    "icon": "🐘",
    "category": "Databases",
    "color": "#336791",
    "isActive": true
  }'
```

#### 5. Eliminar un servicio
```bash
curl -X DELETE http://localhost:8000/api/services/1
```

#### 6. Filtrar por categoría
```bash
curl http://localhost:8000/api/services?category=ML%20%26%20AI
```

#### 7. Obtener categorías disponibles
```bash
curl http://localhost:8000/api/categories
```

## 🎨 Personalización

### Agregar un Servicio desde la UI

1. Click en "➕ Agregar Servicio"
2. Completa el formulario:
   - **Nombre**: Nombre del servicio
   - **Descripción**: Breve descripción
   - **URL**: URL completa con protocolo (http/https)
   - **Icono**: Emoji que representa el servicio
   - **Categoría**: Categoría del servicio
   - **Color**: Color de acento (hex)
3. Click en "Guardar"

### Ejemplos de Servicios

```json
{
  "name": "Jupyter Lab",
  "description": "Entorno de desarrollo para Data Science",
  "url": "http://localhost:8888",
  "icon": "📊",
  "category": "Data Science",
  "color": "#F37626"
}
```

```json
{
  "name": "Grafana",
  "description": "Monitoreo y visualización de métricas",
  "url": "http://localhost:3001",
  "icon": "📈",
  "category": "Monitoring",
  "color": "#F46800"
}
```

```json
{
  "name": "Redis",
  "description": "Base de datos en memoria",
  "url": "http://localhost:6379",
  "icon": "🔴",
  "category": "Databases",
  "color": "#DC382D"
}
```

## 🔧 Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### Reiniciar servicios
```bash
# Reiniciar todo
docker-compose restart

# Reiniciar solo backend
docker-compose restart backend
```

### Detener servicios
```bash
docker-compose down
```

### Reconstruir imágenes
```bash
docker-compose up -d --build
```

## 📂 Estructura del Proyecto

```
kunna/
├── backend/
│   ├── app.py              # API FastAPI
│   ├── requirements.txt    # Dependencias Python
│   └── Dockerfile
├── frontend/
│   ├── index.html          # Dashboard UI
│   ├── nginx.conf          # Configuración Nginx
│   └── Dockerfile
├── scripts/                # Scripts y herramientas
│   ├── utilities/          # Scripts de utilidad
│   ├── tests/             # Scripts de pruebas
│   ├── examples/          # Ejemplos de uso
│   └── tools/             # Librerías y herramientas
├── docs/                  # Documentación técnica
├── data/
│   └── services.json       # Base de datos (auto-generada)
├── docker-compose.yml
└── README.md
```

## 🔒 Seguridad

Por defecto, kuNNA está configurado para desarrollo local. Para producción:

1. **Cambiar CORS**: Modificar `allow_origins` en `backend/app.py`
2. **HTTPS**: Configurar certificados SSL
3. **Autenticación**: Agregar sistema de autenticación si es necesario

## 🐛 Troubleshooting

### El frontend no se conecta al backend
- Verifica que ambos contenedores estén corriendo: `docker-compose ps`
- Revisa los logs: `docker-compose logs backend`

### Error al guardar servicios
- Verifica permisos en la carpeta `data/`
- Asegúrate que el volumen esté montado correctamente

### Puerto en uso
Si algún puerto está ocupado, modifica en `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Cambiar 3000 por otro puerto
```

## 📚 Documentación


Para información detallada sobre el proyecto, consulta la documentación en la carpeta [docs/](docs/):
- **[Architecture & Design](docs/ARCHITECTURE.md)** - **Documentación Definitiva** con diagramas de funcionamiento.
- **[SSH Deployment Detail](docs/SSH_DEPLOYMENT_DETAIL.md)** - Detalle técnico de IPs, puertos y ruteo remoto.
- **[API Documentation](docs/API.md)** - Documentación completa de la API REST
- **[Integration Guide](docs/INTEGRATION.md)** - Guías de integración
- **[Traffic Monitoring](docs/TRAFFIC_MONITORING.md)** - Sistema de monitoreo de tráfico
- **[Remote Agents](docs/REMOTE_AGENT_PLAN.md)** - Arquitectura de agentes remotos
- **[Swagger Guide](docs/SWAGGER_GUIDE.md)** - Cómo usar Swagger UI

Ver el [índice completo de documentación](docs/README.md) para más detalles.
## 🛠️ Scripts y Herramientas

El proyecto incluye varios scripts útiles organizados en la carpeta [scripts/](scripts/):

- **[Utilidades](scripts/utilities/)** - Scripts de automatización (`add-service.sh`)
- **[Pruebas](scripts/tests/)** - Scripts de testing (`test_traffic.py`)
- **[Ejemplos](scripts/examples/)** - Demos y ejemplos de uso
- **[Herramientas](scripts/tools/)** - Librerías como `kunna_tracer.py`

Ver la [documentación de scripts](scripts/README.md) para detalles completos.
## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor lee nuestra [Guía de Contribución](CONTRIBUTING.md) para conocer cómo contribuir al proyecto.

### 🌟 Formas de Contribuir

- 🐛 Reportar bugs
- 💡 Proponer nuevas características
- 📝 Mejorar la documentación
- 🔧 Enviar Pull Requests
- ⭐ Dar una estrella al proyecto

## 💖 Patrocinadores

Si kuNNA te ha sido útil, considera apoyar su desarrollo:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-pink?logo=github)](https://github.com/sponsors/elisaul77)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue?logo=paypal)](https://www.paypal.com/paypalme/elisaul77)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/elisaul77)

Ver más opciones de patrocinio en [FUNDING.md](FUNDING.md)

### 🎁 Beneficios de Patrocinio

- **🌟 Bronze ($5/mes)**: Reconocimiento en README + Badge de patrocinador
- **🥈 Silver ($15/mes)**: Todo lo anterior + Soporte prioritario
- **🥇 Gold ($50/mes)**: Todo lo anterior + Mención en lanzamientos + Logo en sitio web
- **💎 Platinum ($100/mes)**: Todo lo anterior + Consultoría directa + Características personalizadas

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🚀 Próximas Características

- [ ] Sistema de autenticación
- [ ] Temas claro/oscuro
- [ ] Exportar/Importar configuración
- [ ] Health checks automáticos
- [ ] Notificaciones cuando un servicio cae
- [ ] Organización por grupos/proyectos
- [ ] Shortcuts de teclado

## 👨‍💻 Autor

**Eli Saul Florez Perez**

- GitHub: [@elisaul77](https://github.com/elisaul77)
- Email: wcwxtctco@mozmail.com

## 🙏 Agradecimientos

Gracias a todos los contribuidores que han hecho posible este proyecto. Si kuNNA te ha sido útil, considera:

- ⭐ Dar una estrella al proyecto
- 🐛 Reportar bugs o sugerir características
- 💖 Convertirte en patrocinador
- 📢 Compartir el proyecto con otros

---

<div align="center">
  
**Desarrollado con ❤️ para simplificar tu workflow de Docker**

[![Made with Python](https://img.shields.io/badge/Made%20with-Python-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Powered by FastAPI](https://img.shields.io/badge/Powered%20by-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[⬆ Volver arriba](#-kunna)

</div>
