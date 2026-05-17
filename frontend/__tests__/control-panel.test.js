/**
 * Tests for Control Panel Component
 */
import { jest } from '@jest/globals';

// Mock window.utils
const mockApi = jest.fn();
const mockShowToast = jest.fn();

global.window = global.window || {};
global.window.utils = {
  api: mockApi,
  showToast: mockShowToast,
  getStatusColor: (status) => {
    const colors = {
      running: '#34D399',
      stopped: '#FB7185',
      paused: '#FBBF24',
      unknown: '#A1A1AA'
    };
    return colors[status] || '#A1A1AA';
  }
};

const controlPanelModule = await import('../js/components/control-panel.js');

describe('Control Panel Component', () => {
  let showControlPanel, closeControlPanel, updatePanelInfo;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app-content"></div>
      <div id="toast-container"></div>
    `;
    jest.clearAllMocks();
    
    showControlPanel = controlPanelModule.showControlPanel;
    closeControlPanel = controlPanelModule.closeControlPanel;
    updatePanelInfo = controlPanelModule.updatePanelInfo;
  });

  describe('showControlPanel(node)', () => {
    test('creates panel in DOM', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123',
        server_hostname: 'server1',
        networks: ['network1', 'network2']
      };

      showControlPanel(mockNode);

      const panel = document.querySelector('.node-control-panel');
      expect(panel).toBeTruthy();
      expect(panel.classList.contains('visible')).toBe(true);
    });

    test('displays node name as title', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'My Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);

      const title = document.querySelector('#panelTitle');
      expect(title.textContent).toBe('My Test Service');
    });

    test('displays node status with correct color', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);

      const info = document.querySelector('#panelInfo');
      expect(info.innerHTML).toContain('RUNNING');
    });

    test('displays server hostname when node is remote', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123',
        server_hostname: 'remote-server',
        is_remote: true
      };

      showControlPanel(mockNode);

      const info = document.querySelector('#panelInfo');
      expect(info.innerHTML).toContain('remote-server');
    });

    test('displays networks when available', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123',
        networks: ['web-network', 'db-network']
      };

      showControlPanel(mockNode);

      const info = document.querySelector('#panelInfo');
      expect(info.innerHTML).toContain('web-network');
      expect(info.innerHTML).toContain('db-network');
    });

    test('shows action buttons when container_id exists', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);

      const actions = document.querySelector('#panelActions');
      expect(actions.innerHTML).toContain('start');
      expect(actions.innerHTML).toContain('stop');
      expect(actions.innerHTML).toContain('restart');
    });

    test('shows read-only message when no container_id', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running'
      };

      showControlPanel(mockNode);

      const actions = document.querySelector('#panelActions');
      expect(actions.innerHTML).toContain('readonly');
    });
  });

  describe('closeControlPanel()', () => {
    test('removes visible class from panel', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);
      expect(document.querySelector('.node-control-panel').classList.contains('visible')).toBe(true);

      closeControlPanel();

      expect(document.querySelector('.node-control-panel').classList.contains('visible')).toBe(false);
    });

    test('hides panel from DOM', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);
      closeControlPanel();

      const panel = document.querySelector('.node-control-panel');
      expect(panel.classList.contains('visible')).toBe(false);
    });
  });

  describe('updatePanelInfo(node)', () => {
    test('updates panel title with new node name', () => {
      const mockNode1 = {
        id: 'test-node-1',
        name: 'First Service',
        status: 'running',
        container_id: 'abc123'
      };

      const mockNode2 = {
        id: 'test-node-2',
        name: 'Second Service',
        status: 'stopped',
        container_id: 'def456'
      };

      showControlPanel(mockNode1);
      updatePanelInfo(mockNode2);

      const title = document.querySelector('#panelTitle');
      expect(title.textContent).toBe('Second Service');
    });

    test('updates status display', () => {
      const mockNode1 = {
        id: 'test-node-1',
        name: 'First Service',
        status: 'running',
        container_id: 'abc123'
      };

      const mockNode2 = {
        id: 'test-node-2',
        name: 'Second Service',
        status: 'stopped',
        container_id: 'def456'
      };

      showControlPanel(mockNode1);
      updatePanelInfo(mockNode2);

      const info = document.querySelector('#panelInfo');
      expect(info.innerHTML).toContain('STOPPED');
    });
  });

  describe('Action buttons', () => {
    test('start button is disabled when status is running', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'running',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);

      const startBtn = document.querySelector('.control-btn.start');
      expect(startBtn.disabled).toBe(true);
    });

    test('stop button is disabled when status is not running', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'stopped',
        container_id: 'abc123'
      };

      showControlPanel(mockNode);

      const stopBtn = document.querySelector('.control-btn.stop');
      expect(stopBtn.disabled).toBe(true);
    });

    test('start button calls correct API endpoint', () => {
      const mockNode = {
        id: 'test-node-1',
        name: 'Test Service',
        status: 'stopped',
        container_id: 'abc123'
      };

      mockApi.mockResolvedValue({ message: 'Container started' });
      showControlPanel(mockNode);

      const startBtn = document.querySelector('.control-btn.start');
      startBtn.click();

      expect(mockApi).toHaveBeenCalledWith('/containers/abc123/start', { method: 'POST' });
    });
  });
});