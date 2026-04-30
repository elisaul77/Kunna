/**
 * Tests for Service Card Component
 */
import { jest } from '@jest/globals';

// Mock the utils module before importing service-card
jest.unstable_mockModule('../utils.js', () => ({
  escapeHtml: (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  getStatusColor: (status) => {
    const statusColors = {
      running: 'var(--accent)',
      stopped: 'var(--danger)',
      error: 'var(--danger)',
      unknown: 'var(--warning)'
    };
    return statusColors[status] || 'var(--warning)';
  }
}));

const { renderServiceCard } = await import('../components/service-card.js');

describe('Service Card Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('renderServiceCard', () => {
    test('renders running service card with correct classes', () => {
      const service = {
        id: '1',
        name: 'Test Service',
        description: 'A test service',
        url: 'http://localhost:3000',
        status: 'running',
        category: 'web',
        icon: '🌐',
        color: '#22D3EE'
      };

      const html = renderServiceCard(service);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const card = document.querySelector('.service-card');
      expect(card).not.toBeNull();
      expect(card.classList.contains('glass')).toBe(true);
      expect(card.style.getPropertyValue('--card-accent')).toBe('#22D3EE');
    });

    test('renders stopped service card with danger badge', () => {
      const service = {
        id: '2',
        name: 'Stopped Service',
        status: 'stopped',
        description: '',
        url: '',
        category: 'database'
      };

      const html = renderServiceCard(service);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const card = document.querySelector('.service-card');
      const badge = card.querySelector('.badge-danger, .status-badge.danger');
      expect(badge).not.toBeNull();
    });

    test('renders remote service with globe badge', () => {
      const service = {
        id: '3',
        name: 'Remote Service',
        status: 'running',
        is_remote: true,
        description: '',
        url: '',
        category: 'remote'
      };

      const html = renderServiceCard(service);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const card = document.querySelector('.service-card');
      const remoteBadge = card.querySelector('.badge-remote, .remote-badge');
      expect(remoteBadge).not.toBeNull();
    });

    test('card has correct accent color from service', () => {
      const service = {
        id: '4',
        name: 'Colored Service',
        status: 'running',
        color: '#A78BFA',
        description: '',
        url: ''
      };

      const html = renderServiceCard(service);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const card = document.querySelector('.service-card');
      expect(card.style.getPropertyValue('--card-accent')).toBe('#A78BFA');
    });

    test('action buttons render based on status', () => {
      const runningService = {
        id: '5',
        name: 'Running Service',
        status: 'running',
        description: '',
        url: ''
      };

      const html = renderServiceCard(runningService);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const actions = document.querySelector('.service-actions');
      expect(actions.innerHTML).toContain('stop');
      expect(actions.innerHTML).not.toContain('start');
    });

    test('stopped service shows start button', () => {
      const stoppedService = {
        id: '6',
        name: 'Stopped Service',
        status: 'stopped',
        description: '',
        url: ''
      };

      const html = renderServiceCard(stoppedService);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const actions = document.querySelector('.service-actions');
      expect(actions.innerHTML).toContain('start');
      expect(actions.innerHTML).not.toContain('stop');
    });

    test('XSS prevention in service name', () => {
      const maliciousService = {
        id: '7',
        name: '<script>alert("XSS")</script>',
        status: 'running',
        description: '',
        url: ''
      };

      const html = renderServiceCard(maliciousService);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const nameEl = document.querySelector('.service-name');
      expect(nameEl.innerHTML).not.toContain('<script>');
      expect(nameEl.textContent).toContain('<script>alert("XSS")</script>');
    });

    test('XSS prevention in service description', () => {
      const maliciousService = {
        id: '8',
        name: 'Service',
        status: 'running',
        description: '<img src=x onerror="alert(1)">',
        url: ''
      };

      const html = renderServiceCard(maliciousService);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const descEl = document.querySelector('.service-description');
      expect(descEl.innerHTML).not.toContain('<img');
      expect(descEl.textContent).toContain('<img src=x onerror="alert(1)">');
    });

    test('renders error state service card', () => {
      const errorService = {
        id: '9',
        name: 'Error Service',
        status: 'error',
        description: 'Something went wrong',
        url: ''
      };

      const html = renderServiceCard(errorService);
      document.body.innerHTML = `<div id="card-container">${html}</div>`;

      const badge = document.querySelector('.service-badges');
      expect(badge.innerHTML).toContain('error');
    });
  });
});