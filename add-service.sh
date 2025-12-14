#!/bin/bash

# Script para agregar servicios a kuNNA via API
# Uso: ./add-service.sh

API_URL="http://localhost:8000/api/services"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Agregar Servicio a kuNNA ===${NC}\n"

# Solicitar datos
read -p "Nombre del servicio: " NAME
read -p "Descripción: " DESCRIPTION
read -p "URL (ej: http://localhost:8080): " URL
read -p "Icono (emoji, ej: 🚀): " ICON
read -p "Categoría (ej: Development): " CATEGORY
read -p "Color (hex, ej: #3b82f6): " COLOR

# Valores por defecto
ICON=${ICON:-🔗}
CATEGORY=${CATEGORY:-general}
COLOR=${COLOR:-#3b82f6}

# Crear JSON
JSON_DATA=$(cat <<EOF
{
  "name": "$NAME",
  "description": "$DESCRIPTION",
  "url": "$URL",
  "icon": "$ICON",
  "category": "$CATEGORY",
  "color": "$COLOR",
  "isActive": true
}
EOF
)

# Enviar request
echo -e "\n${BLUE}Agregando servicio...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA")

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Servicio agregado correctamente${NC}"
  echo -e "\nRespuesta:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo -e "\n${BLUE}Ver en: http://localhost:3000${NC}"
else
  echo "✗ Error al agregar el servicio"
fi
