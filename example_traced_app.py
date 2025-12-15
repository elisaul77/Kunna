"""
Ejemplo completo de uso del kuNNA Tracer

Este ejemplo muestra cómo instrumentar una aplicación FastAPI
para reportar tráfico al SCADA de kuNNA
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import time

# ============ Opción 1: Usar el tracer directamente ============
from kunna_tracer import tracer

app = FastAPI(title="Demo Service")

# Configurar nombre del servicio
tracer.service_name = "demo-api"

# ============ Ejemplo 1: Reportar manualmente ============
@app.get("/manual-report")
def manual_report():
    """Ejemplo de reporte manual"""
    start = time.time()
    
    # Simular trabajo
    time.sleep(0.1)
    
    duration = (time.time() - start) * 1000
    
    # Reportar a kuNNA
    tracer.report(
        to_service="demo-api",
        method="GET",
        path="/manual-report",
        status=200,
        duration=duration
    )
    
    return {"message": "Tráfico reportado manualmente"}


# ============ Ejemplo 2: Usar decorador para funciones ============
@app.get("/call-database")
@tracer.trace("postgres-db", method="SELECT", path="/users")
def call_database():
    """El decorador automáticamente reporta tiempo y status"""
    # Simular consulta a BD
    time.sleep(0.05)
    return {"users": [{"id": 1, "name": "Alice"}]}


@app.get("/call-external-api")
def call_external_api():
    """Ejemplo de llamar a API externa y reportar"""
    
    @tracer.trace("api-externa", method="GET", path="/data")
    def fetch_data():
        # Simular llamada HTTP
        time.sleep(0.02)
        return {"data": "example"}
    
    result = fetch_data()
    return result


# ============ Ejemplo 3: Context manager para bloques de código ============
@app.post("/process-data")
def process_data():
    """Usar context manager para tracear secciones específicas"""
    
    # Paso 1: Consultar base de datos
    with tracer.span("postgres-db", "SELECT", "/products"):
        time.sleep(0.03)
        products = [{"id": 1, "name": "Product A"}]
    
    # Paso 2: Procesar datos
    processed = []
    for product in products:
        # Cada operación se puede tracear individualmente
        with tracer.span("redis-cache", "SET", f"/cache/{product['id']}"):
            time.sleep(0.01)
            processed.append(product)
    
    # Paso 3: Notificar a otro servicio
    with tracer.span("notification-service", "POST", "/notify"):
        time.sleep(0.02)
    
    return {"processed": len(processed)}


# ============ Ejemplo 4: Sesión de requests con tracing automático ============
@app.get("/proxy-request")
def proxy_request():
    """Todas las llamadas HTTP se reportan automáticamente"""
    
    # Crear sesión con tracing
    session = tracer.trace_requests_session()
    
    # Todas estas llamadas se reportan automáticamente
    try:
        # response = session.get("http://api-externa:8080/data")
        # response = session.post("http://otro-servicio:3000/process", json={"foo": "bar"})
        
        # Simular sin hacer llamadas reales
        time.sleep(0.05)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Ejemplo 5: Middleware automático (más fácil) ============
from kunna_tracer import fastapi_middleware

# Esto reporta automáticamente TODAS las requests que recibe tu API
fastapi_middleware(app, service_name="demo-api")


# ============ Ejemplo 6: Reportar interacciones entre múltiples servicios ============
@app.get("/complex-workflow")
async def complex_workflow():
    """
    Ejemplo de workflow complejo con múltiples interacciones
    Cada paso se reporta al SCADA
    """
    
    results = {}
    
    # 1. Validar con servicio de autenticación
    with tracer.span("auth-service", "POST", "/validate"):
        time.sleep(0.02)
        results["auth"] = "valid"
    
    # 2. Consultar base de datos principal
    with tracer.span("postgres-db", "SELECT", "/orders"):
        time.sleep(0.05)
        results["orders"] = [{"id": 1}]
    
    # 3. Enriquecer con datos de cache
    with tracer.span("redis-cache", "GET", "/order_details"):
        time.sleep(0.01)
        results["details"] = {"total": 100}
    
    # 4. Calcular con servicio de pricing
    with tracer.span("pricing-service", "POST", "/calculate"):
        time.sleep(0.03)
        results["price"] = 99.99
    
    # 5. Actualizar inventario
    with tracer.span("inventory-service", "PATCH", "/stock"):
        time.sleep(0.02)
        results["inventory_updated"] = True
    
    # 6. Enviar notificación
    with tracer.span("notification-service", "POST", "/email"):
        time.sleep(0.04)
        results["notification_sent"] = True
    
    return results


# ============ Ejemplo 7: Manejo de errores ============
@app.get("/failing-endpoint")
def failing_endpoint():
    """El tracer reporta automáticamente errores con status 500"""
    
    @tracer.trace("unreliable-service", method="GET", path="/data")
    def call_unreliable_service():
        # Simular error
        raise Exception("Service temporarily unavailable")
    
    try:
        call_unreliable_service()
    except Exception as e:
        # El error ya fue reportado con status 500
        raise HTTPException(status_code=503, detail=str(e))


# ============ Testing sin kuNNA ============
if __name__ == "__main__":
    import uvicorn
    
    # Para desarrollo local sin kuNNA, deshabilitar tracing
    import os
    os.environ["KUNNA_TRACING_ENABLED"] = "false"
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    # Para producción con kuNNA:
    # docker run -e KUNNA_SERVICE_NAME=demo-api -e KUNNA_BACKEND=http://kunna-backend:8000 demo-api
