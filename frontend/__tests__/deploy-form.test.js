/**
 * Deploy Form Component Tests
 * Tests for the SSH deploy form component
 */

import { jest } from '@jest/globals';

// Mock window.utils
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

// Import deploy form module
import * as deployForm from '../js/components/deploy-form.js';

describe('Deploy Form Component', () => {
  let container;

  beforeEach(() => {
    mockApi.mockReset();
    mockShowToast.mockReset();
    
    container = document.createElement('div');
    container.id = 'deploy-form-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.remove();
    }
  });

  describe('renderDeployForm()', () => {
    it('should return a form element', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('<form');
      expect(html).toContain('id="deploy-agent-form"');
    });

    it('should include server IP input', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="server-ip"');
      expect(html).toContain('type="text"');
    });

    it('should include SSH port input', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="server-port"');
      expect(html).toContain('value="22"');
    });

    it('should include username input', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="server-user"');
    });

    it('should include auth method selector (password/key toggle)', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="auth-method"');
      expect(html).toContain('password');
      expect(html).toContain('key');
    });

    it('should include password field', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="server-password"');
      expect(html).toContain('type="password"');
    });

    it('should include SSH key textarea (hidden by default)', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="server-key"');
      expect(html).toContain('display: none');
    });

    it('should include central URL select', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="central-url"');
    });

    it('should include network mode selector', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="network-mode"');
      expect(html).toContain('bridge');
      expect(html).toContain('host');
      expect(html).toContain('custom');
    });

    it('should include custom network input (hidden by default)', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="custom-network"');
      expect(html).toContain('display: none');
    });

    it('should include deploy button', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('type="submit"');
      expect(html).toContain('Desplegar Agente');
    });

    it('should include progress section', () => {
      const html = deployForm.renderDeployForm();
      expect(html).toContain('id="deployment-progress"');
      expect(html).toContain('id="deployment-logs"');
      expect(html).toContain('id="progress-fill"');
    });
  });

  describe('initDeployForm()', () => {
    it('should setup auth method toggle', () => {
      container.innerHTML = deployForm.renderDeployForm();
      const cleanup = deployForm.initDeployForm(jest.fn());

      // Select key auth method
      document.getElementById('auth-method').value = 'key';
      document.getElementById('auth-method').dispatchEvent(new Event('change'));

      // Key group should be visible, password group hidden
      expect(document.getElementById('key-group').style.display).toBe('block');
      expect(document.getElementById('password-group').style.display).toBe('none');

      cleanup();
    });

    it('should show password field when password auth selected', () => {
      container.innerHTML = deployForm.renderDeployForm();
      const cleanup = deployForm.initDeployForm(jest.fn());

      document.getElementById('auth-method').value = 'password';
      document.getElementById('auth-method').dispatchEvent(new Event('change'));

      expect(document.getElementById('password-group').style.display).toBe('block');
      expect(document.getElementById('key-group').style.display).toBe('none');

      cleanup();
    });

    it('should setup network mode toggle', () => {
      container.innerHTML = deployForm.renderDeployForm();
      const cleanup = deployForm.initDeployForm(jest.fn());

      document.getElementById('network-mode').value = 'custom';
      document.getElementById('network-mode').dispatchEvent(new Event('change'));

      expect(document.getElementById('custom-network-group').style.display).toBe('block');

      cleanup();
    });

    it('should call loadAvailableIPs on init', () => {
      mockApi.mockResolvedValueOnce({ ips: [] });
      
      container.innerHTML = deployForm.renderDeployForm();
      deployForm.initDeployForm(jest.fn());

      expect(mockApi).toHaveBeenCalledWith('/system/ips');
    });

    it('should populate central URL select with IPs', async () => {
      mockApi.mockResolvedValueOnce({ 
        ips: [
          { address: '192.168.1.50', interface: 'eth0', type: 'LAN' },
          { address: '10.8.0.1', interface: 'wg0', type: 'VPN' }
        ]
      });

      container.innerHTML = deployForm.renderDeployForm();
      deployForm.initDeployForm(jest.fn());

      await new Promise(resolve => setTimeout(resolve, 50));

      const select = document.getElementById('central-url');
      expect(select.options.length).toBeGreaterThan(0);
      expect(select.innerHTML).toContain('192.168.1.50');

      cleanup();
    });

    it('should call onDeploy callback when form is submitted', async () => {
      const onDeploy = jest.fn();
      mockApi.mockResolvedValue({ success: true });

      container.innerHTML = deployForm.renderDeployForm();
      deployForm.initDeployForm(onDeploy);

      // Fill form
      document.getElementById('server-ip').value = '192.168.1.100';
      document.getElementById('server-user').value = 'admin';
      document.getElementById('server-port').value = '22';

      // Submit form
      const form = document.getElementById('deploy-agent-form');
      form.dispatchEvent(new Event('submit'));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onDeploy).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show toast if server IP is empty', () => {
      container.innerHTML = deployForm.renderDeployForm();
      const cleanup = deployForm.initDeployForm(jest.fn());

      const form = document.getElementById('deploy-agent-form');
      
      // Leave IP empty and try to submit
      form.dispatchEvent(new Event('submit'));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('IP'),
        'warning'
      );

      cleanup();
    });
  });
});