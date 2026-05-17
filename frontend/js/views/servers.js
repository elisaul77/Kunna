/**
 * Servers View
 * Remote servers management with glassmorphism styling
 */

import { renderDeployForm, initDeployForm, openDeployModal, closeDeployModal } from '../components/deploy-form.js';

// State
let servers = [];
let metrics = {};
let refreshInterval = null;

/**
 * Render servers view HTML
 * @returns {string} HTML string
 */
export function render() {
  return `
    <div class="servers-view">
      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-card">
          <span class="stat-icon">🖥️</span>
          <div class="stat-info">
            <span class="stat-value" id="stat-total">0</span>
            <span class="stat-label">Total Servidores</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🟢</span>
          <div class="stat-info">
            <span class="stat-value" id="stat-connected">0</span>
            <span class="stat-label">Conectados</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🐳</span>
          <div class="stat-info">
            <span class="stat-value" id="stat-containers">0</span>
            <span class="stat-label">Contenedores Remotos</span>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <h2>Mis Servidores</h2>
        <button class="btn btn-primary" id="btn-add-server" onclick="openServerModal()">
          ➕ Agregar Servidor
        </button>
      </div>

      <!-- Servers Container -->
      <div id="servers-container">
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando servidores...</p>
        </div>
      </div>

      <!-- Deploy Modal -->
      <div id="deploy-modal" class="deploy-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>🚀 Agregar Servidor Remoto</h2>
            <button class="modal-close" onclick="closeDeployModal()" aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          ${renderDeployForm()}
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize servers view
 */
export async function init() {
  // Setup deploy form
  const cleanupDeployForm = initDeployForm(handleDeploySuccess);

  // Expose modal functions on window for onclick handlers
  window.openServerModal = openServerModal;

  // Setup modal close handlers
  const modalCloseBtn = document.querySelector('#deploy-modal .modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeDeployModal);
  }
  const cancelBtn = document.querySelector('#deploy-modal .btn-secondary');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeDeployModal);
  }

  // Load data
  await loadServers();
  await loadMetrics();

  // Setup auto-refresh (10 seconds)
  refreshInterval = setInterval(async () => {
    await loadServers();
    await loadMetrics();
  }, 10000);

  // Return cleanup function
  return () => {
    cleanupDeployForm();
    cleanup();
  };
}

/**
 * Cleanup on view change
 */
export function cleanup() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/**
 * Load servers from API
 */
async function loadServers() {
  try {
    const data = await window.utils.api('/remote/servers');
    
    servers = data.servers || [];
    
    // Update stats
    updateStats(data.total || 0, data.connected || 0);
    
    // Render servers
    renderServers();
  } catch (error) {
    // Error loading servers - show error state
    renderErrorState();
  }
}

/**
 * Load metrics from API
 */
async function loadMetrics() {
  try {
    metrics = await window.utils.api('/remote/metrics');
    
    // Update containers stat
    const containersEl = document.getElementById('stat-containers');
    if (containersEl) {
      containersEl.textContent = metrics.total_containers || 0;
    }
  } catch (error) {
    // Metrics are optional, silently fail
  }
}

/**
 * Update stats display
 */
function updateStats(total, connected) {
  const totalEl = document.getElementById('stat-total');
  const connectedEl = document.getElementById('stat-connected');
  
  if (totalEl) totalEl.textContent = total;
  if (connectedEl) connectedEl.textContent = connected;
}

/**
 * Render servers list
 */
function renderServers() {
  const container = document.getElementById('servers-container');
  if (!container) return;

  if (servers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No hay servidores remotos</h3>
        <p>Agrega tu primer servidor para empezar a monitorear</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="servers-grid">
      ${servers.map(server => renderServerCard(server)).join('')}
    </div>
  `;

  // Setup remove buttons
  setupServerActions();
}

/**
 * Render a single server card
 */
function renderServerCard(server) {
  const statusClass = server.connected ? 'status-online' : 'status-offline';
  const statusIcon = server.connected ? '🟢' : '🔴';
  const statusText = server.connected ? 'Online' : 'Offline';
  const lastSeen = server.last_seen ? formatLastSeen(server.last_seen) : 'Nunca';

  return `
    <div class="server-card" data-server-id="${server.id}">
      <div class="server-header">
        <div class="server-info">
          <h3>
            ${statusIcon} ${window.utils.escapeHtml(server.hostname)}
          </h3>
          <div class="server-meta">
            <span>📍 ${window.utils.escapeHtml(server.ip)}</span>
            ${server.os ? `<span>💻 ${window.utils.escapeHtml(server.os)}</span>` : ''}
            ${server.docker_version ? `<span>🐳 ${window.utils.escapeHtml(server.docker_version)}</span>` : ''}
            <span>⏱️ ${lastSeen}</span>
          </div>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>

      ${server.metrics ? `
      <div class="server-metrics">
        <div class="metric">
          <div class="metric-value">${formatPercent(server.metrics.cpu_percent)}%</div>
          <div class="metric-label">CPU</div>
        </div>
        <div class="metric">
          <div class="metric-value">${formatPercent(server.metrics.memory_percent)}%</div>
          <div class="metric-label">RAM</div>
        </div>
        <div class="metric">
          <div class="metric-value">${formatPercent(server.metrics.disk_percent)}%</div>
          <div class="metric-label">Disk</div>
        </div>
        <div class="metric">
          <div class="metric-value">${server.containers_count || 0}</div>
          <div class="metric-label">Containers</div>
        </div>
      </div>
      ` : ''}

      <div class="server-actions">
        <button class="btn btn-secondary btn-view" data-action="view" data-id="${server.id}">
          👁️ Ver Detalles
        </button>
        ${!server.connected ? `
        <button class="btn btn-success btn-reconnect" data-action="reconnect" data-id="${server.id}">
          🔄 Reconectar
        </button>
        ` : ''}
        <button class="btn btn-danger btn-remove" data-action="remove" data-id="${server.id}">
          🗑️ Eliminar
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup server action handlers
 */
function setupServerActions() {
  const container = document.getElementById('servers-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const serverId = button.dataset.id;

    switch (action) {
      case 'view':
        viewServerDetails(serverId);
        break;
      case 'reconnect':
        reconnectServer(serverId);
        break;
      case 'remove':
        removeServer(serverId);
        break;
    }
  });
}

/**
 * View server details
 */
function viewServerDetails(serverId) {
  const server = servers.find(s => s.id === serverId);
  if (!server) return;

  window.utils.showToast(`Detalles de ${server.hostname} - Funcionalidad en desarrollo`, 'info');
}

/**
 * Reconnect to a server
 */
async function reconnectServer(serverId) {
  window.utils.showToast('Reconectando servidor...', 'info');
  
  try {
    await window.utils.api(`/remote/servers/${serverId}/reconnect`, { method: 'POST' });
    window.utils.showToast('Reconexión exitosa', 'success');
    await loadServers();
  } catch (error) {
    window.utils.showToast(`Error al reconectar: ${error.message}`, 'danger');
  }
}

/**
 * Remove a server
 */
async function removeServer(serverId) {
  const server = servers.find(s => s.id === serverId);
  if (!server) return;

  if (!confirm(`¿Eliminar servidor "${server.hostname}"?`)) {
    return;
  }

  try {
    await window.utils.api(`/remote/servers/${serverId}`, { method: 'DELETE' });
    window.utils.showToast('Servidor eliminado', 'success');
    await loadServers();
  } catch (error) {
    window.utils.showToast(`Error al eliminar: ${error.message}`, 'danger');
  }
}

/**
 * Handle successful deploy
 */
async function handleDeploySuccess(result) {
  window.utils.showToast('Agente desplegado exitosamente', 'success');
  await loadServers();
  await loadMetrics();
}

/**
 * Open server modal (alias for deploy modal)
 */
function openServerModal() {
  openDeployModal();
}

/**
 * Render error state
 */
function renderErrorState() {
  const container = document.getElementById('servers-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>Error cargando servidores</h3>
      <p>Verifica la conexión con el backend</p>
    </div>
  `;
}

/**
 * Format percent value
 */
function formatPercent(value) {
  if (value == null) return '0';
  return typeof value === 'number' ? value.toFixed(1) : '0';
}

/**
 * Format last seen time
 */
function formatLastSeen(isoString) {
  if (!isoString) return 'Nunca';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  
  return date.toLocaleDateString('es-ES');
}
