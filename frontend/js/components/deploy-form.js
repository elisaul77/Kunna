/**
 * Deploy Form Component
 * Reusable SSH agent deployment form
 */

/**
 * Render deploy form HTML
 * @returns {string} HTML string
 */
export function renderDeployForm() {
  return `
    <form id="deploy-agent-form" class="deploy-form">
      <input type="hidden" id="auth-method" value="password">
      <input type="hidden" id="network-mode" value="bridge">
      
      <!-- Server IP -->
      <div class="form-group">
        <label for="server-ip">IP del Servidor *</label>
        <input type="text" id="server-ip" placeholder="192.168.x.x" required>
      </div>

      <!-- SSH Port -->
      <div class="form-group">
        <label for="server-port">Puerto SSH</label>
        <input type="number" id="server-port" value="22" min="1" max="65535" required>
      </div>

      <!-- Username -->
      <div class="form-group">
        <label for="server-user">Usuario SSH *</label>
        <input type="text" id="server-user" placeholder="ubuntu" required>
      </div>

      <!-- Auth Method Toggle -->
      <div class="form-group">
        <label>Método de Autenticación</label>
        <div class="auth-toggle">
          <button type="button" id="auth-password-btn" class="active" onclick="toggleAuthMethod('password')">
            🔐 Contraseña
          </button>
          <button type="button" id="auth-key-btn" onclick="toggleAuthMethod('key')">
            🔑 Llave SSH
          </button>
        </div>
      </div>

      <!-- Password Field -->
      <div class="form-group" id="password-group">
        <label for="server-password">Contraseña SSH *</label>
        <input type="password" id="server-password" placeholder="••••••••">
      </div>

      <!-- SSH Key Field (hidden by default) -->
      <div class="form-group" id="key-group" style="display: none;">
        <label for="server-key">Llave SSH Privada *</label>
        <textarea id="server-key" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"></textarea>
      </div>

      <!-- Central URL -->
      <div class="form-group">
        <label for="central-url">URL Central de Reporte *</label>
        <select id="central-url" required>
          <option value="">Cargando IPs disponibles...</option>
        </select>
      </div>

      <!-- Network Mode Toggle -->
      <div class="form-group">
        <label>Modo de Red del Agente</label>
        <div class="network-toggle">
          <button type="button" id="net-bridge-btn" class="active" onclick="toggleNetworkMode('bridge')">
            🌐 Bridge
          </button>
          <button type="button" id="net-host-btn" onclick="toggleNetworkMode('host')">
            🖥️ Host
          </button>
          <button type="button" id="net-custom-btn" onclick="toggleNetworkMode('custom')">
            ⚙️ Custom
          </button>
        </div>
      </div>

      <!-- Custom Network (hidden by default) -->
      <div class="form-group" id="custom-network-group" style="display: none;">
        <label for="custom-network">Nombre de la Red Docker</label>
        <input type="text" id="custom-network" placeholder="ej: my_docker_network">
      </div>

      <!-- Network Mode Help Text -->
      <div class="form-help" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: -0.75rem; margin-bottom: 1rem;">
        <b>Host:</b> El agente verá las interfaces de red (como wg0) directamente. Recomendado para VPN/WireGuard.
      </div>

      <!-- Submit Button -->
      <div class="form-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeDeployModal()" style="flex: 1;">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" style="flex: 2;">
          🚀 Desplegar Agente
        </button>
      </div>

      <!-- Deployment Progress -->
      <div id="deployment-progress" class="deploy-progress">
        <h3>Desplegando agente...</h3>
        <div id="deployment-logs" class="deploy-log"></div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
      </div>
    </form>
  `;
}

/**
 * Initialize deploy form event listeners
 * @param {Function} onDeploy - Callback when deploy is triggered
 * @rExpose modal functions on window for onclick handlers
  window.closeDeployModal = closeDeployModal;
  window.openDeployModal = openDeployModal;

  // eturns {Function} Cleanup function
 */
export function initDeployForm(onDeploy) {
  // Auth method toggle
  window.toggleAuthMethod = (method) => {
    const passwordBtn = document.getElementById('auth-password-btn');
    const keyBtn = document.getElementById('auth-key-btn');
    const passwordGroup = document.getElementById('password-group');
    const keyGroup = document.getElementById('key-group');

    if (method === 'password') {
      passwordBtn.classList.add('active');
      keyBtn.classList.remove('active');
      passwordGroup.style.display = 'block';
      keyGroup.style.display = 'none';
    } else {
      passwordBtn.classList.remove('active');
      keyBtn.classList.add('active');
      passwordGroup.style.display = 'none';
      keyGroup.style.display = 'block';
    }

    // Update select value
    document.getElementById('auth-method').value = method;
  };

  // Network mode toggle
  window.toggleNetworkMode = (mode) => {
    const bridgeBtn = document.getElementById('net-bridge-btn');
    const hostBtn = document.getElementById('net-host-btn');
    const customBtn = document.getElementById('net-custom-btn');
    const customNetworkGroup = document.getElementById('custom-network-group');

    // Reset all
    bridgeBtn.classList.remove('active');
    hostBtn.classList.remove('active');
    customBtn.classList.remove('active');

    // Set active
    if (mode === 'bridge') {
      bridgeBtn.classList.add('active');
      customNetworkGroup.style.display = 'none';
    } else if (mode === 'host') {
      hostBtn.classList.add('active');
      customNetworkGroup.style.display = 'none';
    } else {
      customBtn.classList.add('active');
      customNetworkGroup.style.display = 'block';
    }

    // Update select value
    document.getElementById('network-mode').value = mode;
  };

  // Load available IPs for central URL
  loadAvailableIPs();

  // Form submission
  const form = document.getElementById('deploy-agent-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDeploy(onDeploy);
    });
  }

  // Return cleanup function
  return () => {
    delete window.toggleAuthMethod;
    delete window.toggleNetworkMode;
  };
}

/**
 * Load available IPs for central URL dropdown
 */
async function loadAvailableIPs() {
  const select = document.getElementById('central-url');
  if (!select) return;

  try {
    const data = await window.utils.api('/system/ips');
    
    select.innerHTML = '';
    
    if (data.ips && data.ips.length > 0) {
      data.ips.forEach(ip => {
        const option = document.createElement('option');
        option.value = `ws://${ip.address}:8000`;
        option.textContent = `${ip.address} (${ip.interface} - ${ip.type})`;
        select.appendChild(option);
      });

      // Try to pre-select VPN IP
      const vpnIp = data.ips.find(ip => ip.type === 'VPN');
      if (vpnIp) {
        select.value = `ws://${vpnIp.address}:8000`;
      }
    // Error loading IPs is non-critical
      select.innerHTML = '<option value="ws://localhost:8000">localhost</option>';
    }
  } catch (error) {
    window.utils.showToast('Error loading available IPs', 'danger');
    select.innerHTML = '<option value="ws://localhost:8000">localhost (Error al cargar)</option>';
  }
}

/**
 * Handle deploy form submission
 * @param {Function} onDeploy - Callback
 */
async function handleDeploy(onDeploy) {
  const host = document.getElementById('server-ip').value.trim();
  const port = parseInt(document.getElementById('server-port').value) || 22;
  const username = document.getElementById('server-user').value.trim();
  const authMethod = document.getElementById('auth-method')?.value || 'password';
  const password = document.getElementById('server-password').value;
  const privateKey = document.getElementById('server-key').value;
  const centralUrl = document.getElementById('central-url').value;

  // Validation
  if (!host) {
    window.utils.showToast('Ingresa la IP del servidor', 'warning');
    return;
  }
  if (!username) {
    window.utils.showToast('Ingresa el usuario SSH', 'warning');
    return;
  }
  if (authMethod === 'password' && !password) {
    window.utils.showToast('Ingresa la contraseña SSH', 'warning');
    return;
  }
  if (authMethod === 'key' && !privateKey) {
    window.utils.showToast('Ingresa la llave SSH privada', 'warning');
    return;
  }

  // Determine docker network
  let dockerNetwork = null;
  const networkMode = document.getElementById('network-mode').value;
  if (networkMode === 'host') {
    dockerNetwork = 'host';
  } else if (networkMode === 'custom') {
    dockerNetwork = document.getElementById('custom-network').value.trim() || null;
  }

  // Build payload
  const payload = {
    host,
    port,
    username,
    auth_method: authMethod,
    central_url: centralUrl,
    docker_network: dockerNetwork
  };

  if (authMethod === 'password') {
    payload.password = password;
  } else {
    payload.private_key = privateKey;
  }

  // Show progress
  const progressDiv = document.getElementById('deployment-progress');
  const logsDiv = document.getElementById('deployment-logs');
  const progressFill = document.getElementById('progress-fill');
  
  progressDiv.classList.add('active');
  logsDiv.innerHTML = '';
  progressFill.style.width = '0%';

  function addLog(message, type = '') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = message;
    logsDiv.appendChild(line);
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }

  try {
    addLog(`🚀 Iniciando despliegue en ${host}...`, 'info');
    progressFill.style.width = '10%';

    // Call deploy API
    const result = await window.utils.api('/remote/deploy', {
      method: 'POST',
      body: payload
    });

    addLog('✅ Agente desplegado exitosamente', 'success');
    progressFill.style.width = '100%';

    window.utils.showToast('Agente desplegado exitosamente', 'success');

    // Call onDeploy callback
    if (onDeploy) {
      onDeploy(result);
    }

    // Close modal after short delay
    setTimeout(() => {
      closeDeployModal();
    }, 2000);

  } catch (error) {
    addLog(`❌ Error: ${error.message}`, 'error');
    window.utils.showToast(`Error al desplegar: ${error.message}`, 'danger');
  }
}

/**
 * Close deploy modal
 */
export function closeDeployModal() {
  const modal = document.getElementById('deploy-modal');
  if (modal) {
    modal.classList.remove('active');
  }

  // Reset form
  const form = document.getElementById('deploy-agent-form');
  if (form) {
    form.reset();
  }

  // Reset toggles
  window.toggleAuthMethod?.('password');
  window.toggleNetworkMode?.('bridge');

  // Hide progress
  const progressDiv = document.getElementById('deployment-progress');
  if (progressDiv) {
    progressDiv.classList.remove('active');
  }
}

/**
 * Open deploy modal
 */
export function openDeployModal() {
  const modal = document.getElementById('deploy-modal');
  if (modal) {
    modal.classList.add('active');
  }
}