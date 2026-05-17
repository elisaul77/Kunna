/**
 * kuNNA SPA Router
 * History API based client-side routing with lazy loading
 */
import { transitionOut, transitionIn } from './transitions.js';

// Route definitions
const routes = [
  {
    path: '/',
    title: 'Dashboard',
    icon: 'grid',
    view: () => import('./views/dashboard.js')
  },
  {
    path: '/scada',
    title: 'SCADA',
    icon: 'activity',
    view: () => import('./views/scada.js')
  },
  {
    path: '/servers',
    title: 'Servers',
    icon: 'server',
    view: () => import('./views/servers.js')
  }
];

// Current view module reference for cleanup
let currentViewModule = null;

/**
 * Navigate to a path
 * @param {string} path - Route path
 */
function navigate(path) {
  if (window.location.pathname !== path) {
    history.pushState({ path }, '', path);
  }
  loadView(path);
}

/**
 * Load and render a view
 * @param {string} path - Route path
 */
async function loadView(path) {
  const route = routes.find(r => r.path === path);

  if (!route) {
    render404();
    updateActiveNav(path);
    return;
  }

  try {
    // Cleanup previous view if it has a cleanup function
    if (currentViewModule && typeof currentViewModule.cleanup === 'function') {
      currentViewModule.cleanup();
    }

    const main = document.getElementById('app-content');

    // Transition out current content
    await transitionOut(main);

    // Brief delay for smooth transition feel
    await new Promise(r => setTimeout(r, 50));

    // Load new view module
    const viewModule = await route.view();

    if (main && viewModule.render) {
      // Set new content with transition
      await transitionIn(main, () => viewModule.render());
    }

    // Call init after render if available
    if (viewModule.init) {
      await viewModule.init();
    }
    // Store current view module for cleanup
    currentViewModule = viewModule;
    updateActiveNav(path);
    document.title = `${route.title} - kuNNA`;
  } catch (error) {
    const main = document.getElementById('app-content');
    if (main) {
      main.innerHTML = `
        <div class="page-error" style="padding: 40px; text-align: center;">
          <h2>Error loading view</h2>
          <p style="color: var(--text-muted);">Failed to load: ${path}</p>
          <button onclick="navigate('/')" class="btn" style="margin-top: 20px;">Go to Dashboard</button>
        </div>
      `;
    }
  }
}

/**
 * Render 404 page
 */
function render404() {
  const main = document.getElementById('app-content');
  if (main) {
    main.innerHTML = `
      <div class="page-404">
        <h2>404</h2>
        <p>Page not found</p>
        <a href="/" class="btn btn-primary" data-route="/">
          <svg class="icon"><use href="#icon-grid"></use></svg>
          Go to Dashboard
        </a>
      </div>
    `;
  }
}

/**
 * Update active nav link
 * @param {string} currentPath - Current route path
 */
function updateActiveNav(currentPath) {
  document.querySelectorAll('.sidebar-nav a, .header-nav a').forEach(link => {
    const routePath = link.getAttribute('data-route') || link.getAttribute('href');
    if (routePath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Handle popstate events (back/forward navigation)
 */
function handlePopstate(event) {
  const path = event.state?.path || window.location.pathname;
  loadView(path);
}

// Initialize router
function initRouter() {
  // Set up popstate listener
  window.addEventListener('popstate', handlePopstate);

  // Handle initial route
  const initialPath = window.location.pathname;
  if (routes.find(r => r.path === initialPath)) {
    loadView(initialPath);
  } else {
    navigate('/');
  }
}

// Auto-init on DOMContentLoaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initRouter);
}

// Exports
export { routes, navigate, loadView, initRouter };

// Global access for onclick handlers
window.navigate = navigate;
