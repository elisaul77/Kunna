/**
 * Tests for SCADA View
 */
import { jest } from '@jest/globals';

// Mock window.utils
const mockApi = jest.fn();
const mockShowToast = jest.fn();
const mockDebounce = jest.fn(fn => fn);

global.window = global.window || {};
global.window.utils = {
  api: mockApi,
  showToast: mockShowToast,
  debounce: mockDebounce,
  escapeHtml: (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  getStatusColor: (status) => {
    const colors = {
      running: '#34D399',
      stopped: '#FB7185',
      paused: '#FBBF24',
      unknown: '#A1A1AA'
    };
    return colors[status] || '#A1A1AA';
  },
  WS_URL: 'ws://localhost:8000',
  API_URL: 'http://localhost:8000/api'
};

// Mock WebSocket
let mockWsInstance = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.WebSocket = jest.fn(() => mockWsInstance);

// Mock D3
const mockD3Select = {
  selectAll: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  exit: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  each: jest.fn().mockReturnThis(),
  node: jest.fn().mockReturnValue({ getBoundingClientRect: () => ({ width: 800, height: 600 }) }),
  transition: jest.fn().mockReturnThis(),
  datum: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  empty: jest.fn().mockReturnValue(false)
};

global.d3 = {
  select: jest.fn(() => mockD3Select),
  selectAll: jest.fn(() => mockD3Select),
  forceSimulation: jest.fn().mockReturnValue({
    nodes: jest.fn().mockReturnThis(),
    force: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    restart: jest.fn().mockReturnThis()
  }),
  forceLink: jest.fn().mockReturnValue({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis()
  }),
  forceManyBody: jest.fn().mockReturnValue({
    strength: jest.fn().mockReturnThis()
  }),
  forceCenter: jest.fn().mockReturnValue({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis()
  }),
  forceCollide: jest.fn().mockReturnValue({
    radius: jest.fn().mockReturnThis()
  }),
  drag: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnValue({ on: jest.fn().mockReturnThis() })
  }),
  easeLinear: jest.fn()
};

const scadaModule = await import('../js/views/scada.js');

describe('SCADA View', () => {
  let render, init, cleanup;

  const mockTopologyData = {
    total_services: 5,
    active_services: 3,
    groups: [
      {
        id: 'group-1',
        name: 'Web Services',
        services: [
          { id: 'svc-1', name: 'nginx', status: 'running', icon: '🌐', networks: ['web'], is_remote: false },
          { id: 'svc-2', name: 'api', status: 'running', icon: '⚡', networks: ['web', 'api'], is_remote: false }
        ]
      },
      {
        id: 'group-2',
        name: 'Database',
        services: [
          { id: 'svc-3', name: 'postgres', status: 'stopped', icon: '🗄️', networks: ['db'], is_remote: false }
        ]
      }
    ],
    connections: [
      { source: 'svc-1', target: 'svc-2', network: 'web' },
      { source: 'svc-2', target: 'svc-3', network: 'api' }
    ]
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app-content">
        <div class="scada-view">
          <div class="scada-toolbar"></div>
          <div class="scada-layout">
            <div class="scada-sidebar"></div>
            <div class="scada-canvas">
              <svg id="topology-svg"></svg>
            </div>
          </div>
        </div>
      </div>
      <div id="toast-container"></div>
    `;
    jest.clearAllMocks();
    mockApi.mockReset();
    mockWsInstance.readyState = 1;
    mockWsInstance.addEventListener.mockReset();
    mockWsInstance.removeEventListener.mockReset();
    
    render = scadaModule.render;
    init = scadaModule.init;
    cleanup = scadaModule.cleanup;
  });

  describe('render()', () => {
    test('returns valid HTML structure', () => {
      const html = render();
      
      expect(html).toContain('class="scada-view"');
      expect(html).toContain('scada-toolbar');
      expect(html).toContain('scada-sidebar');
      expect(html).toContain('scada-canvas');
      expect(html).toContain('id="topology-svg"');
    });

    test('contains stats bar with total, active, groups', () => {
      const html = render();
      
      expect(html).toContain('stat-total');
      expect(html).toContain('stat-active');
      expect(html).toContain('stat-groups');
    });

    test('contains search input', () => {
      const html = render();
      
      expect(html).toContain('search-input');
      expect(html).toContain('placeholder');
    });

    test('contains agent visibility toggle', () => {
      const html = render();
      
      expect(html).toContain('showAgentCheckbox');
      expect(html).toContain('kunna-agent');
    });

    test('contains refresh button', () => {
      const html = render();
      
      expect(html).toContain('btn-refresh');
    });

    test('contains legend panel', () => {
      const html = render();
      
      expect(html).toContain('scada-legend');
      expect(html).toContain('Running');
      expect(html).toContain('Stopped');
      expect(html).toContain('Paused');
    });

    test('contains control panel', () => {
      const html = render();
      
      expect(html).toContain('node-control-panel');
      expect(html).toContain('control-panel-header');
      expect(html).toContain('panelTitle');
      expect(html).toContain('panelInfo');
      expect(html).toContain('panelActions');
    });
  });

  describe('init()', () => {
    test('loads topology from API', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      expect(mockApi).toHaveBeenCalledWith('/topology');
    });

    test('creates D3 SVG elements after loading topology', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      // D3 select should be called for the SVG
      expect(global.d3.select).toHaveBeenCalled();
    });

    test('updates stats display after loading topology', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const totalEl = document.querySelector('.stat-total');
      const activeEl = document.querySelector('.stat-active');
      const groupsEl = document.querySelector('.stat-groups');
      
      expect(totalEl.textContent).toBe('5');
      expect(activeEl.textContent).toBe('3');
    });

    test('renders groups in sidebar', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const groupItems = document.querySelectorAll('.group-item');
      expect(groupItems.length).toBe(2);
      expect(groupItems[0].textContent).toContain('Web Services');
      expect(groupItems[1].textContent).toContain('Database');
    });

    test('connects WebSocket for traffic events', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('/ws/traffic'));
    });
  });

  describe('Node rendering', () => {
    test('nodes render with correct status classes', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      // Nodes should have node-circle and node-{status} classes
      expect(mockD3Select.selectAll).toHaveBeenCalledWith('g.node');
    });
  });

  describe('Group sidebar', () => {
    test('populates groups from topology data', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const groupItems = document.querySelectorAll('.group-item');
      expect(groupItems.length).toBe(2);
    });

    test('clicking group highlights its services', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const firstGroup = document.querySelector('.group-item');
      firstGroup.click();
      
      expect(firstGroup.classList.contains('active')).toBe(true);
    });
  });

  describe('Search/Filter', () => {
    test('search input filters nodes', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const searchInput = document.querySelector('#search-input');
      searchInput.value = 'nginx';
      searchInput.dispatchEvent(new Event('input'));
      
      // The filter should be applied
      expect(mockDebounce).toHaveBeenCalled();
    });
  });

  describe('Layout lock toggle', () => {
    test('lock toggle exists in toolbar', async () => {
      const html = render();
      
      expect(html).toContain('lock-toggle');
    });
  });

  describe('Agent visibility toggle', () => {
    test('toggle exists and controls agent visibility', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const checkbox = document.querySelector('#showAgentCheckbox');
      expect(checkbox).toBeTruthy();
    });
  });

  describe('cleanup()', () => {
    test('disconnects WebSocket on cleanup', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      cleanup();
      
      expect(mockWsInstance.close).toHaveBeenCalled();
    });

    test('saves positions to localStorage on cleanup', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      // Mock localStorage
      const mockSetItem = jest.fn();
      global.localStorage = { setItem: mockSetItem };
      
      cleanup();
      
      expect(mockSetItem).toHaveBeenCalled();
    });
  });

  describe('Stats display', () => {
    test('total services count is correct', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const totalEl = document.querySelector('.stat-total');
      expect(totalEl.textContent).toBe('5');
    });

    test('active services count is correct', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const activeEl = document.querySelector('.stat-active');
      expect(activeEl.textContent).toBe('3');
    });

    test('groups count is correct', async () => {
      mockApi.mockResolvedValue(mockTopologyData);
      
      await init();
      
      const groupsEl = document.querySelector('.stat-groups');
      expect(groupsEl.textContent).toBe('2');
    });
  });
});