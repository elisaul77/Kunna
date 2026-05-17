/**
 * Service Card Component
 * Reusable glass card for displaying a service
 */

/**
 * Render a single service card
 * @param {Object} service - Service object
 * @param {string} service.id - Service ID
 * @param {string} service.name - Service name
 * @param {string} service.description - Service description
 * @param {string} service.url - Service URL
 * @param {string} service.status - Service status (running, stopped, error)
 * @param {string} service.category - Service category
 * @param {string} service.icon - Service icon (emoji)
 * @param {string} service.color - Accent color for card
 * @param {boolean} service.is_remote - Whether service is remote
 * @returns {string} HTML string
 */
export function renderServiceCard(service) {
  const {
    id,
    name = '',
    description = '',
    url = '',
    status = 'unknown',
    category = '',
    icon = '🔗',
    color = '#22D3EE',
    is_remote = false
  } = service;

  const escapedName = escapeHtml(name);
  const escapedDescription = escapeHtml(description);
  const escapedUrl = escapeHtml(url);

  // Status badge
  const statusBadge = getStatusBadge(status);
  
  // Category badge
  const categoryBadge = category ? `<span class="badge badge-category">${escapeHtml(category)}</span>` : '';
  
  // Remote badge
  const remoteBadge = is_remote ? '<span class="badge badge-remote">🌍 Remote</span>' : '';

  // Action buttons based on status
  const actionButtons = getActionButtons(service);

  return `
    <div class="service-card glass" style="--card-accent: ${color}" data-service-id="${id}">
      <div class="service-icon-display">${icon || '🔗'}</div>
      <div class="service-name">${escapedName}</div>
      <div class="service-badges">
        ${statusBadge}
        ${categoryBadge}
        ${remoteBadge}
      </div>
      ${escapedDescription ? `<div class="service-description">${escapedDescription}</div>` : ''}
      ${escapedUrl ? `<div class="service-url">${escapedUrl}</div>` : ''}
      <div class="service-actions">
        ${actionButtons}
      </div>
    </div>
  `;
}

/**
 * Get status badge HTML based on status
 * @param {string} status - Service status
 * @returns {string} HTML string
 */
function getStatusBadge(status) {
  const statusConfig = {
    running: { class: 'success', label: 'Running', icon: '▶' },
    stopped: { class: 'danger', label: 'Stopped', icon: '⏹' },
    error: { class: 'danger', label: 'Error', icon: '⚠' },
    unknown: { class: 'warning', label: 'Unknown', icon: '?' }
  };

  const config = statusConfig[status] || statusConfig.unknown;
  
  return `<span class="badge badge-${config.class} status-badge">${config.icon} ${config.label}</span>`;
}

/**
 * Get action buttons HTML based on service status
 * @param {Object} service - Service object
 * @returns {string} HTML string
 */
function getActionButtons(service) {
  const { status = 'unknown', id } = service;
  
  const buttons = [];

  // Edit button (always visible)
  buttons.push(`
    <button class="btn-action btn-edit" data-action="edit" data-service-id="${id}" title="Edit service">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  `);

  // Delete button (always visible)
  buttons.push(`
    <button class="btn-action btn-delete" data-action="delete" data-service-id="${id}" title="Delete service">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>
  `);

  // Start/Stop/Restart buttons based on status
  if (status === 'running') {
    buttons.push(`
      <button class="btn-action btn-stop" data-action="stop" data-service-id="${id}" title="Stop service">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="12" height="12"/>
        </svg>
      </button>
    `);
    buttons.push(`
      <button class="btn-action btn-restart" data-action="restart" data-service-id="${id}" title="Restart service">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    `);
  } else if (status === 'stopped' || status === 'error') {
    buttons.push(`
      <button class="btn-action btn-start" data-action="start" data-service-id="${id}" title="Start service">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </button>
    `);
  }

  return buttons.join('');
}

/**
 * Escape HTML to prevent XSS (delegates to utils)
 */
function escapeHtml(str) {
  return window.utils.escapeHtml(str);
}