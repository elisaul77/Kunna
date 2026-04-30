/**
 * Tests for utils.js - kuNNA Frontend Utilities
 * Run with: node __tests__/utils.test.js
 */

// Mock DOM environment
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

const BACKEND_HOST = 'localhost';
const BACKEND_HTTP = 'http://localhost:8000';
const API_URL = BACKEND_HTTP + '/api';
const WS_URL = 'ws://localhost:8000';

let utils;
let fetchMock;

describe('utils.js', () => {
  beforeEach(() => {
    jest.resetModules();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    utils = require('../js/utils.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast', () => {
    it('creates a toast DOM element and removes it after timeout', (done) => {
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBe(0);

      utils.showToast('Test message', 'info');

      expect(container.children.length).toBe(1);
      const toast = container.children[0];
      expect(toast.className).toContain('toast');
      expect(toast.className).toContain('toast-info');
      expect(toast.textContent).toBe('Test message');

      setTimeout(() => {
        expect(container.children.length).toBe(0);
        done();
      }, 3200);
    });

    it('applies correct class for success type', () => {
      utils.showToast('Success!', 'success');
      const toast = document.getElementById('toast-container').children[0];
      expect(toast.className).toContain('toast-success');
    });

    it('applies correct class for danger type', () => {
      utils.showToast('Error!', 'danger');
      const toast = document.getElementById('toast-container').children[0];
      expect(toast.className).toContain('toast-danger');
    });

    it('applies correct class for warning type', () => {
      utils.showToast('Warning!', 'warning');
      const toast = document.getElementById('toast-container').children[0];
      expect(toast.className).toContain('toast-warning');
    });
  });

  describe('api()', () => {
    it('constructs correct URL with BACKEND_HTTP', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      await utils.api('/services');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/services',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('adds headers with Content-Type', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await utils.api('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('stringifies body for POST/PUT/PATCH', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const data = { name: 'test' };
      await utils.api('/services', { method: 'POST', body: data });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(data)
        })
      );
    });

    it('throws error on HTTP error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Not found' })
      });

      await expect(utils.api('/nonexistent')).rejects.toThrow('HTTP 404');
    });

    it('returns parsed JSON on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ services: [] })
      });

      const result = await utils.api('/services');
      expect(result).toEqual({ services: [] });
    });
  });

  describe('debounce()', () => {
    it('delays execution by specified delay', (done) => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debouncedFn = utils.debounce(fn, 300);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
      done();
    });

    it('only executes once when called multiple times within delay', (done) => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debouncedFn = utils.debounce(fn, 300);

      debouncedFn();
      debouncedFn();
      debouncedFn();
      jest.advanceTimersByTime(300);

      expect(fn).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
      done();
    });
  });

  describe('formatDate()', () => {
    it('returns ISO string when no format specified', () => {
      const result = utils.formatDate('2024-01-15T10:30:00Z');
      expect(result).toContain('2024');
    });

    it('returns time only when format is "time"', () => {
      const result = utils.formatDate('2024-01-15T10:30:00Z', 'time');
      expect(result).toMatch(/10:30/);
    });

    it('returns date only when format is "date"', () => {
      const result = utils.formatDate('2024-01-15T10:30:00Z', 'date');
      expect(result).toMatch(/15/);
    });
  });

  describe('getStatusColor()', () => {
    it('returns accent color for running status', () => {
      const result = utils.getStatusColor('running');
      expect(result).toBe('var(--accent)');
    });

    it('returns danger color for stopped status', () => {
      const result = utils.getStatusColor('stopped');
      expect(result).toBe('var(--danger)');
    });

    it('returns danger color for error status', () => {
      const result = utils.getStatusColor('error');
      expect(result).toBe('var(--danger)');
    });

    it('returns warning color for unknown status', () => {
      const result = utils.getStatusColor('unknown');
      expect(result).toBe('var(--warning)');
    });
  });

  describe('escapeHtml()', () => {
    it('escapes < and > characters', () => {
      const result = utils.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes & character', () => {
      const result = utils.escapeHtml('foo & bar');
      expect(result).toContain('&amp;');
    });

    it('escapes " character', () => {
      const result = utils.escapeHtml('"quoted"');
      expect(result).toContain('&quot;');
    });

    it('leaves normal text unchanged', () => {
      const result = utils.escapeHtml('Hello World');
      expect(result).toBe('Hello World');
    });
  });
});
