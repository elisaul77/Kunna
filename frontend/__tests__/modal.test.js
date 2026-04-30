/**
 * Tests for Modal Component
 */
import { jest } from '@jest/globals';

// We need to test the modal component
// The modal should be a pure function that returns HTML and manipulates DOM

describe('Modal Component', () => {
  let showModal, closeModal;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="toast-container"></div>
    `;
    // Clear any existing modals
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    // Reset module to get fresh state
    jest.resetModules();
  });

  describe('showModal', () => {
    test('creates modal in DOM', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      const content = '<form><input name="test" value="123"></form>';
      showModal('Test Modal', content, jest.fn());

      const modal = document.querySelector('.modal-overlay');
      expect(modal).not.toBeNull();
    });

    test('modal has correct title', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      showModal('My Custom Title', '<p>Content</p>', jest.fn());

      const title = document.querySelector('.modal-header h2');
      expect(title.textContent).toBe('My Custom Title');
    });

    test('modal has close button', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      showModal('Test', '<p>Content</p>', jest.fn());

      const closeBtn = document.querySelector('.modal-close');
      expect(closeBtn).not.toBeNull();
    });
  });

  describe('closeModal', () => {
    test('removes modal from DOM', async () => {
      const { showModal: sm, closeModal: cm } = await import('../components/modal.js');
      showModal = sm;
      closeModal = cm;
      
      showModal('Test', '<p>Content</p>', jest.fn());
      closeModal();

      const modal = document.querySelector('.modal-overlay');
      expect(modal).toBeNull();
    });
  });

  describe('Escape key closes modal', () => {
    test('Escape key closes modal', async () => {
      const { showModal: sm, closeModal: cm } = await import('../components/modal.js');
      showModal = sm;
      closeModal = cm;
      
      showModal('Test', '<p>Content</p>', jest.fn());
      
      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      const modal = document.querySelector('.modal-overlay');
      expect(modal).toBeNull();
    });
  });

  describe('Overlay click closes modal', () => {
    test('clicking overlay closes modal', async () => {
      const { showModal: sm, closeModal: cm } = await import('../components/modal.js');
      showModal = sm;
      closeModal = cm;
      
      showModal('Test', '<p>Content</p>', jest.fn());
      
      // Click on overlay (not content)
      const overlay = document.querySelector('.modal-overlay');
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, target: overlay }));

      const modal = document.querySelector('.modal-overlay');
      expect(modal).toBeNull();
    });
  });

  describe('Save button calls onSave callback', () => {
    test('Save button calls onSave with form data', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      const onSaveMock = jest.fn();
      const content = `
        <form id="test-form">
          <input name="name" value="Test Service">
          <input name="url" value="http://localhost:3000">
        </form>
      `;
      showModal('Test', content, onSaveMock);

      // Click save button
      const saveBtn = document.querySelector('.btn-save');
      saveBtn.click();

      expect(onSaveMock).toHaveBeenCalled();
      const formData = onSaveMock.mock.calls[0][0];
      expect(formData.name).toBe('Test Service');
      expect(formData.url).toBe('http://localhost:3000');
    });
  });

  describe('Cancel button closes modal', () => {
    test('Cancel button closes modal without calling onSave', async () => {
      const { showModal: sm, closeModal: cm } = await import('../components/modal.js');
      showModal = sm;
      closeModal = cm;
      
      const onSaveMock = jest.fn();
      showModal('Test', '<form></form>', onSaveMock);

      // Click cancel button
      const cancelBtn = document.querySelector('.btn-cancel');
      cancelBtn.click();

      const modal = document.querySelector('.modal-overlay');
      expect(modal).toBeNull();
      expect(onSaveMock).not.toHaveBeenCalled();
    });
  });

  describe('Form data collection', () => {
    test('collects form data correctly from inputs', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      const onSaveMock = jest.fn();
      const content = `
        <form id="service-form">
          <input type="text" name="name" value="My Service">
          <input type="text" name="description" value="A cool service">
          <input type="text" name="url" value="http://localhost:8080">
          <input type="text" name="icon" value="🔗">
          <input type="text" name="category" value="web">
          <input type="text" name="color" value="#22D3EE">
        </form>
      `;
      showModal('Add Service', content, onSaveMock);

      const saveBtn = document.querySelector('.btn-save');
      saveBtn.click();

      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Service',
          description: 'A cool service',
          url: 'http://localhost:8080',
          icon: '🔗',
          category: 'web',
          color: '#22D3EE'
        })
      );
    });

    test('handles checkboxes correctly', async () => {
      const { showModal: sm } = await import('../components/modal.js');
      showModal = sm;
      
      const onSaveMock = jest.fn();
      const content = `
        <form id="service-form">
          <input type="checkbox" name="is_remote" checked>
        </form>
      `;
      showModal('Test', content, onSaveMock);

      const saveBtn = document.querySelector('.btn-save');
      saveBtn.click();

      const formData = onSaveMock.mock.calls[0][0];
      expect(formData.is_remote).toBe(true);
    });
  });
});