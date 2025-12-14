#!/bin/bash
#
# kuNNA Agent - Script de instalación automática
# Uso: curl -sSL https://kunna.local/install.sh | bash -s -- --central=IP:PORT --token=TOKEN
#

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
CENTRAL_URL=""
AGENT_TOKEN=""
CONTAINER_NAME="kunna-agent"
IMAGE_NAME="kunna/agent:latest"

# Funciones
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --central=*)
            CENTRAL_URL="${1#*=}"
            shift
            ;;
        --token=*)
            AGENT_TOKEN="${1#*=}"
            shift
            ;;
        *)
            log_error "Argumento desconocido: $1"
            exit 1
            ;;
    esac
done

# Validar argumentos
if [ -z "$CENTRAL_URL" ]; then
    log_error "Se requiere --central=IP:PORT"
    echo "Uso: $0 --central=192.168.x.1:8000 --token=YOUR_TOKEN"
    exit 1
fi

if [ -z "$AGENT_TOKEN" ]; then
    log_warn "No se proporcionó token, usando 'default-token'"
    AGENT_TOKEN="default-token"
fi

log_info "🚀 Instalando kuNNA Agent..."
log_info "   Central: $CENTRAL_URL"
log_info "   Token: ${AGENT_TOKEN:0:10}..."

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    log_warn "Docker no está instalado, instalando..."
    
    # Detectar OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi
    
    case $OS in
        ubuntu|debian)
            log_info "Instalando Docker en Ubuntu/Debian..."
            sudo apt-get update
            sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo apt-key add -
            sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$OS $(lsb_release -cs) stable"
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        centos|rhel|fedora)
            log_info "Instalando Docker en CentOS/RHEL/Fedora..."
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;
        *)
            log_error "Sistema operativo no soportado: $OS"
            exit 1
            ;;
    esac
    
    log_info "✅ Docker instalado correctamente"
fi

# Verificar que Docker esté corriendo
if ! sudo docker ps &> /dev/null; then
    log_warn "Docker no está corriendo, iniciando..."
    sudo systemctl start docker
fi

# Detener contenedor existente si existe
if sudo docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_info "Deteniendo contenedor existente..."
    sudo docker rm -f $CONTAINER_NAME
fi

# Pull de la imagen (si existe en registry, sino build local)
log_info "📦 Obteniendo imagen del agente..."
if ! sudo docker pull $IMAGE_NAME 2>/dev/null; then
    log_warn "No se pudo hacer pull, buscando Dockerfile..."
    
    # Si tenemos el Dockerfile localmente, construir
    if [ -f "./Dockerfile" ]; then
        log_info "Construyendo imagen localmente..."
        sudo docker build -t $IMAGE_NAME .
    else
        log_error "No se encontró la imagen ni el Dockerfile"
        log_info "Por favor, construye la imagen primero o especifica un registry"
        exit 1
    fi
fi

# Obtener hostname
HOSTNAME=$(hostname)

# Iniciar contenedor
log_info "🚀 Iniciando agente..."
sudo docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    -e KUNNA_CENTRAL_URL="ws://${CENTRAL_URL}" \
    -e KUNNA_AGENT_TOKEN="$AGENT_TOKEN" \
    -e KUNNA_SERVER_ID="$HOSTNAME" \
    -e KUNNA_HEARTBEAT_INTERVAL=10 \
    $IMAGE_NAME

# Verificar que esté corriendo
sleep 2
if sudo docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_info "✅ kuNNA Agent instalado y corriendo!"
    log_info ""
    log_info "📊 Ver logs:"
    log_info "   sudo docker logs -f $CONTAINER_NAME"
    log_info ""
    log_info "🛑 Detener agente:"
    log_info "   sudo docker stop $CONTAINER_NAME"
    log_info ""
    log_info "🔄 Reiniciar agente:"
    log_info "   sudo docker restart $CONTAINER_NAME"
else
    log_error "❌ El agente no se inició correctamente"
    log_info "Ver logs: sudo docker logs $CONTAINER_NAME"
    exit 1
fi
