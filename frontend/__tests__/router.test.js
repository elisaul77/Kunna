/**
 * Tests for router.js - kuNNA SPA Router
 * Run with: node __tests__/router.test.js
 */

// Mock DOM environment
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body><nav id="nav"><a href="/" data-route="/">Dashboard</a><a href="/scada" data-route="/scada">SCADA</a></nav><main id="app-content"></main></body></html>', { url: 'http://localhost/' });
global.document = dom.window.document;
global.window = dom.window;
global.history = dom.window.history;
global.location = dom.window.location;

const BACKEND_HOST = 'localhost';
const BACKEND_HTTP = 'http://localhost:8000';
const API_URL = BACKEND_HTTP + '/api';
const WS_URL = 'ws://localhost:8000';

// Mock view modules
jest.mock('../js/views/dashboard.js', () => ({
  render: () => '<div id="dashboard-view">Dashboard Content</div>'
}), { virtual: true });

jest.mock('../js/views/scada.js', () => ({
  render: () => '<div id="scada-view">SCADA Content</div>'
}), { virtual: true });

jest.mock('../js/views/servers.js', () => ({
  render: () => '<div id="servers-view">Servers Content</div>'
}), { virtual: true });

describe('router.js', () => {
  let router;
  let loadViewMock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    loadViewMock = jest.fn();
    global.loadView = loadViewMock;

    router = require('../js/router.js');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Route Definitions', () => {
    it('has routes defined for /, /scada, /servers', () => {
      expect(router.routes).toBeDefined();
      expect(router.routes.length).toBeGreaterThanOrEqual(3);
    });

    it('has Dashboard route at /', () => {
      const dashboardRoute = router.routes.find(r => r.path === '/');
      expect(dashboardRoute).toBeDefined();
      expect(dashboardRoute.icon).toBe('grid');
    });

    it('has SCADA route at /scada', () => {
      const scadaRoute = router.routes.find(r => r.path === '/scada');
      expect(scadaRoute).toBeDefined();
      expect(scadaRoute.icon).toBe('activity');
    });

    it('has Servers route at /servers', () => {
      const serversRoute = router.routes.find(r => r.path === '/servers');
      expect(serversRoute).toBeDefined();
      expect(serversRoute.icon).toBe('server');
    });
  });

  describe('navigate()', () => {
    it('updates window.location.pathname', () => {
      router.navigate('/scada');
      expect(window.location.pathname).toBe('/scada');
    });

    it('calls loadView with the matching route', () => {
      router.navigate('/servers');
      // loadView is called after history update
      jest.advanceTimersByTime(0);
      expect(loadViewMock).toHaveBeenCalled();
    });
  });

  describe('Active Nav Link Updates', () => {
    it('updates active class on nav link for current route', () => {
      router.navigate('/scada');
      jest.advanceTimersByTime(0);

      const navLinks = document.querySelectorAll('#nav a');
      const scadaLink = Array.from(navLinks).find(a => a.getAttribute('data-route') === '/scada');
      const dashboardLink = Array.from(navLinks).find(a => a.getAttribute('data-route') === '/');

      // At least the current route's link should have active class
      const activeLinks = document.querySelectorAll('#nav a.active');
      expect(activeLinks.length).toBeGreaterThan(0);
    });
  });

  describe('popstate handling', () => {
    it('reacts to popstate event with route change', () => {
      // Navigate somewhere first
      router.navigate('/');
      jest.advanceTimersByTime(0);

      // Simulate back navigation
      const popstateEvent = new dom.window.PopStateEvent('popstate', { state: { path: '/scada' } });
      window.dispatchEvent(popstateEvent);
      jest.advanceTimersByTime(0);

      expect(loadViewMock).toHaveBeenCalled();
    });
  });

  describe('loadView()', () => {
    it('renders content to #app-content element', () => {
      const main = document.getElementById('app-content');
      expect(main.innerHTML).toBe('');

      router.navigate('/');
      jest.advanceTimersByTime(0);

      expect(main.innerHTML).toContain('dashboard-view');
    });

    it('lazy loads the view module', () => {
      const dashboardRoute = router.routes.find(r => r.path === '/');
      expect(typeof dashboardRoute.view).toBe('function');
    });
  });

  describe('404 handling', () => {
    it('renders 404 content for unknown routes', () => {
      router.navigate('/nonexistent');
      jest.advanceTimersByTime(0);

      const main = document.getElementById('app-content');
      expect(main.innerHTML).toContain('404');
    });
  });
});
