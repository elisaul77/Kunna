/**
 * kuNNA SCADA View
 * D3.js v7 Force Simulation Topology Visualization
 */

import { showControlPanel, closeControlPanel } from '../components/control-panel.js';

let topologyData = null;
let simulation = null;
let svg = null;
let nodes = [];
let links = [];
let nodeElements = null;
let linkElements = null;
let ws = null;
let showAgent = true;
let isLayoutLocked = false;
let isLegendCollapsed = false;

/**
 * Render SCADA view HTML structure
 */
export function render() {
  return `
    <div class="scada-view">
      <!-- Toolbar -->
      <div class="scada-toolbar">
        <div class="scada-toolbar-left">
          <div class="scada-logo">🎯 kuNNA SCADA</div>
          <div class="scada-stats">
            <div class="scada-stat">
              <span>Total:</span>
              <span class="scada-stat-value stat-total">0</span>
            </div>
            <div class="scada-stat">
              <span>Activos:</span>
              <span class="scada-stat-value stat-active">0</span>
            </div>
            <div class="scada-stat">
              <span>Grupos:</span>
              <span class="scada-stat-value stat-groups">0</span>
            </div>
          </div>
        </div>
        <div class="scada-toolbar-right">
          <div class="scada-search">
            <svg class="scada-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input type="text" id="search-input" class="input" placeholder="/ para buscar" />
          </div>
          <div class="scada-toggle">
            <input type="checkbox" id="showAgentCheckbox" checked />
            <label for="showAgentCheckbox">Mostrar kunna-agent</label>
          </div>
          <button class="scada-btn" id="lock-toggle" title="Bloquear/Reubicar nodos">
            🔓
          </button>
          <button class="scada-btn" id="btn-refresh" title="Actualizar (R)">
            🔄 Actualizar
          </button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="scada-layout">
        <!-- Sidebar -->
        <div class="scada-sidebar">
          <div class="scada-sidebar-header">
            <div class="scada-sidebar-title">Grupos de Aplicaciones</div>
          </div>
          <div class="scada-sidebar-content">
            <div class="group-list" id="group-list">
              <!-- Se llena dinámicamente -->
            </div>
          </div>
        </div>

        <!-- Canvas -->
        <div class="scada-canvas">
          <svg id="topology-svg">
            <!-- Gradients for links -->
            <defs>
              <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#22D3EE;stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:#A78BFA;stop-opacity:0.6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>

          <!-- Control Panel -->
          <div class="node-control-panel" id="controlPanel">
            <div class="control-panel-header">
              <div class="control-panel-title" id="panelTitle">Control de Contenedor</div>
              <button class="close-panel" onclick="window.scadaClosePanel()">×</button>
            </div>
            <div class="control-panel-info" id="panelInfo">
              <!-- Se llena dinámicamente -->
            </div>
            <div class="control-panel-actions" id="panelActions">
              <!-- Se llena dinámicamente -->
            </div>
          </div>

          <!-- Legend -->
          <div class="scada-legend ${isLegendCollapsed ? 'collapsed' : ''}" id="scada-legend">
            <div class="scada-legend-header" onclick="window.scadaToggleLegend()">
              <div class="scada-legend-title">Leyenda</div>
              <button class="scada-legend-toggle">${isLegendCollapsed ? '▶' : '▼'}</button>
            </div>
            <div class="scada-legend-content">
              <div class="legend-item legend-running">
                <div class="legend-color"></div>
                <span>Running</span>
              </div>
              <div class="legend-item legend-stopped">
                <div class="legend-color"></div>
                <span>Stopped</span>
              </div>
              <div class="legend-item legend-paused">
                <div class="legend-color"></div>
                <span>Paused</span>
              </div>
            </div>
          </div>

          <!-- Keyboard hints -->
          <div class="shortcuts-hint">
            <kbd>/</kbd> buscar | <kbd>R</kbd> refresh | <kbd>Esc</kbd> cerrar
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize SCADA view
 */
export async function init() {
  // Restore legend state from localStorage
  const savedLegendState = localStorage.getItem('kunna-legend-collapsed');
  if (savedLegendState === 'true') {
    isLegendCollapsed = true;
    const legend = document.getElementById('scada-legend');
    if (legend) {
      legend.classList.add('collapsed');
      const toggle = legend.querySelector('.scada-legend-toggle');
      if (toggle) toggle.textContent = '▶';
    }
  }

  // Load topology from API
  await loadTopology();

  // Setup event listeners
  setupEventListeners();

  // Restore positions from localStorage
  restorePositions();

  // Connect WebSocket for traffic
  setupWebSocket();

  // Auto-refresh every 5 seconds
  window.scadaAutoRefresh = setInterval(refreshTopology, 5000);
}

/**
 * Update connection status indicator in header
 */
function updateConnectionStatus(connected) {
  const dot = document.getElementById('connection-dot');
  const text = document.getElementById('connection-text');

  if (dot && text) {
    dot.style.backgroundColor = connected ? 'var(--success)' : 'var(--danger)';
    text.textContent = connected ? 'Connected' : 'Disconnected';
  }
}

/**
 * Cleanup SCADA view
 */
export function cleanup() {
  // Disconnect WebSocket
  if (ws) {
    ws.close();
    ws = null;
  }

  // Stop auto-refresh
  if (window.scadaAutoRefresh) {
    clearInterval(window.scadaAutoRefresh);
    window.scadaAutoRefresh = null;
  }

  // Save positions
  savePositions();

  // Destroy simulation
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
}

/**
 * Load topology from API
 */
async function loadTopology() {
  try {
    const newData = await window.utils.api('/topology');

    // Update stats
    updateStats(newData.total_services, newData.active_services, newData.groups.length);

    // First load - create graph
    if (!topologyData) {
      topologyData = newData;
      renderGroups();
      initializeTopology();
    } else {
      // Just update states without recreating
      updateNodeStates(newData);
      topologyData = newData;
    }
  } catch (error) {
    window.utils.showToast('Error al cargar topología', 'danger');
  }
}

/**
 * Refresh topology (without full recreation)
 */
function refreshTopology() {
  if (!topologyData) return;

  window.utils.api('/topology').then(newData => {
    updateStats(newData.total_services, newData.active_services, newData.groups.length);
    updateNodeStates(newData);
    topologyData = newData;
  }).catch(err => {
    window.utils.showToast('Error al refrescar topología', 'warning');
  });
}

/**
 * Update stats display
 */
function updateStats(total, active, groups) {
  const totalEl = document.querySelector('.stat-total');
  const activeEl = document.querySelector('.stat-active');
  const groupsEl = document.querySelector('.stat-groups');

  if (totalEl) totalEl.textContent = total || 0;
  if (activeEl) activeEl.textContent = active || 0;
  if (groupsEl) groupsEl.textContent = groups || 0;
}

/**
 * Render groups in sidebar
 */
function renderGroups() {
  const groupList = document.getElementById('group-list');
  if (!groupList || !topologyData) return;

  groupList.innerHTML = topologyData.groups.map((group, index) => `
    <div class="group-item ${index === 0 ? 'active' : ''}" data-group-id="${window.utils.escapeHtml(group.id)}">
      <div class="group-name">${window.utils.escapeHtml(group.name)}</div>
      <div class="group-services-count">${group.services.length} servicios</div>
    </div>
  `).join('');

  // Add click handlers
  groupList.querySelectorAll('.group-item').forEach(item => {
    item.addEventListener('click', () => {
      focusGroup(item.dataset.groupId);
    });
  });
}

/**
 * Toggle agent visibility
 */
function toggleAgentVisibility() {
  showAgent = document.getElementById('showAgentCheckbox')?.checked ?? true;
  if (topologyData) {
    initializeTopology();
  }
}

/**
 * Toggle layout lock
 */
function toggleLockLayout() {
  isLayoutLocked = !isLayoutLocked;
  const lockBtn = document.getElementById('lock-toggle');

  if (lockBtn) {
    lockBtn.textContent = isLayoutLocked ? '🔒' : '🔓';
    lockBtn.classList.toggle('active', isLayoutLocked);
  }

  // When locked, fix all node positions
  if (isLayoutLocked && nodes.length) {
    nodes.forEach(node => {
      if (node.fx === null || node.fx === undefined) {
        node.fx = node.x;
        node.fy = node.y;
      }
    });
  } else if (!isLayoutLocked && simulation) {
    // Release fixed positions
    nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    simulation.alpha(0.3).restart();
  }
}

/**
 * Toggle legend
 */
function toggleLegend() {
  isLegendCollapsed = !isLegendCollapsed;
  const legend = document.getElementById('scada-legend');
  if (legend) {
    legend.classList.toggle('collapsed', isLegendCollapsed);
    const toggle = legend.querySelector('.scada-legend-toggle');
    if (toggle) toggle.textContent = isLegendCollapsed ? '▶' : '▼';
  }
  // Persist state
  localStorage.setItem('kunna-legend-collapsed', isLegendCollapsed);
}

/**
 * Focus on a group - highlight its services
 */
function focusGroup(groupId) {
  // Update sidebar active state
  document.querySelectorAll('.group-item').forEach(item => {
    item.classList.toggle('active', item.dataset.groupId === groupId);
  });

  // Find group services
  const groupServices = topologyData?.groups.find(g => g.id === groupId)?.services || [];
  const serviceIds = groupServices.map(s => s.id);

  // Highlight nodes
  nodeElements?.style('opacity', d => {
    return serviceIds.includes(d.id) ? 1 : 0.2;
  });

  // Highlight links
  linkElements?.style('opacity', l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return serviceIds.includes(sourceId) || serviceIds.includes(targetId) ? 1 : 0.1;
  });
}

/**
 * Filter nodes by search term
 */
function filterNodes(searchTerm) {
  if (!nodeElements) return;

  const term = searchTerm.toLowerCase().trim();

  nodeElements.style('opacity', d => {
    if (!term) return 1;
    return d.name.toLowerCase().includes(term) ? 1 : 0.15;
  });

  linkElements?.style('opacity', l => {
    if (!term) return 0.4;
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) return 0.1;
    return sourceNode.name.toLowerCase().includes(term) || targetNode.name.toLowerCase().includes(term) ? 0.6 : 0.1;
  });
}

/**
 * Update node states from new data
 */
function updateNodeStates(newData) {
  if (!nodeElements) return;

  // Build status map
  const statusMap = {};
  newData.groups.forEach(group => {
    group.services.forEach(service => {
      statusMap[service.id] = service.status;
    });
  });

  // Update node classes
  nodeElements.selectAll('circle.node-circle')
    .attr('class', d => {
      const newStatus = statusMap[d.id] || d.status;
      d.status = newStatus;
      return `node-circle node-${newStatus}`;
    });
}

/**
 * Initialize D3.js topology
 */
function initializeTopology() {
  if (!topologyData) return;

  svg = window.d3.select('#topology-svg');
  const container = svg.node().parentNode;
  const width = container.getBoundingClientRect().width || 1200;
  const height = container.getBoundingClientRect().height || 800;

  svg.selectAll('*').remove();

  // Prepare nodes
  nodes = [];
  links = [];

  // Add nodes from groups
  topologyData.groups.forEach((group, groupIndex) => {
    group.services.forEach((service) => {
      // Filter kunna-agent if disabled
      if (!showAgent && service.name === 'kunna-agent') return;

      nodes.push({
        id: service.id,
        name: service.name,
        status: service.status,
        icon: service.icon || '🌐',
        group: group.id,
        groupIndex: groupIndex,
        networks: service.networks || [],
        is_remote: service.is_remote || false,
        server_hostname: service.server_hostname,
        container_id: service.container_id
      });
    });
  });

  // Add links from connections
  // First, collect all valid node IDs (considering showAgent filter)
  const validNodeIds = new Set();
  topologyData.groups.forEach(group => {
    group.services.forEach(service => {
      if (showAgent || service.name !== 'kunna-agent') {
        validNodeIds.add(service.id);
      }
    });
  });

  // Now add links only if both source and target are valid nodes
  topologyData.connections.forEach(conn => {
    // Skip if either source or target is not a valid node (filtered out)
    if (!validNodeIds.has(conn.source) || !validNodeIds.has(conn.target)) {
      return;
    }

    // Also filter kunna-agent connections if showAgent is false
    if (!showAgent) {
      const sourceNode = topologyData.groups
        .flatMap(g => g.services)
        .find(s => s.id === conn.source);
      const targetNode = topologyData.groups
        .flatMap(g => g.services)
        .find(s => s.id === conn.target);

      if ((sourceNode && sourceNode.name === 'kunna-agent') ||
          (targetNode && targetNode.name === 'kunna-agent')) {
        return;
      }
    }

    links.push({
      source: conn.source,
      target: conn.target,
      network: conn.network
    });
  });

  // Create force simulation
  simulation = window.d3.forceSimulation(nodes)
    .force('link', window.d3.forceLink(links).id(d => d.id).distance(200))
    .force('charge', window.d3.forceManyBody().strength(-500))
    .force('center', window.d3.forceCenter(width / 2, height / 2))
    .force('collision', window.d3.forceCollide().radius(70))
    .force('x', window.d3.forceX(width / 2).strength(0.05))
    .force('y', window.d3.forceY(height / 2).strength(0.05));

  // Draw links
  const linkGroup = svg.append('g').attr('class', 'links');
  linkElements = linkGroup.selectAll('g')
    .data(links)
    .enter().append('g')
    .attr('class', 'link-group');

  console.log('[SCADA] Links created:', links.length, JSON.stringify(links.map(l => ({s: l.source, t: l.target}))));

  // Force D3 to resolve link references immediately
  simulation.force('link').links(links);

  // Link path - use solid color for debugging
  linkElements.append('path')
    .attr('class', 'link')
    .attr('stroke', '#22D3EE')
    .attr('stroke-width', 3)
    .attr('stroke-opacity', 0.8)
    .attr('fill', 'none');

  // Link particle
  linkElements.append('circle')
    .attr('class', 'link-particle')
    .attr('r', 5)
    .attr('fill', '#22D3EE')
    .attr('opacity', 0)
    .style('filter', 'drop-shadow(0 0 6px #22D3EE)');

  // Draw nodes
  nodeElements = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .enter().append('g')
    .attr('class', d => `node node-${d.status}`)
    .call(window.d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', onNodeClick);

  // Node circle
  nodeElements.append('circle')
    .attr('class', d => `node-circle node-${d.status}`)
    .attr('r', 45);

  // Node icon
  nodeElements.append('text')
    .attr('class', 'node-icon')
    .attr('dy', 10)
    .style('font-size', '28px')
    .text(d => d.icon);

  // Node label
  nodeElements.append('text')
    .attr('class', 'node-label')
    .attr('dy', 70)
    .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

  // Remote badge
  nodeElements.filter(d => d.is_remote)
    .append('text')
    .attr('class', 'node-remote-badge')
    .attr('dy', 85)
    .text(d => `🌐 ${d.server_hostname || ''}`);

  // Status badge
  nodeElements.append('circle')
    .attr('class', 'status-badge')
    .attr('cx', 30)
    .attr('cy', -30)
    .attr('r', 8)
    .attr('fill', d => getStatusColor(d.status));

  // Update positions on tick
  simulation.on('tick', () => {
    updatePositions();
    window.scadaTickCount = (window.scadaTickCount || 0) + 1;
    if (window.scadaTickCount <= 3) {
      console.log('[SCADA] Tick', window.scadaTickCount, 'nodes:', nodes.length, 'links:', links.length);
    }
  });

  // Stop simulation after 3 seconds to stabilize
  setTimeout(() => {
    simulation?.alpha(0);
  }, 3000);
}

/**
 * Update positions on simulation tick
 */
function updatePositions() {
  // Update links - D3 forceLink resolves source/target to node objects
  linkElements?.select('path.link')
    .attr('d', d => {
      const source = d.source || d;
      const target = d.target || d;
      const sx = typeof source.x === 'number' ? source.x : 0;
      const sy = typeof source.y === 'number' ? source.y : 0;
      const tx = typeof target.x === 'number' ? target.x : 0;
      const ty = typeof target.y === 'number' ? target.y : 0;
      if (sx === 0 && sy === 0 && tx === 0 && ty === 0) return '';
      return `M${sx},${sy}L${tx},${ty}`;
    });

  // Update nodes
  nodeElements?.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
}

/**
 * Get status color for D3
 */
function getStatusColor(status) {
  const colors = {
    'running': '#34D399',
    'exited': '#FB7185',
    'paused': '#FBBF24',
    'unknown': '#A1A1AA'
  };
  return colors[status] || '#A1A1AA';
}

/**
 * Handle node click
 */
function onNodeClick(event, d) {
  event.stopPropagation();

  // Highlight node and connections
  nodeElements?.style('opacity', n => {
    return n === d || isConnected(n, d) ? 1 : 0.3;
  });

  linkElements?.style('opacity', l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return sourceId === d.id || targetId === d.id ? 1 : 0.1;
  });

  // Show control panel
  showControlPanel(d);
}

/**
 * Check if two nodes are connected
 */
function isConnected(node1, node2) {
  return links.some(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return (sourceId === node1.id && targetId === node2.id) ||
           (sourceId === node2.id && targetId === node1.id);
  });
}

/**
 * Drag handlers
 */
function dragstarted(event, d) {
  if (!event.active) simulation?.alphaTarget(0.1).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation?.alphaTarget(0);
  // Keep position fixed after drag unless layout is unlocked
  if (!isLayoutLocked) {
    d.fx = null;
    d.fy = null;
  }
}

/**
 * Save node positions to localStorage
 */
function savePositions() {
  if (!nodes.length) return;

  const positions = {};
  nodes.forEach(n => {
    if (n.x !== undefined && n.y !== undefined) {
      positions[n.id] = { x: n.x, y: n.y };
    }
  });

  try {
    localStorage.setItem('kunna-topology-positions', JSON.stringify(positions));
  } catch (e) {
    // Silently ignore position save failures
  }
}

/**
 * Restore node positions from localStorage
 */
function restorePositions() {
  if (!nodes.length) return;

  try {
    const saved = localStorage.getItem('kunna-topology-positions');
    if (!saved) return;

    const positions = JSON.parse(saved);
    nodes.forEach(node => {
      if (positions[node.id]) {
        node.x = positions[node.id].x;
        node.y = positions[node.id].y;
        node.fx = positions[node.id].x;
        node.fy = positions[node.id].y;
      }
    });

    // Restart simulation to apply positions
    if (simulation) {
      simulation.nodes(nodes);
      simulation.alpha(0.3).restart();
    }
  } catch (e) {
    // Silently ignore position restore failures
  }
}

/**
 * Setup WebSocket for real-time traffic
 */
function setupWebSocket() {
  const wsUrl = (window.utils.WS_URL || 'ws://localhost:8000') + '/ws/traffic';

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // WebSocket connected silently
      updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
      try {
        const trafficEvent = JSON.parse(event.data);
        handleTrafficEvent(trafficEvent);
      } catch (e) {
        // Silently ignore parse errors
      }
    };

    ws.onerror = (error) => {
      // Silently ignore WebSocket errors
      updateConnectionStatus(false);
    };

    ws.onclose = () => {
      // Silently reconnect
      updateConnectionStatus(false);
      setTimeout(setupWebSocket, 3000);
    };
  } catch (e) {
    // Silently ignore connection failures
  }
}

/**
 * Handle traffic event from WebSocket
 */
function handleTrafficEvent(event) {
  // Skip self-referencing traffic
  if (event.from === event.to) return;

  // Find or create nodes
  let fromNode = nodes.find(n => 
    n.name === event.from || 
    n.name.includes(event.from) || 
    event.from.includes(n.name)
  );
  let toNode = nodes.find(n => 
    n.name === event.to || 
    n.name.includes(event.to) || 
    event.to.includes(n.name)
  );

  // Create temporary nodes if not found
  if (!fromNode) {
    fromNode = createTemporaryNode(event.from);
  }
  if (!toNode) {
    toNode = createTemporaryNode(event.to);
  }

  if (!fromNode || !toNode) return;

  // Find or create link
  let link = links.find(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return (sourceId === fromNode.id && targetId === toNode.id) ||
           (targetId === fromNode.id && sourceId === toNode.id);
  });

  if (!link) {
    link = createTemporaryLink(fromNode, toNode);
  }

  if (link) {
    animateRealTraffic(link, event);
  }
}

/**
 * Create temporary node for unknown service
 */
function createTemporaryNode(serviceName) {
  if (!simulation) return null;

  const container = document.querySelector('.scada-canvas');
  const width = container?.getBoundingClientRect().width || 800;
  const height = container?.getBoundingClientRect().height || 600;

  const tempNode = {
    id: `temp-${serviceName}-${Date.now()}`,
    name: serviceName,
    status: 'unknown',
    icon: '🌐',
    group: 'external',
    groupIndex: 999,
    networks: [],
    is_remote: false,
    is_temporary: true,
    x: width / 2 + (Math.random() - 0.5) * 200,
    y: height / 2 + (Math.random() - 0.5) * 200,
    vx: 0,
    vy: 0
  };

  nodes.push(tempNode);
  simulation.nodes(nodes);
  simulation.alpha(0.3).restart();

  // Add to SVG
  const nodeGroup = nodeElements?.node()?.parentNode;
  if (nodeGroup) {
    const newNode = window.d3.select(nodeGroup)
      .append('g')
      .datum(tempNode)
      .attr('class', 'node temp-node')
      .attr('transform', `translate(${tempNode.x},${tempNode.y})`)
      .call(window.d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    newNode.append('circle')
      .attr('class', 'node-circle node-unknown')
      .attr('r', 40)
      .style('opacity', 0.6)
      .style('stroke-dasharray', '5,5');

    newNode.append('text')
      .attr('class', 'node-icon')
      .attr('dy', 8)
      .text('🌐');

    newNode.append('text')
      .attr('class', 'node-label')
      .attr('dy', 60)
      .text(serviceName);

    // Update nodeElements to include new node
    nodeElements = window.d3.selectAll('.node');
  }

  // Auto-remove after 5 minutes
  setTimeout(() => removeTemporaryNode(tempNode.id), 300000);

  return tempNode;
}

/**
 * Create temporary link
 */
function createTemporaryLink(fromNode, toNode) {
  if (!simulation) return null;

  const tempLink = {
    source: fromNode,
    target: toNode,
    network: 'temporary',
    is_temporary: true
  };

  links.push(tempLink);
  simulation.force('link').links(links);
  simulation.alpha(0.1).restart();

  // Add to SVG
  if (linkElements && !linkElements.empty()) {
    const linkGroup = linkElements.node().parentNode;
    if (linkGroup) {
      const newLink = window.d3.select(linkGroup)
        .insert('g', ':first-child')
        .datum(tempLink)
        .attr('class', 'link-group temp-link');

      newLink.append('path')
        .attr('class', 'link')
        .attr('stroke', '#22D3EE')
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '5,5')
        .attr('fill', 'none');

      newLink.append('circle')
        .attr('class', 'link-particle')
        .attr('r', 4)
        .attr('fill', '#22D3EE')
        .attr('opacity', 0)
        .style('filter', 'drop-shadow(0 0 4px #22D3EE)');

      // Update linkElements
      linkElements = window.d3.selectAll('.link-group');
    }
  }

  return tempLink;
}

/**
 * Remove temporary node
 */
function removeTemporaryNode(nodeId) {
  const index = nodes.findIndex(n => n.id === nodeId);
  if (index !== -1 && nodes[index].is_temporary) {
    nodes.splice(index, 1);

    // Remove associated links
    links = links.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId !== nodeId && targetId !== nodeId;
    });

    // Update simulation
    if (simulation) {
      simulation.nodes(nodes);
      simulation.force('link').links(links);
      simulation.alpha(0.1).restart();
    }

    // Remove from SVG
    window.d3.selectAll('.temp-node').filter(d => d.id === nodeId).remove();
    window.d3.selectAll('.temp-link').filter(d => 
      (typeof d.source === 'object' ? d.source.id : d.source) === nodeId ||
      (typeof d.target === 'object' ? d.target.id : d.target) === nodeId
    ).remove();
  }
}

/**
 * Animate real traffic on link
 */
function animateRealTraffic(link, event) {
  // Determine color based on status
  let color = '#22D3EE';
  if (event.status >= 200 && event.status < 300) color = '#34D399';
  else if (event.status >= 400 && event.status < 500) color = '#FBBF24';
  else if (event.status >= 500) color = '#FB7185';

  // Find the link element
  const linkData = linkElements?.filter(d => {
    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
    const linkSourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const linkTargetId = typeof link.target === 'object' ? link.target.id : link.target;
    return (sourceId === linkSourceId && targetId === linkTargetId) ||
           (sourceId === linkTargetId && targetId === linkSourceId);
  });

  if (!linkData || linkData.empty()) return;

  // Animate particle along path
  const particle = linkData.select('.link-particle');
  
  particle
    .attr('fill', color)
    .style('filter', `drop-shadow(0 0 6px ${color})`)
    .attr('opacity', 1)
    .transition()
    .duration(2000)
    .ease(window.d3.easeLinear || d3.easeLinear)
    .attrTween('transform', function() {
      return function(t) {
        const source = link.source;
        const target = link.target;
        if (!source || !target || source.x === undefined) return 'translate(0,0)';
        
        const x = source.x + (target.x - source.x) * t;
        const y = source.y + (target.y - source.y) * t;
        return `translate(${x},${y})`;
      };
    })
    .transition()
    .duration(0)
    .attr('opacity', 0);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', window.utils.debounce((e) => {
      filterNodes(e.target.value);
    }, 300));

    // Keyboard shortcut: "/" to focus search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === '/') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // Agent visibility toggle
  const agentCheckbox = document.getElementById('showAgentCheckbox');
  if (agentCheckbox) {
    agentCheckbox.addEventListener('change', toggleAgentVisibility);
  }

  // Lock toggle
  const lockBtn = document.getElementById('lock-toggle');
  if (lockBtn) {
    lockBtn.addEventListener('click', toggleLockLayout);
  }

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshTopology();
      window.utils.showToast('Topología actualizada', 'info');
    });
  }

  // Click on canvas to close panel
  svg?.on('click', () => {
    closeControlPanel();
    nodeElements?.style('opacity', 1);
    linkElements?.style('opacity', 0.4);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close panel
    if (e.key === 'Escape') {
      closeControlPanel();
      nodeElements?.style('opacity', 1);
      linkElements?.style('opacity', 0.4);
      // Unfocus search
      if (document.activeElement?.id === 'search-input') {
        document.activeElement.blur();
      }
    }
    // R to refresh
    if (e.key === 'r' || e.key === 'R') {
      if (document.activeElement?.tagName !== 'INPUT') {
        refreshTopology();
      }
    }
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (simulation) {
      const container = document.querySelector('.scada-canvas');
      const width = container?.getBoundingClientRect().width || 1200;
      const height = container?.getBoundingClientRect().height || 800;

      simulation.force('center', window.d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }
  });

  // Control panel action callback
  window.onControlPanelActionComplete = () => {
    refreshTopology();
  };
}

// Expose functions globally for onclick handlers
window.scadaClosePanel = closeControlPanel;
window.scadaToggleLegend = toggleLegend;
window.scadaFilterNodes = filterNodes;
window.scadaFocusGroup = focusGroup;
window.scadaToggleLock = toggleLockLayout;
window.scadaRefresh = refreshTopology;
