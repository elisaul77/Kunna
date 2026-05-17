/**
 * Servers View Tests
 * Tests for the remote servers management view
 */

import { jest } from '@jest/globals';

// Mock window.utils before importing the view
const mockShowToast = jest.fn();
const mockApi = jest.fn();

global.window = {
  ...global.window,
  utils: {
    api: mockApi,
    showToast: mockShowToast,
    escapeHtml: (str) => str?.replace(/</g, '&lt;')?.replace(/>/g, '&gt;') || ''
  }
};

// Import the servers view module
import * as serversView from '../js/views/servers.js';

describe('Servers View', () => {
  let container;

  beforeEach(() => {
    // Reset mocks
    mockApi.mockReset();
    mockShowToast.mockReset();
    
    // Create container
    container = document.createElement('div');
    container.id = 'app-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.remove();
    }
    serversView.cleanup();
  });

  describe('render()', () => {
    it('should return a string containing servers-view container', () => {
      const html = serversView.render();
      expect(html).toContain('class="servers-view"');
    });

    it('should include stats bar with 3 stat cards', () => {
      const html = serversView.render();
      expect(html).toContain('class="stats-bar"');
      expect(html).toMatch(/stat-card.*Total Servidores/);
      expect(html).toMatch(/stat-card.*Conectados/);
      expect(html).toMatch(/stat-card.*Contenedores Remotos/);
    });

    it('should include servers grid container', () => {
      const html = serversView.render();
      expect(html).toContain('class="servers-grid"');
    });

    it('should include add server button', () => {
      const html = serversView.render();
      expect(html).toContain('id="btn-add-server"');
    });

    it('should include deploy modal', () => {
      const html = serversView.render();
      expect(html).toContain('id="deploy-modal"');
    });
  });

  describe('init()', () => {
    it('should fetch servers from API', async () => {
      mockApi.mockResolvedValueOnce({ 
        servers: [], 
        total: 0, 
        connected: 0 
      });
      mockApi.mockResolvedValueOnce({ 
        total_containers: 0 
      });

      serversView.init();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApi).toHaveBeenCalledWith('/remote/servers');
    });

    it('should fetch metrics from API', async () => {
      mockApi.mockResolvedValueOnce({ 
        servers: [], 
        total: 0, 
        connected: 0 
      });
      mockApi.mockResolvedValueOnce({ 
        total_containers: 0 
      });

      serversView.init();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApi).toHaveBeenCalledWith('/remote/metrics');
    });

    it('should show loading state initially', async () => {
      mockApi.mockResolvedValueOnce({ 
        servers: [], 
        total: 0, 
        connected: 0 
      });
      mockApi.mockResolvedValueOnce({ 
        total_containers: 0 
      });

      serversView.init();
      
      const container = document.getElementById('app-content');
      expect(container.innerHTML).toContain('loading');
    });
  });

  describe('cleanup()', () => {
    it('should clear auto-refresh interval', () => {
      jest.useFakeTimers();
      
      mockApi.mockResolvedValue({ servers: [], total: 0, connected: 0 });
      
      serversView.init();
      serversView.cleanup();
      
      // If cleanup works, no errors should occur on next interval
      jest.advanceTimersByTime(11000);
      
      jest.useRealTimers();
    });
  });

  describe('Server card rendering', () => {
    it('should render server cards with hostname and status', async () => {
      const mockServers = {
        servers: [
          { 
            id: 'srv-1', 
            hostname: 'web-server-1', 
            ip: '192.168.1.100',
            connected: true,
            os: 'Ubuntu 22.04',
            docker_version: '24.0.0',
            containers_count: 5
          }
        ],
        total: 1,
        connected: 1
      };
      
      mockApi.mockResolvedValueOnce(mockServers);
      mockApi.mockResolvedValueOnce({ total_containers: 10 });

      serversView.init();
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById('app-content');
      expect(container.innerHTML).toContain('web-server-1');
      expect(container.innerHTML).toContain('192.168.1.100');
      expect(container.innerHTML).toContain('status-online');
    });

    it('should render offline status for disconnected servers', async () => {
      const mockServers = {
        servers: [
          { 
            id: 'srv-1', 
            hostname: 'offline-server', 
            ip: '192.168.1.101',
            connected: false,
            last_seen: '2024-01-01T12:00:00Z'
          }
        ],
        total: 1,
        connected: 0
      };
      
      mockApi.mockResolvedValueOnce(mockServers);
      mockApi.mockResolvedValueOnce({ total_containers: 0 });

      serversView.init();
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById('app-content');
      expect(container.innerHTML).toContain('status-offline');
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no servers', async () => {
      mockApi.mockResolvedValueOnce({ servers: [], total: 0, connected: 0 });
      mockApi.mockResolvedValueOnce({ total_containers: 0 });

      serversView.init();
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById('app-content');
      expect(container.innerHTML).toContain('empty-state');
      expect(container.innerHTML).toContain('No hay servidores');
    });
  });
});