/**
 * Modal Component
 * Reusable glass modal dialog
 */

let currentModal = null;
let onSaveCallback = null;

/**
 * Show modal dialog
 * @param {string} title - Modal title
 * @param {string} content - Modal body content (HTML string)
 * @param {Function} onSave - Callback when save is clicked, receives formData object
 */
export function showModal(title, content, onSave) {
  // Close any existing modal
  closeModal();
  
  onSaveCallback = onSave;

  const modalHtml = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content glass" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 id="modal-title">${escapeHtml(title)}</h2>
          <button class="modal-close" id="modal-close" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary btn-save" id="modal-save">Save</button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Get modal element reference
  currentModal = document.getElementById('modal-overlay');
  
  // Set up event listeners
  setupEventListeners();
  
  // Focus first input if exists
  const firstInput = currentModal.querySelector('input, select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close modal dialog
 */
export function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
    onSaveCallback = null;
  }
}

/**
 * Set up modal event listeners
 */
function setupEventListeners() {
  if (!currentModal) return;

  // Close button
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Cancel button
  const cancelBtn = document.getElementById('modal-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  // Save button
  const saveBtn = document.getElementById('modal-save');
  if (saveBtn && onSaveCallback) {
    saveBtn.addEventListener('click', () => {
      const formData = collectFormData();
      onSaveCallback(formData);
      closeModal();
    });
  }

  // Overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }

  // Escape key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Collect form data from modal
 * @returns {Object} Form data as object
 */
function collectFormData() {
  if (!currentModal) return {};

  const form = currentModal.querySelector('form');
  if (!form) return {};

  const formData = new FormData(form);
  const data = {};

  // Convert FormData to object
  for (const [key, value] of formData.entries()) {
    // Handle checkboxes
    const input = form.querySelector(`[name="${key}"]`);
    if (input && input.type === 'checkbox') {
      data[key] = input.checked;
    } else {
      data[key] = value;
    }
  }

  // Also get inputs not in form (just in case)
  const inputs = currentModal.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.name && !data.hasOwnProperty(input.name)) {
      if (input.type === 'checkbox') {
        data[input.name] = input.checked;
      } else {
        data[input.name] = input.value;
      }
    }
  });

  return data;
}

/**
 * Escape HTML to prevent XSS (delegates to utils)
 */
function escapeHtml(str) {
  return window.utils.escapeHtml(str);
}