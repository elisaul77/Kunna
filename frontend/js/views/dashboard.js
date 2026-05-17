/**
 * Dashboard View
 * Main services gallery with glassmorphism cards, search, filters, and CRUD
 */
import { showModal, closeModal } from '../components/modal.js';
import { renderServiceCard } from '../components/service-card.js';

// State
let services = [];
let filteredServices = [];
let ws = null;
let searchDebounceTimer = null;

// DOM References
let servicesGrid = null;
let searchInput = null;
let categoryChips = [];
let statusChips = [];

/**
 * Render dashboard HTML
 * @returns {string} HTML string
 */
export function render() {
  return `
    <div class="dashboard">
      <!-- Page Header -->
      <div class="page-header">
        <h2>Services</h2>
        <div class="stats-bar">
          <div class="stat-card stat-total">
            <span class="stat-icon">📊</span>
            <div class="stat-info">
              <span class="stat-value" id="stat-total">0</span>
              <span class="stat-label">Total</span>
            </div>
          </div>
          <div class="stat-card stat-running">
            <span class="stat-icon">▶</span>
            <div class="stat-info">
              <span class="stat-value" id="stat-running">0</span>
              <span class="stat-label">Running</span>
            </div>
          </div>
          <div class="stat-card stat-stopped">
            <span class="stat-icon">⏹</span>
            <div class="stat-info">
              <span class="stat-value" id="stat-stopped">0</span>
              <span class="stat-label">Stopped</span>
            </div>
          </div>
          <div class="stat-card stat-error">
            <span class="stat-icon">⚠</span>
            <div class="stat-info">
              <span class="stat-value" id="stat-error">0</span>
              <span class="stat-label">Error</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="dashboard-controls">
        <div class="search-container">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="search-input" id="search-input" placeholder="Search services...">
        </div>
        
        <div class="filter-chips" id="category-filters">
          <span class="filter-label">Category:</span>
          <button class="chip chip-all chip-active" data-filter="category" data-value="all">All</button>
        </div>
        
        <div class="filter-chips" id="status-filters">
          <span class="filter-label">Status:</span>
          <button class="chip chip-all chip-active" data-filter="status" data-value="all">All</button>
          <button class="chip" data-filter="status" data-value="running">Running</button>
          <button class="chip" data-filter="status" data-value="stopped">Stopped</button>
          <button class="chip" data-filter="status" data-value="error">Error</button>
        </div>
        
        <button class="btn btn-primary btn-add-service" id="btn-add-service">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Service
        </button>
      </div>

      <!-- Services Grid -->
      <div class="services-grid" id="services-grid">
        <!-- Skeleton loading or service cards will be rendered here -->
      </div>

      <!-- Modal Container -->
      <div id="service-modal"></div>
    </div>
  `;
}

/**
 * Initialize dashboard view
 */
export async function init() {
  // Get DOM references
  servicesGrid = document.getElementById('services-grid');
  searchInput = document.getElementById('search-input');
  
  // Show loading state
  renderSkeletons();
  
  // Fetch services
  try {
    services = await api('/services');
    filteredServices = [...services];
    updateStats();
    renderServices();
  } catch (error) {
    services = [];
    filteredServices = [];
    renderEmptyState();
  }
  
  // Setup dynamic category filters
  setupCategoryFilters();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup WebSocket
  setupWebSocket();
}

/**
 * Setup category filter chips dynamically based on available categories
 */
function setupCategoryFilters() {
  const categories = [...new Set(services.map(s => s.category).filter(Boolean))];
  const container = document.getElementById('category-filters');
  
  // Clear existing category chips (keep "All")
  const allChip = container.querySelector('.chip-all');
  container.innerHTML = '';
  container.appendChild(allChip);
  
  // Add category chips
  categories.forEach(category => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.filter = 'category';
    chip.dataset.value = category;
    chip.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    container.appendChild(chip);
  });
  
  categoryChips = container.querySelectorAll('.chip');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input with debounce
  searchInput.addEventListener('input', debounce((e) => {
    filterServices();
  }, 300));
  
  // Category filter chips
  document.getElementById('category-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      setActiveChip(e.target, 'category');
      filterServices();
    }
  });
  
  // Status filter chips
  document.getElementById('status-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      setActiveChip(e.target, 'status');
      filterServices();
    }
  });
  
  // Add service button
  document.getElementById('btn-add-service').addEventListener('click', () => {
    openServiceModal();
  });
  
  // Service card actions (event delegation)
  servicesGrid.addEventListener('click', handleCardAction);
}

/**
 * Set active chip in a filter group
 */
function setActiveChip(chip, filterType) {
  const container = filterType === 'category' 
    ? document.getElementById('category-filters')
    : document.getElementById('status-filters');
  
  container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
}

/**
 * Filter services based on search and active filters
 */
function filterServices() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  // Get active category filter
  const activeCategory = document.querySelector('#category-filters .chip.active')?.dataset.value || 'all';
  
  // Get active status filter
  const activeStatus = document.querySelector('#status-filters .chip.active')?.dataset.value || 'all';
  
  filteredServices = services.filter(service => {
    // Search filter
    const matchesSearch = !searchTerm || 
      service.name.toLowerCase().includes(searchTerm) ||
      (service.description || '').toLowerCase().includes(searchTerm) ||
      (service.url || '').toLowerCase().includes(searchTerm);
    
    // Category filter
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    
    // Status filter
    const matchesStatus = activeStatus === 'all' || service.status === activeStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  renderServices();
  updateStats();
}

/**
 * Render services grid
 */
function renderServices() {
  if (filteredServices.length === 0) {
    if (services.length === 0) {
      renderEmptyState();
    } else {
      renderNoResultsState();
    }
    return;
  }
  
  const html = filteredServices.map(service => renderServiceCard(service)).join('');
  servicesGrid.innerHTML = html;
}

/**
 * Render skeleton loading cards
 */
function renderSkeletons() {
  const skeletons = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-badge"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `).join('');
  
  servicesGrid.innerHTML = skeletons;
}

/**
 * Render empty state (no services at all)
 */
function renderEmptyState() {
  servicesGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <h3 class="empty-state-title">No services yet</h3>
      <p class="empty-state-description">Add your first service to start monitoring your containers.</p>
      <button class="btn btn-primary" onclick="document.getElementById('btn-add-service').click()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Service
      </button>
    </div>
  `;
}

/**
 * Render no results state (search/filter returned nothing)
 */
function renderNoResultsState() {
  servicesGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <h3 class="empty-state-title">No services found</h3>
      <p class="empty-state-description">Try adjusting your search or filters to find what you're looking for.</p>
      <button class="btn btn-secondary" id="btn-clear-filters">Clear Filters</button>
    </div>
  `;
  
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    searchInput.value = '';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#category-filters .chip-all, #status-filters .chip-all').forEach(c => c.classList.add('active'));
    filterServices();
  });
}


/**
 * Update stats bar with service counts
 */
function updateStats() {
  const total = services.length;
  const running = services.filter(s => s.status === 'running').length;
  const stopped = services.filter(s => s.status === 'stopped').length;
  const error = services.filter(s => s.status === 'error').length;
  
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-running').textContent = running;
  document.getElementById('stat-stopped').textContent = stopped;
  document.getElementById('stat-error').textContent = error;
}

/**
 * Open service modal for create/edit
 */
function openServiceModal(service = null) {
  const isEdit = !!service;
  const title = isEdit ? 'Edit Service' : 'Add Service';
  
  const formContent = `
    <form id="service-form">
      <input type="hidden" name="id" value="${service?.id || ''}">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" required value="${escapeHtml(service?.name || '')}" placeholder="My Service">
      </div>
      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" placeholder="Service description...">${escapeHtml(service?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="url">URL</label>
        <input type="text" id="url" name="url" value="${escapeHtml(service?.url || '')}" placeholder="http://localhost:3000">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="icon">Icon</label>
          <input type="text" id="icon" name="icon" value="${service?.icon || '🔗'}" placeholder="🔗">
        </div>
        <div class="form-group">
          <label for="category">Category</label>
          <input type="text" id="category" name="category" value="${escapeHtml(service?.category || '')}" placeholder="web, api, db...">
        </div>
      </div>
      <div class="form-group">
        <label for="color">Color</label>
        <input type="color" id="color" name="color" value="${service?.color || '#22D3EE'}" style="height: 44px; padding: 4px;">
      </div>
    </form>
  `;
  
  showModal(title, formContent, async (formData) => {
    try {
      if (isEdit) {
        await api(`/services/${service.id}`, {
          method: 'PUT',
          body: formData
        });
        showToast('Service updated successfully', 'success');
      } else {
        await api('/services', {
          method: 'POST',
          body: formData
        });
        showToast('Service added successfully', 'success');
      }
      
      // Refresh services
      services = await api('/services');
      filteredServices = [...services];
      setupCategoryFilters();
      filterServices();
      updateStats();
    } catch (error) {
      showToast(`Failed to save service: ${error.message}`, 'danger');
    }
  });
}

/**
 * Handle card action button clicks
 */
async function handleCardAction(e) {
  const button = e.target.closest('.btn-action');
  if (!button) return;
  
  const action = button.dataset.action;
  const serviceId = button.dataset.serviceId;
  const service = services.find(s => s.id === serviceId);
  
  if (!service) return;
  
  switch (action) {
    case 'edit':
      openServiceModal(service);
      break;
    case 'delete':
      if (confirm(`Are you sure you want to delete "${service.name}"?`)) {
        await deleteService(serviceId);
      }
      break;
    case 'start':
      await updateServiceStatus(serviceId, 'start');
      break;
    case 'stop':
      await updateServiceStatus(serviceId, 'stop');
      break;
    case 'restart':
      await updateServiceStatus(serviceId, 'restart');
      break;
  }
}

/**
 * Delete a service
 */
async function deleteService(serviceId) {
  try {
    await api(`/services/${serviceId}`, { method: 'DELETE' });
    showToast('Service deleted', 'success');
    
    services = services.filter(s => s.id !== serviceId);
    filteredServices = filteredServices.filter(s => s.id !== serviceId);
    setupCategoryFilters();
    filterServices();
    updateStats();
  } catch (error) {
    // Error already shown via toast in api() wrapper
  }
}

/**
 * Update service status (start/stop/restart)
 */
async function updateServiceStatus(serviceId, action) {
  try {
    await api(`/services/${serviceId}/${action}`, { method: 'POST' });
    showToast(`Service ${action}ed successfully`, 'success');
    
    // Refresh services to get updated status
    services = await api('/services');
    filteredServices = [...services];
    setupCategoryFilters();
    filterServices();
    updateStats();
  } catch (error) {
    // Error already shown via toast in api() wrapper
  }
}

/**
 * Setup WebSocket connection for real-time updates
 */
function setupWebSocket() {
  if (ws) {
    ws.close();
  }
  
  try {
    ws = new WebSocket(`${WS_URL}/ws/traffic`);
    
    ws.addEventListener('open', () => {
      updateConnectionStatus(true);
    });
    
    ws.addEventListener('close', () => {
      updateConnectionStatus(false);
      // Attempt reconnect after 5 seconds
      setTimeout(setupWebSocket, 5000);
    });
    
    ws.addEventListener('error', () => {
      updateConnectionStatus(false);
    });
    
    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'services_update' || data.type === 'service_update') {
          // Refresh services list
          services = await api('/services');
          filteredServices = [...services];
          setupCategoryFilters();
          filterServices();
          updateStats();
        } else if (data.type === 'traffic') {
          // Handle traffic events (could be used for SCADA view)
          // For dashboard, we just acknowledge
        }
      } catch (error) {
        // Silently ignore message parse errors
      }
    });
  } catch (error) {
    // WebSocket connection failed
    updateConnectionStatus(false);
  }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
  const dot = document.getElementById('connection-dot');
  const text = document.getElementById('connection-text');
  
  if (dot && text) {
    dot.style.backgroundColor = connected ? 'var(--success)' : 'var(--danger)';
    text.textContent = connected ? 'Connected' : 'Disconnected';
  }
}

/**
 * Cleanup function called when navigating away
 */
export function cleanup() {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Clear debounce timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
}

// Import utilities (using dynamic import from utils.js)
// Note: These are expected to be available globally from the script loader
function api(path, options = {}) {
  return window.utils.api(path, options);
}

function showToast(message, type = 'info') {
  return window.utils.showToast(message, type);
}

function debounce(fn, delay = 300) {
  return window.utils.debounce(fn, delay);
}

function escapeHtml(str) {
  return window.utils.escapeHtml(str);
}

const WS_URL = window.utils.WS_URL;
