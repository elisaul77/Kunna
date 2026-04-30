# Plan: Mejorar la experiencia del dashboard de kuNNA

## Fase 1: Consistencia UI y Notificaciones
**Objective:** Unificar estilos CSS y reemplazar alert() por toasts
**Files:** `frontend/index.html`, `frontend/scada.html`, `frontend/servers.html`
**Steps:**
1. Extraer CSS común a un archivo compartido o copiar variables a servers.html
2. Implementar sistema de toast notifications para reemplazar alert()
3. Agregar skeleton loading states mientras cargan servicios
4. Verificar consistencia de border-radius, padding, sombras

---

## Fase 2: Dashboard Mejorado
**Objective:** Mejorar búsqueda, filtros y cards del dashboard
**Files:** `frontend/index.html`
**Steps:**
1. Agregar filtro por estado (running/exited/paused/all)
2. Implementar debounce en búsqueda (300ms)
3. Agregar animación hover en cards con preview rápido
4. Agregar indicador de última actualización
5. Mostrar WebSocket connection status en el header

---

## Fase 3: SCADA Optimizado
**Objective:** Optimizar renderizado y agregar funcionalidad de búsqueda
**Files:** `frontend/scada.html`
**Steps:**
1. Cambiar refresh de topología completa a solo actualización de estados (patch selectivo)
2. Agregar campo de búsqueda para filtrar nodos
3. Persistir posiciones de nodos en localStorage
4. Agregar botón para "lock layout" que evite re-layout
5. Mejorar leyenda con opción de toggle

---

## Fase 4: Detener Duplicados del Monitor Docker
**Objective:** Evitar que docker_monitor.py cree servicios duplicados
**Files:** `docker_monitor.py`, `backend/app.py`
**Steps:**
1. Modificar `get_existing_services()` para usar container_id en lugar de nombre
2. En `app.py` crear endpoint PUT que actualice en lugar de crear si ya existe container_id
3. Agregar deduplicación en `get_services()` del backend
4. Agregar campo `container_id` como unique key para servicios locales

---

## Fase 5: Accesibilidad y UX
**Objective:** Navegación por teclado, atajos, y mejor feedback visual
**Files:** `frontend/index.html`, `frontend/scada.html`
**Steps:**
1. Agregar atajos de teclado (R para refresh, N para nuevo servicio, / para focus search)
2. Implementar ARIA labels para screen readers
3. Agregar indicador de conexión WebSocket (verde/rojo en header)
4. Implementar "copiar URL" en cards con feedback visual
