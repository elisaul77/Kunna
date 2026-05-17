/**
 * kuNNA Page Transition System
 * Smooth CSS-based transitions between views with Promise support
 */

/**
 * Animate out current page content
 * @param {HTMLElement} container - The container to animate out
 * @returns {Promise} Resolves when animation completes
 */
export function transitionOut(container) {
  return new Promise((resolve) => {
    if (!container) {
      resolve();
      return;
    }

    // Add exit animation class
    container.classList.add('page-exit');

    // Wait for animation to complete (150ms)
    setTimeout(() => {
      // Clear content after animation
      container.innerHTML = '';
      container.classList.remove('page-exit');
      resolve();
    }, 150);
  });
}

/**
 * Animate in new page content
 * @param {HTMLElement} container - The container to animate in
 * @param {Function} renderCallback - Function to render new content
 * @returns {Promise} Resolves when animation completes and content is rendered
 */
export function transitionIn(container, renderCallback) {
  return new Promise((resolve) => {
    if (!container || !renderCallback) {
      resolve();
      return;
    }

    // Render new content first
    const html = renderCallback();
    container.innerHTML = html;

    // Force reflow to ensure styles are applied
    container.offsetHeight;

    // Add enter animation class
    container.classList.add('page-enter');

    // Wait for animation to complete (250ms)
    setTimeout(() => {
      container.classList.remove('page-enter');
      resolve();
    }, 250);
  });
}

/**
 * Full page transition with out-in pattern
 * @param {HTMLElement} container - The container element
 * @param {Function} renderCallback - Function that returns HTML string
 * @returns {Promise} Resolves when full transition completes
 */
export async function transitionPage(container, renderCallback) {
  // First, animate out current content
  await transitionOut(container);

  // Brief delay for smooth feel (50ms)
  await new Promise(r => setTimeout(r, 50));

  // Then animate in new content
  await transitionIn(container, renderCallback);
}

/**
 * Apply stagger animation to child elements
 * @param {HTMLElement} parent - Parent element with children
 * @param {string} selector - Child selector (default: direct children)
 */
export function applyStagger(parent, selector = ':scope > *') {
  if (!parent) return;

  const children = parent.querySelectorAll(selector);
  children.forEach((child, index) => {
    child.style.animationDelay = `${index * 50}ms`;
    child.classList.add('animate-fade-in-up');
  });
}

/**
 * Setup default transition configurations
 */
export function setupPageTransitions() {
  // Add transition duration CSS variable
  document.documentElement.style.setProperty('--transition-duration', '250ms');
  document.documentElement.style.setProperty('--transition-delay', '50ms');

  // Add transition class to main content on initial load
  const main = document.getElementById('app-content');
  if (main) {
    main.classList.add('page-enter');
    setTimeout(() => {
      main.classList.remove('page-enter');
    }, 250);
  }
}