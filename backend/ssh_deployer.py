"""
SSH Deployer - Despliega agentes en servidores remotos via SSH
"""

import paramiko
import time
import secrets
from typing import Optional, Callable
import io

class SSHDeployer:
    """Gestiona el deployment de agentes via SSH"""
    
    def __init__(self):
        self.client: Optional[paramiko.SSHClient] = None
        
    def connect(self, host: str, port: int, username: str, 
                password: Optional[str] = None, 
                private_key: Optional[str] = None) -> bool:
        """Conecta al servidor via SSH"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            connect_kwargs = {
                'hostname': host,
                'port': port,
                'username': username,
                'timeout': 10
            }
            
            if private_key:
                # Usar llave privada
                key_file = io.StringIO(private_key)
                pkey = paramiko.RSAKey.from_private_key(key_file)
                connect_kwargs['pkey'] = pkey
            elif password:
                # Usar contraseña
                connect_kwargs['password'] = password
            else:
                raise ValueError("Se requiere password o private_key")
            
            self.client.connect(**connect_kwargs)
            return True
            
        except Exception as e:
            print(f"Error conectando SSH: {e}")
            return False
    
    def disconnect(self):
        """Cierra la conexión SSH"""
        if self.client:
            self.client.close()
            self.client = None
    
    def execute_command(self, command: str, sudo: bool = False) -> tuple[int, str, str]:
        """Ejecuta un comando en el servidor remoto"""
        if not self.client:
            return -1, "", "No hay conexión SSH"
        
        try:
            if sudo:
                command = f"sudo {command}"
            
            stdin, stdout, stderr = self.client.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            
            return exit_code, output, error
            
        except Exception as e:
            return -1, "", str(e)
    
    def check_docker(self) -> bool:
        """Verifica si Docker está instalado"""
        exit_code, output, _ = self.execute_command("docker --version")
        return exit_code == 0
    
    def install_docker(self, os_type: str = "ubuntu") -> bool:
        """Instala Docker en el servidor"""
        print("📦 Instalando Docker...")
        
        if os_type in ["ubuntu", "debian"]:
            commands = [
                "sudo apt-get update",
                "sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common",
                "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -",
                "sudo add-apt-repository 'deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable'",
                "sudo apt-get update",
                "sudo apt-get install -y docker-ce docker-ce-cli containerd.io",
                "sudo systemctl start docker",
                "sudo systemctl enable docker"
            ]
        else:
            print(f"❌ OS no soportado: {os_type}")
            return False
        
        for cmd in commands:
            exit_code, output, error = self.execute_command(cmd, sudo=False)
            if exit_code != 0:
                print(f"❌ Error ejecutando: {cmd}")
                print(f"   Error: {error}")
                return False
        
        return True
    
    def generate_agent_token(self) -> str:
        """Genera un token único para el agente"""
        return secrets.token_urlsafe(32)
    
    def deploy_agent(self, central_url: str, token: str, 
                    image_name: str = "kunna/agent:latest") -> bool:
        """Despliega el agente kuNNA"""
        try:
            # Detener contenedor existente
            print("🛑 Deteniendo agente existente (si existe)...")
            self.execute_command("sudo docker rm -f kunna-agent", sudo=False)
            
            # Obtener hostname
            _, hostname, _ = self.execute_command("hostname")
            hostname = hostname.strip()
            
            # Construir comando docker run
            docker_cmd = f"""sudo docker run -d \
                --name kunna-agent \
                --restart unless-stopped \
                -v /var/run/docker.sock:/var/run/docker.sock:ro \
                -e KUNNA_CENTRAL_URL="{central_url}" \
                -e KUNNA_AGENT_TOKEN="{token}" \
                -e KUNNA_SERVER_ID="{hostname}" \
                -e KUNNA_HEARTBEAT_INTERVAL=10 \
                {image_name}"""
            
            print("🚀 Desplegando agente...")
            exit_code, output, error = self.execute_command(docker_cmd, sudo=False)
            
            if exit_code != 0:
                print(f"❌ Error desplegando agente: {error}")
                return False
            
            # Verificar que esté corriendo
            time.sleep(2)
            exit_code, output, _ = self.execute_command("sudo docker ps --filter name=kunna-agent", sudo=False)
            
            if "kunna-agent" in output:
                print("✅ Agente desplegado correctamente")
                return True
            else:
                print("❌ El agente no está corriendo")
                return False
                
        except Exception as e:
            print(f"❌ Error en deploy_agent: {e}")
            return False
    
    def full_deployment(self, host: str, port: int, username: str,
                       password: Optional[str], private_key: Optional[str],
                       central_url: str, 
                       progress_callback: Optional[Callable] = None) -> dict:
        """
        Realiza el deployment completo del agente
        
        Returns:
            dict con status, message, token
        """
        result = {
            "success": False,
            "message": "",
            "token": None,
            "steps": []
        }
        
        def log_progress(step: str, status: str = "info"):
            result["steps"].append({"step": step, "status": status})
            if progress_callback:
                progress_callback(step, status)
        
        try:
            # 1. Conectar SSH
            log_progress("🔍 Conectando al servidor...")
            if not self.connect(host, port, username, password, private_key):
                result["message"] = "No se pudo conectar via SSH"
                log_progress("❌ Conexión fallida", "error")
                return result
            
            log_progress("✅ Conexión establecida", "success")
            
            # 2. Verificar Docker
            log_progress("🐳 Verificando Docker...")
            if not self.check_docker():
                log_progress("⚠️ Docker no instalado, instalando...", "warning")
                if not self.install_docker():
                    result["message"] = "No se pudo instalar Docker"
                    log_progress("❌ Instalación de Docker fallida", "error")
                    return result
                log_progress("✅ Docker instalado", "success")
            else:
                log_progress("✅ Docker ya instalado", "success")
            
            # 3. Generar token
            log_progress("🔑 Generando token de autenticación...")
            token = self.generate_agent_token()
            result["token"] = token
            log_progress("✅ Token generado", "success")
            
            # 4. Desplegar agente
            log_progress("🚀 Desplegando kuNNA Agent...")
            if not self.deploy_agent(central_url, token):
                result["message"] = "No se pudo desplegar el agente"
                log_progress("❌ Deployment fallido", "error")
                return result
            
            log_progress("✅ Agente desplegado correctamente", "success")
            
            # 5. Esperar conexión
            log_progress("🔗 Esperando conexión del agente...")
            time.sleep(5)  # Dar tiempo para que se conecte
            log_progress("✅ Deployment completado", "success")
            
            result["success"] = True
            result["message"] = "Agente desplegado exitosamente"
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            log_progress(f"❌ Error: {str(e)}", "error")
        
        finally:
            self.disconnect()
        
        return result

# Instancia global
deployer = SSHDeployer()
