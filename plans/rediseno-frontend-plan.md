## Plan: Rediseño Frontend kuNNA — SPA Glassmorphism + SVG

Refactorizar el frontend de kuNNA a una **SPA** con diseño **glassmorphism minimalista**, íconos **SVG** (Lucide), y separación de responsabilidades. El backend NO se modifica. Se mantiene el concepto SCADA con visualización D3.js mejorada.

**Phases: 6**

---

### Phase 1: Infraestructura Base — Design System + SPA Shell
- **Objective:** Crear el layout SPA, sistema de diseño (variables CSS, tipografía, glassmorphism), router cliente, y utilidades JS compartidas.
- **Files/Functions to Modify/Create:**
  - `frontend/index.html` — reescrito como SPA shell (mínimo HTML, carga de bundles)
  - `frontend/css/design-system.css` — variables CSS, reset, glass panels, botones, inputs, tipografía Inter
  - `frontend/js/router.js` — SPA router con History API, lazy-loading de vistas
  - `frontend/js/utils.js` — toast system, fetch wrapper, debounce, formatters
  - `frontend/assets/icons/` — SVG sprite sheet con íconos Lucide (docker, server, activity, search, etc.)
- **Tests to Write:**
  - `frontend/__tests__/utils.test.js` — fetch wrapper error handling, debounce timing, toast lifecycle
  - `frontend/__tests__/router.test.js` — route matching, history push/pop, lazy loading
- **Steps:**
  1. Escribir tests para utils.js y router.js (ver que fallen)
  2. Crear `design-system.css` con todas las variables y estilos base glassmorphism
  3. Crear `utils.js` con toast, fetch wrapper, debounce — pasar tests
  4. Crear `router.js` con History API — pasar tests
  5. Crear SVG sprite sheet con íconos Lucide
  6. Reescribir `index.html` como SPA shell mínimo (<main> + <script>)
  7. Actualizar `nginx.conf` para SPA (try_files con fallback a index.html)
  8. Verificar tests pasan, lint ok

---

### Phase 2: Vista Dashboard — Galería de Servicios
- **Objective:** Implementar la vista principal de galería con tarjetas glass, skeleton loading, búsqueda con debounce, y filtros chip.
- **Files/Functions to Modify/Create:**
  - `frontend/css/dashboard.css` — estilos de grid, tarjetas glass, filtros chip, skeleton
  - `frontend/js/views/dashboard.js` — lógica de vista dashboard (renderizado, filtrado, CRUD inline)
  - `frontend/js/components/service-card.js` — componente de tarjeta de servicio reutilizable
  - `frontend/js/components/modal.js` — modal glass para crear/editar servicios
- **Tests to Write:**
  - `frontend/__tests__/dashboard.test.js` — renderizado de tarjetas, filtrado por categoría/estado, búsqueda con debounce
  - `frontend/__tests__/service-card.test.js` — renderizado de estados (running/stopped/error), remote badge
  - `frontend/__tests__/modal.test.js` — open/close, form submit, validación
- **Steps:**
  1. Escribir tests para dashboard, service-card, modal
  2. Crear `service-card.js` componente — pasar tests
  3. Crear `modal.js` componente — pasar tests
  4. Crear `dashboard.css` con grid glass y animaciones
  5. Implementar `dashboard.js` view con lazy-load en router
  6. Verificar tests pasan

---

### Phase 3: Vista SCADA — Topología Interactiva
- **Objective:** Refinar la visualización D3.js con nodos glass + glow neón, partículas de tráfico animadas, panel de control lateral, y grid de fondo.
- **Files/Functions to Modify/Create:**
  - `frontend/css/scada.css` — canvas, leyenda glass, panel lateral, animaciones de partículas
  - `frontend/js/views/scada.js` — vista SCADA con D3.js force simulation
  - `frontend/js/components/control-panel.js` — panel lateral de control de contenedor
- **Tests to Write:**
  - `frontend/__tests__/scada.test.js` — carga de topología, renderizado de nodos/links, filtro de búsqueda
  - `frontend/__tests__/control-panel.test.js` — mostrar/ocultar, acciones (start/stop/restart)
- **Steps:**
  1. Escribir tests para scada view y control-panel
  2. Crear `scada.css` con estilos glass para canvas y leyenda
  3. Extraer y refactorizar lógica SCADA de `scada.html` a `scada.js`
  4. Implementar nodos con glow neón y partículas mejoradas
  5. Crear `control-panel.js` componente
  6. Integrar en router como vista `/scada`
  7. Verificar tests pasan

---

### Phase 4: Vista Servidores — Gestión Remota
- **Objective:** Rediseñar la vista de servidores remotos con el nuevo sistema glass y despliegue SSH visual.
- **Files/Functions to Modify/Create:**
  - `frontend/css/servers.css` — cards de servidor, progreso de deploy, stats glass
  - `frontend/js/views/servers.js` — vista de gestión de servidores
  - `frontend/js/components/deploy-form.js` — formulario de despliegue SSH con indicador de progreso
- **Tests to Write:**
  - `frontend/__tests__/servers.test.js` — listado de servidores, stats, filtrado
  - `frontend/__tests__/deploy-form.test.js` — validación de campos, progreso visual
- **Steps:**
  1. Escribir tests para servers view y deploy-form
  2. Crear `servers.css` con cards glass
  3. Extraer lógica de `servers.html` a `servers.js`
  4. Crear `deploy-form.js` componente
  5. Integrar en router como vista `/servers`
  6. Verificar tests pasan

---

### Phase 5: Micro-interacciones y Transiciones
- **Objective:** Agregar animaciones de transición entre vistas, hover states pulidos, animaciones de entrada escalonadas, y skeleton loading global.
- **Files/Functions to Modify/Create:**
  - `frontend/css/animations.css` — keyframes, transiciones de página, stagger animations
  - `frontend/js/transitions.js` — sistema de transición entre vistas (fade/slide)
  - Actualizar `router.js` para integrar transiciones
- **Tests to Write:**
  - `frontend/__tests__/transitions.test.js` — cambio de vista con animación, cleanup después de transición
- **Steps:**
  1. Escribir tests para sistema de transiciones
  2. Crear `animations.css` con keyframes reutilizables
  3. Implementar `transitions.js` con page enter/exit
  4. Integrar en router
  5. Agregar stagger animations a dashboard cards
  6. Verificar tests pasan

---

### Phase 6: Optimización y Pulido Final
- **Objective:** Verificar consistencia visual, responsive design en mobile/tablet, accesibilidad básica, actualizar Dockerfile.
- **Files/Functions to Modify/Create:**
  - `frontend/css/responsive.css` — media queries para mobile, tablet, desktop
  - `frontend/Dockerfile` — actualizado para copiar estructura de archivos
  - `frontend/nginx.conf` — revisar config SPA
- **Tests to Write:**
  - `frontend/__tests__/responsive.test.js` — tests de viewport y media query matching
- **Steps:**
  1. Escribir tests de responsive
  2. Crear `responsive.css` con breakpoints
  3. Verificar todas las vistas en mobile/tablet/desktop
  4. Actualizar Dockerfile para nueva estructura
  5. Revisar nginx.conf para SPA routing
  6. Verificar build de Docker funcione
  7. Verificar tests pasan

---

### Open Questions (Resueltas)
1. ~~SPA o multi-página~~ → **SPA con History API**
2. ~~Emoji o SVG~~ → **SVG (Lucide Icons)**
3. ~~Cambios en backend~~ → **No se toca el backend**
