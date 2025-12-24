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
        self.needs_sudo: bool = False
        
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
        """Verifica si Docker está instalado y si necesita sudo"""
        # Probar sin sudo primero - usar un comando que requiera acceso al socket
        exit_code, output, _ = self.execute_command("docker ps 2>&1")
        print(f"🔍 Docker sin sudo: exit_code={exit_code}")
        if exit_code == 0:
            self.needs_sudo = False
            print("✅ Docker funciona sin sudo")
            return True
        
        # Probar con sudo
        exit_code, output, _ = self.execute_command("sudo docker ps 2>&1")
        print(f"🔍 Docker con sudo: exit_code={exit_code}")
        if exit_code == 0:
            self.needs_sudo = True
            print("⚠️  Usuario requiere sudo para Docker")
            return True
        
        # Verificar si al menos está instalado
        exit_code, _, _ = self.execute_command("docker --version")
        if exit_code == 0:
            print("⚠️  Docker instalado pero no accesible")
            return False
        
        print("❌ Docker no está instalado")
        return False
    
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
    
    def transfer_file_content(self, remote_path: str, content: str) -> bool:
        """Transfiere contenido de archivo al servidor remoto usando SFTP"""
        try:
            sftp = self.client.open_sftp()
            with sftp.file(remote_path, 'w') as f:
                f.write(content)
            sftp.close()
            return True
        except Exception as e:
            print(f"❌ Error transfiriendo archivo: {e}")
            return False

    def deploy_agent(self, central_url: str, token: str, server_id: Optional[str] = None, docker_network: Optional[str] = None) -> bool:
        """
        Despliega el agente kuNNA construyendo nativamente en el servidor remoto.
        Compatible con ARM64 (Raspberry Pi) y AMD64.
        
        Args:
            central_url: URL del servidor central
            token: Token de autenticación
            server_id: ID del servidor (opcional, usa hostname por defecto)
            docker_network: Red Docker adicional a la que conectar el agente (ej: para WireGuard)
        """
        try:
            # Detener y eliminar contenedor existente
            print("🛑 Deteniendo agente existente (si existe)...")
            docker_cmd = "sudo docker" if self.needs_sudo else "docker"
            self.execute_command(f"{docker_cmd} rm -f kunna-agent 2>/dev/null || true")
            
            # Obtener hostname si no se proporciona server_id
            if not server_id:
                _, hostname, _ = self.execute_command("hostname")
                server_id = hostname.strip()
            
            print(f"📝 Server ID: {server_id}")
            
            # Crear directorio
            print("📁 Creando directorio para el agente...")
            self.execute_command("mkdir -p ~/kunna-agent")
            
            # Usar directorio montado en /app/agent
            import os
            agent_dir = '/app/agent'
            
            # Leer agent.py
            with open(os.path.join(agent_dir, 'agent.py'), 'r') as f:
                agent_py_content = f.read()
            
            # Leer Dockerfile
            with open(os.path.join(agent_dir, 'Dockerfile'), 'r') as f:
                dockerfile_content = f.read()
            
            # Leer requirements.txt
            with open(os.path.join(agent_dir, 'requirements.txt'), 'r') as f:
                requirements_content = f.read()
            
            # Transferir archivos via SFTP
            print("📤 Transfiriendo archivos al servidor...")
            if not self.transfer_file_content(f'/home/{self.client.get_transport().get_username()}/kunna-agent/agent.py', 
                                             agent_py_content):
                return False
            
            if not self.transfer_file_content(f'/home/{self.client.get_transport().get_username()}/kunna-agent/Dockerfile', 
                                             dockerfile_content):
                return False
                
            if not self.transfer_file_content(f'/home/{self.client.get_transport().get_username()}/kunna-agent/requirements.txt', 
                                             requirements_content):
                return False
            
            print("✅ Archivos transferidos")
            
            # Construir imagen nativamente en el servidor remoto
            print("🔨 Construyendo imagen del agente (esto puede tardar en Raspberry Pi)...")
            docker_cmd = "sudo docker" if self.needs_sudo else "docker"
            print(f"🔧 Usando comando: {docker_cmd} (needs_sudo={self.needs_sudo})")
            exit_code, output, error = self.execute_command(
                f"cd ~/kunna-agent && {docker_cmd} build -t kunna/agent:latest ."
            )
            
            if exit_code != 0:
                print(f"❌ Error construyendo imagen:")
                print(error)
                return False
            
            print("✅ Imagen construida")
            
            # Desplegar contenedor con variables de entorno
            print("🚀 Desplegando agente...")
            
            # Construir comando base
            network_flag = f"--network {docker_network}" if docker_network else ""
            cap_flag = "--cap-add=NET_ADMIN" if docker_network else ""
            port_flag = "-p 9000:9000" if docker_network != "host" else ""
            
            # Lógica de rutas estáticas para VPN
            static_routes_env = ""
            if docker_network and docker_network != "host":
                print(f"🔍 Buscando gateway VPN en red: {docker_network}")
                # Buscar contenedor de WireGuard (wg-easy, wireguard, vpn)
                wg_cmd = f"{docker_cmd} ps --filter 'name=wg' --filter 'name=vpn' --format '{{{{.Names}}}}' | head -n 1"
                exit_code, wg_container, _ = self.execute_command(wg_cmd)
                
                if exit_code == 0 and wg_container.strip():
                    wg_name = wg_container.strip()
                    print(f"   Contenedor VPN detectado: {wg_name}")
                    
                    # Obtener IP del gateway en la red seleccionada
                    ip_cmd = f"{docker_cmd} inspect {wg_name} --format '{{{{.NetworkSettings.Networks.{docker_network}.IPAddress}}}}'"
                    exit_code, wg_ip, _ = self.execute_command(ip_cmd)
                    
                    if exit_code == 0 and wg_ip.strip():
                        wg_ip = wg_ip.strip()
                        # Inyectar ruta estática (ejemplo genérico 10.0.0.0/8)
                        static_routes_env = f"-e KUNNA_STATIC_ROUTES='10.0.0.0/8 via {wg_ip}'"
                        print(f"✅ Ruta estática inyectada vía {wg_ip}")

            run_cmd = f"""{docker_cmd} run -d \
                --name kunna-agent \
                --restart unless-stopped \
                {network_flag} \
                {cap_flag} \
                {port_flag} \
                -v /var/run/docker.sock:/var/run/docker.sock:ro \
                -e KUNNA_CENTRAL_URL='{central_url}' \
                -e KUNNA_AGENT_TOKEN='{token}' \
                -e KUNNA_SERVER_ID='{server_id}' \
                -e KUNNA_HEARTBEAT_INTERVAL='10' \
                -e KUNNA_TRAFFIC_PORT='9000' \
                {static_routes_env} \
                kunna/agent:latest"""
            
            if docker_network:
                print(f"🔗 Conectando a red: {docker_network}")
            
            exit_code, output, error = self.execute_command(run_cmd)
            
            if exit_code != 0:
                print(f"❌ Error desplegando contenedor:")
                print(error)
                return False
            
            # Si está en red Docker específica (no host), intentar configurar rutas VPN si es necesario
            if docker_network and docker_network != "host":
                # Buscar gateway de la red para ruteo persistente
                print("🛣️  Configurando rutas de red adicionales si es necesario...")
                # (La lógica de KUNNA_STATIC_ROUTES arriba ya maneja esto de forma persistente)
            
            # Verificar que esté corriendo
            print("⏳ Verificando despliegue...")
            time.sleep(5)
            
            docker_ps_cmd = "sudo docker" if self.needs_sudo else "docker"
            exit_code, output, _ = self.execute_command(f"{docker_ps_cmd} ps --filter name=kunna-agent --format '{{{{.Names}}}}'")
            
            if "kunna-agent" in output:
                print("✅ Agente desplegado correctamente")
                
                # Mostrar logs iniciales
                _, logs, _ = self.execute_command(f"{docker_ps_cmd} logs kunna-agent --tail 10")
                print(f"📋 Logs del agente:\n{logs}")
                
                return True
            else:
                print("❌ El agente no está corriendo")
                # Mostrar logs para debug
                _, logs, _ = self.execute_command(f"{docker_ps_cmd} logs kunna-agent 2>&1")
                print(f"📋 Logs de error:\n{logs}")
                return False
                
        except Exception as e:
            print(f"❌ Error en deploy_agent: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def full_deployment(self, host: str, port: int, username: str,
                       password: Optional[str], private_key: Optional[str],
                       central_url: str,
                       docker_network: Optional[str] = None,
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
            
            # 4. Desplegar agente (con construcción nativa para ARM/AMD64)
            log_progress("🚀 Desplegando kuNNA Agent...")
            if not self.deploy_agent(central_url, token, server_id=host, docker_network=docker_network):
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
