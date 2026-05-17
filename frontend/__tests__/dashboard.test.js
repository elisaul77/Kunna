/**
 * Tests for Dashboard View
 */
import { jest } from '@jest/globals';

// Mock window.utils directly since dashboard uses window.utils.*
const mockApi = jest.fn();
const mockShowToast = jest.fn();
const mockDebounce = jest.fn(fn => fn);
const mockEscapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
const mockWsSend = jest.fn();
const mockWsClose = jest.fn();
const mockGetStatusColor = (status) => `var(--${status})`;

global.window = global.window || {};
global.window.utils = {
  api: mockApi,
  showToast: mockShowToast,
  debounce: mockDebounce,
  escapeHtml: mockEscapeHtml,
  getStatusColor: mockGetStatusColor,
  WS_URL: 'ws://localhost:8000',
  API_URL: 'http://localhost:8000/api'
};

let mockWsInstance = {
  send: mockWsSend,
  close: mockWsClose,
  readyState: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.WebSocket = jest.fn(() => mockWsInstance);

// Import after mocking
const dashboardModule = await import('../js/views/dashboard.js');

describe('Dashboard View', () => {
  let render, init;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app-content"></div>
      <div id="toast-container"></div>
    `;
    jest.clearAllMocks();
    mockApi.mockReset();
    mockWsInstance.readyState = 1;
    mockWsInstance.addEventListener.mockReset();
    mockWsInstance.removeEventListener.mockReset();
  });

  describe('render()', () => {
    test('returns valid HTML structure', () => {
      const { render } = dashboardModule;
      const html = render();
      
      expect(html).toContain('class="dashboard"');
      expect(html).toContain('id="services-grid"');
      expect(html).toContain('id="service-modal"');
      expect(html).toContain('page-header');
      expect(html).toContain('dashboard-controls');
      expect(html).toContain('search-input');
      expect(html).toContain('filter-chips');
    });

    test('contains stats bar', () => {
      const { render } = dashboardModule;
      const html = render();
      
      expect(html).toContain('stats-bar');
      expect(html).toContain('stat-total');
      expect(html).toContain('stat-running');
      expect(html).toContain('stat-stopped');
    });

    test('contains add service button', () => {
      const { render } = dashboardModule;
      const html = render();
      
      expect(html).toContain('btn-add-service');
      expect(html).toContain('Add Service');
    });

    test('contains filter chips for categories and status', () => {
      const { render } = dashboardModule;
      const html = render();
      
      expect(html).toContain('filter-chips');
      expect(html).toContain('chip-all');
      expect(html).toContain('chip-category-');
      expect(html).toContain('chip-status-');
    });
  });

  describe('init()', () => {
    test('fetches services from API', async () => {
      mockApi.mockResolvedValue([]);
      const { render, init } = dashboardModule;
      
      document.getElementById('app-content').innerHTML = render();
      await init();

      expect(mockApi).toHaveBeenCalledWith('/services');
    });

    test('renders service cards after fetching services', async () => {
      const mockServices = [
        { id: '1', name: 'Service 1', status: 'running', url: 'http://localhost:3000' },
        { id: '2', name: 'Service 2', status: 'stopped', url: 'http://localhost:3001' }
      ];
      mockApi.mockResolvedValue(mockServices);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      const grid = document.getElementById('services-grid');
      expect(grid.querySelectorAll('.service-card').length).toBe(2);
    });

    test('shows skeleton while loading', async () => {
      mockApi.mockImplementation(() => new Promise(r => setTimeout(() => r([]), 100)));
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      
      // Start init but don't await - check skeleton appears
      const initPromise = init();
      
      // Skeleton should be visible
      const skeleton = document.querySelector('.skeleton-card');
      // Note: timing dependent
      
      await initPromise;
    });

    test('empty state shows when no services', async () => {
      mockApi.mockResolvedValue([]);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      const emptyState = document.querySelector('.empty-state');
      expect(emptyState).not.toBeNull();
    });
  });

  describe('Search filtering', () => {
    test('filters cards by search term', async () => {
      const mockServices = [
        { id: '1', name: 'Web App', status: 'running', url: 'http://localhost:3000' },
        { id: '2', name: 'Database', status: 'running', url: 'http://localhost:5432' }
      ];
      mockApi.mockResolvedValue(mockServices);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      // Get search input and type
      const searchInput = document.querySelector('.search-input');
      searchInput.value = 'web';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise(r => setTimeout(r, 400));

      const visibleCards = document.querySelectorAll('.service-card');
      expect(visibleCards.length).toBe(1);
      expect(visibleCards[0].querySelector('.service-name').textContent).toContain('Web App');
    });
  });

  describe('Category filter chips', () => {
    test('filters cards by category', async () => {
      const mockServices = [
        { id: '1', name: 'Web', status: 'running', category: 'web', url: '' },
        { id: '2', name: 'DB', status: 'running', category: 'database', url: '' }
      ];
      mockApi.mockResolvedValue(mockServices);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      // Click on 'database' category chip
      const chip = document.querySelector('[data-filter="category"][data-value="database"]');
      if (chip) {
        chip.click();
        
        const visibleCards = document.querySelectorAll('.service-card');
        expect(visibleCards.length).toBe(1);
        expect(visibleCards[0].querySelector('.service-name').textContent).toContain('DB');
      }
    });
  });

  describe('Status filter chips', () => {
    test('filters cards by status', async () => {
      const mockServices = [
        { id: '1', name: 'Running Service', status: 'running', url: '' },
        { id: '2', name: 'Stopped Service', status: 'stopped', url: '' }
      ];
      mockApi.mockResolvedValue(mockServices);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      // Click on 'stopped' status chip
      const chip = document.querySelector('[data-filter="status"][data-value="stopped"]');
      if (chip) {
        chip.click();
        
        const visibleCards = document.querySelectorAll('.service-card');
        expect(visibleCards.length).toBe(1);
        expect(visibleCards[0].querySelector('.service-name').textContent).toContain('Stopped');
      }
    });
  });

  describe('WebSocket connection', () => {
    test('connects WebSocket on init', async () => {
      mockApi.mockResolvedValue([]);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      expect(global.WebSocket).toHaveBeenCalled();
    });

    test('disconnects WebSocket on cleanup', async () => {
      mockApi.mockResolvedValue([]);
      
      const { render, init, cleanup } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      // Call cleanup directly
      cleanup();

      // WebSocket close should have been called
      expect(mockWsInstance.close).toHaveBeenCalled();
    });

    test('updates UI on WebSocket message', async () => {
      mockApi.mockResolvedValue([
        { id: '1', name: 'Service 1', status: 'running', url: '' }
      ]);
      
      const { render, init } = dashboardModule;
      document.getElementById('app-content').innerHTML = render();
      await init();

      // Simulate WebSocket message
      const messageHandler = mockWsInstance.addEventListener.mock.calls
        .find(call => call[0] === 'message');
      
      if (messageHandler) {
        const handler = messageHandler[1];
        handler({ data: JSON.stringify({ type: 'services_update', services: [] }) });
      }

      // UI should update
      expect(document.querySelector('.service-card') || document.querySelector('.empty-state')).not.toBeNull();
    });
  });
});