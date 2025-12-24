# 🐳 Integración Automática de kuNNA con Docker

## ✅ **¿Qué hace?**

kuNNA ahora detecta **automáticamente** todos los contenedores Docker que levantas y los registra en el dashboard.

## 🔍 **¿Cómo funciona?**

```
┌─────────────────────────────────────────────────┐
│  Docker Engine                                  │
│  ├── Container 1 (postgres)                     │
│  ├── Container 2 (nginx)                        │
│  └── Container 3 (jupyter)                      │
└─────────────────────────────────────────────────┘
                    ↓
            (detecta cambios)
                    ↓
┌─────────────────────────────────────────────────┐
│  kuNNA Docker Monitor                           │
│  - Escanea cada 10 segundos                     │
│  - Lee puertos expuestos                        │
│  - Asigna iconos y categorías                   │
└─────────────────────────────────────────────────┘
                    ↓
            (registra en API)
                    ↓
┌─────────────────────────────────────────────────┐
│  kuNNA Dashboard                                │
│  http://localhost:3000                          │
│  ✨ Muestra todos los servicios                 │
└─────────────────────────────────────────────────┘
```

## 🚀 **Uso**

### **1. Iniciar kuNNA (ya lo tienes corriendo)**

```bash
cd /home/elisaul77/Documentos/Docker/kunna
docker-compose up -d
```

Esto levanta:
- ✅ Backend (API)
- ✅ Frontend (Dashboard)
- ✅ **Monitor de Docker** (nuevo)

### **2. Levantar cualquier contenedor**

```bash
# Ejemplo: PostgreSQL
docker run -d -p 5432:5432 --name postgres postgres

# Espera ~10 segundos y automáticamente aparecerá en:
# http://localhost:3000
```

El monitor:
1. Detecta el nuevo contenedor `postgres`
2. Ve que usa el puerto `5432`
3. Asigna icono 🐘 y categoría "Databases"
4. Lo registra en kuNNA
5. ¡Aparece en el dashboard!

### **3. Ver servicios detectados**

```bash
# Ver lista
curl http://localhost:8000/api/services

# O abre el dashboard
firefox http://localhost:3000
```

## 🎯 **Reconocimiento Automático**

El monitor reconoce automáticamente estos tipos:

| Contenedor | Icono | Categoría |
|------------|-------|-----------|
| postgres | 🐘 | Databases |
| mysql | 🐬 | Databases |
| mongo | 🍃 | Databases |
| redis | 🔴 | Databases |
| nginx | 🌐 | Web Servers |
| jupyter | 📊 | Data Science |
| mlflow | 🤖 | ML & AI |
| grafana | 📈 | Monitoring |
| rabbitmq | 🐰 | Message Queue |
| frontend | 🎨 | Docker Services |
| backend | ⚙️ | Docker Services |
| *otros* | 🐳 | Docker Services |

## ⚙️ **Configuración**

### **Cambiar intervalo de escaneo**

Edita `docker_monitor.py`:

```python
SCAN_INTERVAL = 30  # Cambiar de 10 a 30 segundos
```

Reinicia:
```bash
docker-compose restart docker-monitor
```

### **Agregar más reconocimientos**

Edita `docker_monitor.py`:

```python
CONTAINER_ICONS = {
    'postgres': '🐘',
    'mi-app': '🚀',  # ← Agregar tu app
    # ...
}

CONTAINER_CATEGORIES = {
    'postgres': 'Databases',
    'mi-app': 'My Apps',  # ← Agregar categoría
    # ...
}
```

## 📊 **Ver logs del monitor**

```bash
# Ver logs en tiempo real
docker-compose logs -f docker-monitor

# Ver últimas 50 líneas
docker-compose logs --tail=50 docker-monitor
```

**Salida típica:**
```
[2025-12-14 18:28:17] INFO: 🔍 Escaneando contenedores Docker...
[2025-12-14 18:28:17] INFO: Encontrados 4 contenedores con puertos
[2025-12-14 18:28:17] INFO: ✅ Registrado: postgres
[2025-12-14 18:28:17] INFO: ⏳ Esperando 10 segundos...
```

## 🔧 **Comandos útiles**

```bash
# Ver estado del monitor
docker-compose ps docker-monitor

# Reiniciar monitor
docker-compose restart docker-monitor

# Detener monitor (mantener otros servicios)
docker-compose stop docker-monitor

# Ver todos los servicios registrados
curl http://localhost:8000/api/services | jq .

# Limpiar todos los servicios y empezar de cero
rm data/services.json
docker-compose restart backend
```

## 🎨 **Ejemplo completo**

```bash
# 1. Levantar kuNNA
cd /home/elisaul77/Documentos/Docker/kunna
docker-compose up -d

# 2. Levantar un nuevo servicio
docker run -d -p 6379:6379 --name redis redis

# 3. Esperar 10 segundos
sleep 10

# 4. Verificar que se registró
curl http://localhost:8000/api/services | grep redis

# 5. Ver en el dashboard
# Abrir: http://localhost:3000
# Verás una tarjeta roja 🔴 "redis"
```

## 🔐 **Seguridad**

El monitor tiene acceso a:
- ✅ Docker socket (solo lectura)
- ✅ API de kuNNA (localhost)

**Permisos:**
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro  # ← read-only
```

## 🐛 **Troubleshooting**

### **El monitor no detecta contenedores**

```bash
# Verificar que tiene acceso a Docker
docker-compose exec docker-monitor docker ps

# Ver logs
docker-compose logs docker-monitor
```

### **Servicios duplicados**

Si ves duplicados, limpia y reinicia:
```bash
rm data/services.json
docker-compose restart backend docker-monitor
```

### **Contenedor no tiene puerto expuesto**

El monitor solo detecta contenedores con puertos mapeados (`-p`):

```bash
# ✅ SE DETECTA
docker run -d -p 8080:80 nginx

# ❌ NO SE DETECTA (sin puerto)
docker run -d nginx
```

## 🚀 **Próximos pasos**

Ahora cada vez que levantes un contenedor Docker con un puerto, aparecerá automáticamente en kuNNA!

**Prueba:**
1. Levanta un nuevo contenedor
2. Espera 10 segundos
3. Refresca http://localhost:3000
4. ¡Debería aparecer!

---

**Ubicación de archivos:**
- Monitor: `/home/elisaul77/Documentos/Docker/kunna/docker_monitor.py`
- Datos: `/home/elisaul77/Documentos/Docker/kunna/data/services.json`
- Config: `/home/elisaul77/Documentos/Docker/kunna/docker-compose.yml`
