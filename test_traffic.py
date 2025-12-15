#!/usr/bin/env python3
"""
Test del sistema de monitoreo de tráfico de kuNNA

Este script simula tráfico entre servicios y verifica que se visualice en el SCADA
"""

import requests
import time
import random

KUNNA_BACKEND = "http://localhost:8000"

def report_traffic(from_service, to_service, method, path, status, duration):
    """Reporta un evento de tráfico"""
    try:
        response = requests.post(f"{KUNNA_BACKEND}/api/traffic", json={
            "from_service": from_service,
            "to_service": to_service,
            "method": method,
            "path": path,
            "status": status,
            "duration": duration
        }, timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {from_service} → {to_service}: {method} {path} ({status}) - Broadcasted to {data['broadcasted_to']} clients")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error reportando tráfico: {e}")
        return False

def simulate_traffic():
    """Simula tráfico entre servicios"""
    
    print("\n🚀 Iniciando simulación de tráfico entre servicios...\n")
    print("📊 Abre http://localhost:3000/scada.html para ver las animaciones en tiempo real\n")
    
    # Escenarios de tráfico comunes
    scenarios = [
        # Frontend → Backend
        ("kunna-frontend", "kunna-backend", "GET", "/api/services", 200, 25.5),
        ("kunna-frontend", "kunna-backend", "POST", "/api/services", 201, 45.2),
        ("kunna-frontend", "kunna-backend", "GET", "/api/topology", 200, 32.1),
        
        # Backend → Database
        ("kunna-backend", "postgres-db", "SELECT", "/users", 200, 15.3),
        ("kunna-backend", "postgres-db", "INSERT", "/orders", 200, 28.7),
        ("kunna-backend", "postgres-db", "UPDATE", "/products", 200, 22.4),
        
        # Backend → Redis
        ("kunna-backend", "redis-cache", "GET", "/session:123", 200, 5.2),
        ("kunna-backend", "redis-cache", "SET", "/cache:products", 200, 8.1),
        
        # API calls entre servicios
        ("api-gateway", "auth-service", "POST", "/validate", 200, 35.6),
        ("api-gateway", "user-service", "GET", "/profile", 200, 42.3),
        
        # External → Frontend
        ("external", "kunna-frontend", "GET", "/", 200, 120.5),
        ("external", "kunna-frontend", "GET", "/scada.html", 200, 85.3),
        
        # Worker processes
        ("worker-1", "queue-service", "PULL", "/jobs", 200, 12.4),
        ("worker-1", "storage-service", "PUT", "/uploads", 200, 156.8),
        
        # Errores ocasionales
        ("api-gateway", "payment-service", "POST", "/charge", 503, 5000.0),
        ("user-service", "email-service", "POST", "/send", 500, 3000.0),
    ]
    
    print("Enviando eventos de tráfico (Ctrl+C para detener)...\n")
    
    try:
        iteration = 0
        while True:
            iteration += 1
            print(f"\n--- Iteración {iteration} ---")
            
            # Enviar eventos aleatorios
            num_events = random.randint(3, 8)
            for _ in range(num_events):
                scenario = random.choice(scenarios)
                report_traffic(*scenario)
                time.sleep(random.uniform(0.5, 1.5))
            
            # Pausa entre iteraciones
            time.sleep(random.uniform(2, 4))
            
    except KeyboardInterrupt:
        print("\n\n🛑 Simulación detenida\n")

def test_single_event():
    """Test simple de un solo evento"""
    print("\n🧪 Test: Enviando un evento de prueba...\n")
    
    success = report_traffic(
        from_service="test-client",
        to_service="test-server",
        method="GET",
        path="/test",
        status=200,
        duration=42.5
    )
    
    if success:
        print("\n✅ Test exitoso - Verifica el SCADA en http://localhost:3000/scada.html")
    else:
        print("\n❌ Test fallido - Verifica que el backend esté corriendo")

def test_workflow():
    """Simula un workflow complejo"""
    print("\n🔄 Simulando workflow de orden de compra...\n")
    
    workflows = [
        ("external", "api-gateway", "POST", "/orders", 200, 15),
        ("api-gateway", "auth-service", "POST", "/validate-token", 200, 25),
        ("api-gateway", "order-service", "POST", "/create", 200, 45),
        ("order-service", "inventory-service", "GET", "/check-stock", 200, 30),
        ("order-service", "pricing-service", "POST", "/calculate", 200, 35),
        ("order-service", "postgres-db", "INSERT", "/orders", 200, 20),
        ("order-service", "payment-service", "POST", "/charge", 200, 500),
        ("order-service", "notification-service", "POST", "/email", 200, 150),
        ("order-service", "redis-cache", "SET", "/order:cache", 200, 10),
        ("api-gateway", "external", "RESPONSE", "/orders", 200, 5),
    ]
    
    print("Ejecutando workflow paso a paso...\n")
    for step in workflows:
        report_traffic(*step)
        time.sleep(0.8)
    
    print("\n✅ Workflow completado - Revisa las animaciones en el SCADA")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "test":
            test_single_event()
        elif sys.argv[1] == "workflow":
            test_workflow()
        else:
            print(f"Uso: {sys.argv[0]} [test|workflow|simulate]")
    else:
        simulate_traffic()
