# kuNNA 🎯

**Tu ventana de enlaces a todos tus servicios**

kuNNA es un dashboard elegante y funcional que te permite gestionar y acceder a todos tus servicios locales y en la nube desde un solo lugar. Olvídate de memorizar IPs y puertos.

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

## 🎯 Servicios Preconfigurados

kuNNA viene con estos servicios por defecto:
- **MLflow** (http://localhost:5000) - Tracking de ML
- **kuNNA Dashboard** (http://localhost:3000) - Este dashboard

## � Documentación

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
## �🚀 Próximas Características

- [ ] Sistema de autenticación
- [ ] Temas claro/oscuro
- [ ] Exportar/Importar configuración
- [ ] Health checks automáticos
- [ ] Notificaciones cuando un servicio cae
- [ ] Organización por grupos/proyectos
- [ ] Shortcuts de teclado

## 📝 Licencia

MIT License - Libre para usar y modificar

## 🤝 Contribuir

¿Tienes ideas para mejorar kuNNA? ¡Son bienvenidas!

---

**Desarrollado con ❤️ para simplificar tu workflow**
