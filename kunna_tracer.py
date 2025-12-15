"""
kuNNA Tracer - Cliente Python para reportar tráfico al SCADA

Uso rápido:
    from kunna_tracer import tracer
    
    # Reportar manualmente
    tracer.report("database", method="SELECT", status=200, duration=25.5)
    
    # Decorador automático
    @tracer.trace("api-externa")
    def llamar_api():
        return requests.get("http://api/data")
"""

import requests
import time
import os
from functools import wraps
from typing import Optional, Callable
from contextlib import contextmanager

class KunnaTracer:
    def __init__(
        self, 
        service_name: Optional[str] = None,
        kunna_url: Optional[str] = None,
        enabled: bool = True
    ):
        """
        Inicializa el tracer de kuNNA
        
        Args:
            service_name: Nombre de este servicio (default: KUNNA_SERVICE_NAME env var o hostname)
            kunna_url: URL del backend de kuNNA (default: KUNNA_BACKEND env var o http://kunna-backend:8000)
            enabled: Si False, todas las llamadas son no-op (útil para testing)
        """
        self.service_name = service_name or os.getenv("KUNNA_SERVICE_NAME") or os.getenv("HOSTNAME", "unknown")
        self.kunna_url = kunna_url or os.getenv("KUNNA_BACKEND", "http://kunna-backend:8000")
        self.enabled = enabled and os.getenv("KUNNA_TRACING_ENABLED", "true").lower() != "false"
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})
    
    def report(
        self, 
        to_service: str, 
        method: str = "HTTP", 
        path: str = "/", 
        status: int = 200, 
        duration: Optional[float] = None
    ) -> bool:
        """
        Reporta un evento de tráfico a kuNNA
        
        Args:
            to_service: Nombre del servicio destino
            method: Método HTTP o tipo de operación
            path: Path del endpoint o descripción de la operación
            status: Código de estado (200, 404, 500, etc.)
            duration: Duración en milisegundos
            
        Returns:
            True si se reportó exitosamente, False en caso contrario
        """
        if not self.enabled:
            return False
        
        try:
            self._session.post(
                f"{self.kunna_url}/api/traffic",
                json={
                    "from_service": self.service_name,
                    "to_service": to_service,
                    "method": method,
                    "path": path,
                    "status": status,
                    "duration": duration
                },
                timeout=1
            )
            return True
        except Exception as e:
            # Silent fail - no queremos romper la app por problemas de telemetría
            return False
    
    def trace(self, to_service: str, method: str = "CALL", path: Optional[str] = None):
        """
        Decorador para tracear automáticamente llamadas a otros servicios
        
        Args:
            to_service: Nombre del servicio destino
            method: Tipo de operación (default: "CALL")
            path: Path o descripción (default: nombre de la función)
            
        Ejemplo:
            @tracer.trace("database", method="SELECT")
            def get_users():
                return db.query("SELECT * FROM users")
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                start = time.time()
                func_path = path or func.__name__
                
                try:
                    result = func(*args, **kwargs)
                    duration = (time.time() - start) * 1000
                    self.report(to_service, method, func_path, 200, duration)
                    return result
                except Exception as e:
                    duration = (time.time() - start) * 1000
                    self.report(to_service, method, func_path, 500, duration)
                    raise
            
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                start = time.time()
                func_path = path or func.__name__
                
                try:
                    result = await func(*args, **kwargs)
                    duration = (time.time() - start) * 1000
                    self.report(to_service, method, func_path, 200, duration)
                    return result
                except Exception as e:
                    duration = (time.time() - start) * 1000
                    self.report(to_service, method, func_path, 500, duration)
                    raise
            
            # Detectar si la función es async
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    @contextmanager
    def span(self, to_service: str, method: str = "HTTP", path: str = "/"):
        """
        Context manager para tracear bloques de código
        
        Ejemplo:
            with tracer.span("database", "SELECT", "/users"):
                users = db.query("SELECT * FROM users")
        """
        start = time.time()
        status = 200
        
        try:
            yield
        except Exception as e:
            status = 500
            raise
        finally:
            duration = (time.time() - start) * 1000
            self.report(to_service, method, path, status, duration)
    
    def trace_requests_session(self):
        """
        Retorna una sesión de requests que automáticamente reporta todas las llamadas HTTP
        
        Ejemplo:
            session = tracer.trace_requests_session()
            response = session.get("http://api-externa:8080/data")
            # Automáticamente reporta a kuNNA
        """
        session = requests.Session()
        original_request = session.request
        
        def traced_request(*args, **kwargs):
            url = args[1] if len(args) > 1 else kwargs.get('url', '')
            method = args[0] if len(args) > 0 else kwargs.get('method', 'GET')
            
            # Extraer nombre del servicio de la URL
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                to_service = parsed.hostname or "external"
            except:
                to_service = "external"
            
            start = time.time()
            try:
                response = original_request(*args, **kwargs)
                duration = (time.time() - start) * 1000
                self.report(to_service, method, parsed.path or "/", response.status_code, duration)
                return response
            except Exception as e:
                duration = (time.time() - start) * 1000
                self.report(to_service, method, parsed.path or "/", 500, duration)
                raise
        
        session.request = traced_request
        return session


# Instancia global por defecto
tracer = KunnaTracer()


# ============ Integraciones con Frameworks ============

def fastapi_middleware(app, service_name: Optional[str] = None):
    """
    Middleware para FastAPI que reporta automáticamente todo el tráfico
    
    Uso:
        from fastapi import FastAPI
        from kunna_tracer import fastapi_middleware
        
        app = FastAPI()
        fastapi_middleware(app, "mi-api")
    """
    from fastapi import Request
    
    tracer = KunnaTracer(service_name)
    
    @app.middleware("http")
    async def trace_middleware(request: Request, call_next):
        start = time.time()
        
        response = await call_next(request)
        
        duration = (time.time() - start) * 1000
        
        tracer.report(
            to_service=tracer.service_name,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration=duration
        )
        
        return response


def flask_before_after(app, service_name: Optional[str] = None):
    """
    Configura hooks de Flask para reportar tráfico
    
    Uso:
        from flask import Flask
        from kunna_tracer import flask_before_after
        
        app = Flask(__name__)
        flask_before_after(app, "mi-flask-app")
    """
    from flask import request, g
    
    tracer = KunnaTracer(service_name)
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = (time.time() - g.start_time) * 1000
            
            tracer.report(
                to_service=tracer.service_name,
                method=request.method,
                path=request.path,
                status=response.status_code,
                duration=duration
            )
        
        return response
