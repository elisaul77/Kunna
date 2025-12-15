FROM python:3.11-slim

LABEL maintainer="kuNNA Agent"
LABEL description="Remote monitoring agent for kuNNA"

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    linux-libc-dev \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar agente
COPY agent.py .

# Variables de entorno por defecto
ENV KUNNA_CENTRAL_URL=ws://kunna-central:8000
ENV KUNNA_AGENT_TOKEN=default-token
ENV KUNNA_HEARTBEAT_INTERVAL=10
ENV PYTHONUNBUFFERED=1

CMD ["python", "agent.py"]
