/**
 * kuNNA Control Panel Component
 * Reusable panel for displaying container info and actions
 */

/**
 * Show the control panel with node information
 * @param {Object} node - Node data object
 */
export function showControlPanel(node) {
  const panel = document.querySelector('.node-control-panel');
  if (!panel) return;

  const panelTitle = document.querySelector('#panelTitle');
  const panelInfo = document.querySelector('#panelInfo');
  const panelActions = document.querySelector('#panelActions');

  // Title
  panelTitle.textContent = node.name;

  // Info
  const statusColor = window.utils.getStatusColor(node.status) || '#A1A1AA';
  const serverInfo = node.server_hostname 
    ? `<p><strong>Servidor:</strong> ${window.utils.escapeHtml(node.server_hostname)}</p>` 
    : '';
  const networksInfo = node.networks && node.networks.length > 0 
    ? `<p><strong>Redes:</strong> ${node.networks.map(n => window.utils.escapeHtml(n)).join(', ')}</p>` 
    : '';

  panelInfo.innerHTML = `
    <p><strong>Estado:</strong> <span style="color: ${statusColor}">${node.status.toUpperCase()}</span></p>
    <p><strong>ID:</strong> ${window.utils.escapeHtml(node.id)}</p>
    ${serverInfo}
    ${networksInfo}
  `;

  // Actions
  const isRunning = node.status === 'running';
  const containerId = node.container_id || (node.id && node.id.startsWith('remote-') ? node.id : null);
  
  if (containerId) {
    panelActions.innerHTML = `
      <button class="control-btn start" data-action="start" data-container="${window.utils.escapeHtml(containerId)}" ${isRunning ? 'disabled' : ''}>
        ▶️ Iniciar
      </button>
      <button class="control-btn stop" data-action="stop" data-container="${window.utils.escapeHtml(containerId)}" ${!isRunning ? 'disabled' : ''}>
        ⏹️ Detener
      </button>
      <button class="control-btn restart" data-action="restart" data-container="${window.utils.escapeHtml(containerId)}">
        🔄 Reiniciar
      </button>
    `;
  } else {
    panelActions.innerHTML = `<p style="opacity: 0.8; font-size: 12px; margin: 0;">Sin contenedor asociado (solo lectura)</p>`;
  }

  panel.classList.add('visible');
}

// Event delegation for buttons - attach to document body once
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;

    const action = btn.dataset.action;
    const cid = btn.dataset.container;

    if (action === 'start') window.controlPanelActions.start(cid);
    else if (action === 'stop') window.controlPanelActions.stop(cid);
    else if (action === 'restart') window.controlPanelActions.restart(cid);
  });
}

/**
 * Close the control panel
 */
export function closeControlPanel() {
  const panel = document.querySelector('.node-control-panel');
  if (panel) {
    panel.classList.remove('visible');
  }
}

/**
 * Update panel info with new node data
 * @param {Object} node - Updated node data
 */
export function updatePanelInfo(node) {
  showControlPanel(node);
}

/**
 * Action handlers - attached to window for onclick access
 */
window.controlPanelActions = {
  async start(containerId) {
    try {
      const data = await window.utils.api(`/containers/${containerId}/start`, { method: 'POST' });
      window.utils.showToast(data.message || 'Contenedor iniciado', 'success');
      closeControlPanel();
      // Trigger refresh if callback provided
      if (window.onControlPanelActionComplete) {
        window.onControlPanelActionComplete();
      }
    } catch (error) {
      window.utils.showToast(`Error al iniciar: ${error.message}`, 'danger');
    }
  },

  async stop(containerId) {
    if (!confirm('¿Estás seguro de detener este contenedor?')) return;
    
    try {
      const data = await window.utils.api(`/containers/${containerId}/stop`, { method: 'POST' });
      window.utils.showToast(data.message || 'Contenedor detenido', 'success');
      closeControlPanel();
      if (window.onControlPanelActionComplete) {
        window.onControlPanelActionComplete();
      }
    } catch (error) {
      window.utils.showToast(`Error al detener: ${error.message}`, 'danger');
    }
  },

  async restart(containerId) {
    if (!confirm('¿Estás seguro de reiniciar este contenedor?')) return;
    
    try {
      const data = await window.utils.api(`/containers/${containerId}/restart`, { method: 'POST' });
      window.utils.showToast(data.message || 'Contenedor reiniciado', 'success');
      closeControlPanel();
      if (window.onControlPanelActionComplete) {
        window.onControlPanelActionComplete();
      }
    } catch (error) {
      window.utils.showToast(`Error al reiniciar: ${error.message}`, 'danger');
    }
  }
};