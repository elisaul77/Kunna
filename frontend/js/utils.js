/**
 * kuNNA Frontend Utilities
 * Toast notifications, API wrapper, debounce, formatters
 */

// Constants
const BACKEND_HOST = window.location.hostname || 'localhost';
const BACKEND_HTTP = `http://${BACKEND_HOST}:8000`;
const API_URL = BACKEND_HTTP + '/api';
const WS_URL = `ws://${BACKEND_HOST}:8000`;

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'info', 'success', 'danger', 'warning'
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.animation = 'toastIn 0.3s ease';
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * API fetch wrapper
 * @param {string} path - API path (will be prepended with API_URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} On HTTP error
 */
async function api(path, options = {}) {
  const url = API_URL + path;
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (options.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${errorData.detail || response.statusText}`);
  }

  return response.json();
}

/**
 * Debounce utility
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Format date string
 * @param {string} isoString - ISO date string
 * @param {string} format - Format type: 'datetime', 'time', 'date' (default 'datetime')
 * @returns {string} Formatted date string
 */
function formatDate(isoString, format = 'datetime') {
  if (!isoString) return '';

  const date = new Date(isoString);

  if (format === 'time') {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  if (format === 'date') {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // datetime
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get CSS variable for status color
 * @param {string} status - Status: 'running', 'stopped', 'error', 'unknown'
 * @returns {string} CSS variable name
 */
function getStatusColor(status) {
  const statusColors = {
    running: 'var(--accent)',
    stopped: 'var(--danger)',
    error: 'var(--danger)',
    unknown: 'var(--warning)'
  };
  return statusColors[status] || 'var(--warning)';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export for ES modules, fallback to global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BACKEND_HOST,
    BACKEND_HTTP,
    API_URL,
    WS_URL,
    showToast,
    api,
    debounce,
    formatDate,
    getStatusColor,
    escapeHtml
  };
} else {
  window.utils = {
    BACKEND_HOST,
    BACKEND_HTTP,
    API_URL,
    WS_URL,
    showToast,
    api,
    debounce,
    formatDate,
    getStatusColor,
    escapeHtml
  };
}
