# Guía de Usuario: Despliegue de Agentes Remotos 🚀

kuNNA permite expandir tu red de monitoreo a cualquier servidor Linux con Docker instalado, ya sea en tu red local, una VPN o en la nube (GCP, AWS, Azure).

## 🖥️ Uso desde la Interfaz (Recomendado)

1.  Ve a la sección **Servers** en el dashboard.
2.  Haz clic en **"Deploy New Agent"**.
3.  Completa el formulario:
    *   **Host**: IP o dominio del servidor remoto.
    *   **User**: Usuario con permisos de Docker (ej: `root` o tu usuario en el grupo `docker`).
    *   **Auth Method**: Elige entre contraseña o llave privada SSH.
    *   **Central URL**: La IP de tu PC actual (kuNNA la detecta automáticamente, pero asegúrate de elegir la que sea visible desde el remoto, ej: la IP de la VPN).
    *   **Network Mode**: 
        *   `bridge`: Crea una red aislada.
        *   `host`: Usa la red del servidor directamente (mejor para detectar IPs).
        *   `custom`: Permite elegir una red Docker existente (ej: para WireGuard).

## 🛠️ Comandos Manuales (Troubleshooting)

Si el despliegue automático falla o prefieres hacerlo a mano, estos son los pasos que kuNNA ejecuta internamente en el servidor remoto:

### 1. Preparar el entorno
```bash
mkdir -p ~/kunna-agent
cd ~/kunna-agent
```

### 2. Crear el archivo `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir docker websockets psutil
COPY agent.py .
CMD ["python", "agent.py"]
```

### 3. Construir la imagen
```bash
docker build -t kunna-agent .
```

### 4. Ejecutar el Agente
Sustituye los valores en `<...>` por los tuyos:

```bash
docker run -d \
  --name kunna-agent \
  --restart unless-stopped \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e KUNNA_CENTRAL_URL="ws://<TU_IP_CENTRAL>:8000/ws/agent" \
  -e KUNNA_AGENT_TOKEN="<TOKEN_GENERADO_POR_BACKEND>" \
  -e KUNNA_SERVER_ID="<NOMBRE_DEL_SERVIDOR>" \
  kunna-agent
```

> **Nota sobre VPNs**: Si usas una red `custom` en lugar de `host`, recuerda que podrías necesitar añadir la ruta hacia la VPN manualmente dentro del contenedor:
> `docker exec kunna-agent ip route add 10.x.x.0/24 via <GATEWAY_IP>`

## 🔍 Verificación
Una vez desplegado, el servidor aparecerá automáticamente en la pestaña **Servers** y sus contenedores se listarán en el **Dashboard** principal con un icono de mundo (🌐) indicando que son remotos.
