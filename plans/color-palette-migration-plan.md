## Plan: kuNNA Color Palette Migration

Migrate the entire kuNNA UI from the current cyan/purple dark theme to a new 5-color palette: Vibrant Coral (#FF595E), Ink Black (#0D1321), Beige (#EFF0D1), Muted Teal (#77BA99), and Air Force Blue (#598392). Each HTML file will be updated independently since there is no shared CSS file.

**Color Mapping:**

| Role | Current | New |
|------|---------|-----|
| Backgrounds (primary/secondary/card) | `#0f0f23` / `#1a1a2e` / `#16213e` | `#0D1321` / `#141e2e` / `#1a283a` |
| Primary accent | `#00d4ff` (cyan) | `#77BA99` (Muted Teal) |
| Secondary accent | `#a855f7` / `#7c3aed` (purple) | `#FF595E` (Vibrant Coral) |
| Text primary | `#ffffff` / `#e2e8f0` | `#EFF0D1` (Beige) |
| Text secondary | `#94a3b8` (slate) | `#598392` (Air Force Blue) |
| Border | `#2d3748` | `rgba(89,131,146,0.3)` (Air Force Blue @ 30%) |
| Success / running | `#10b981` (green) | `#77BA99` (Muted Teal) |
| Warning / paused | `#f59e0b` (amber) | `#598392` (Air Force Blue) |
| Danger / stopped | `#ef4444` (red) | `#FF595E` (Vibrant Coral) |
| Glow / shadows | `rgba(0,212,255,...)` | `rgba(119,186,153,...)` (Muted Teal) |
| Remote badge gradient | `#667eea → #764ba2` | `#598392 → #FF595E` |
| Nav button gradient | `#7c3aed → #a855f7` | `#FF595E → #77BA99` |
| Default service color | `#3b82f6` (blue) | `#598392` (Air Force Blue) |
| Unknown status | `#6b7280` (gray) | `#598392` (Air Force Blue) |

**Phases (4 phases)**

1. **Phase 1: frontend/index.html**
    - **Objective:** Update all CSS custom properties, hardcoded hex/rgba colors in CSS, and inline JS color references.
    - **Files/Functions to Modify:** `frontend/index.html`
    - **Tests to Write:** Visual verification (no automated tests — pure CSS/HTML changes)
    - **Steps:**
        1. Replace `:root` CSS variables with new palette values
        2. Replace all hardcoded hex colors in CSS (gradients, rgba, status colors, button hovers)
        3. Replace inline JS color references (nav button gradient, default service color)

2. **Phase 2: frontend/scada.html**
    - **Objective:** Update CSS variables and all hardcoded colors in CSS and D3 JavaScript rendering code.
    - **Files/Functions to Modify:** `frontend/scada.html`
    - **Tests to Write:** Visual verification
    - **Steps:**
        1. Replace `:root` CSS variables with new palette values
        2. Replace hardcoded CSS colors (gradients, button hovers)
        3. Replace D3/JS hardcoded colors (link strokes, particles, status colors, traffic colors)

3. **Phase 3: frontend/servers.html**
    - **Objective:** Update CSS variables and all hardcoded colors.
    - **Files/Functions to Modify:** `frontend/servers.html`
    - **Tests to Write:** Visual verification
    - **Steps:**
        1. Replace `:root` CSS variables with new palette values
        2. Replace hardcoded CSS colors (gradients, status badges, shadows, modal overlay)

4. **Phase 4: admin/servers.html**
    - **Objective:** Update CSS variables and all hardcoded colors (mirrors frontend/servers.html).
    - **Files/Functions to Modify:** `admin/servers.html`
    - **Tests to Write:** Visual verification
    - **Steps:**
        1. Replace `:root` CSS variables with new palette values
        2. Replace hardcoded CSS colors (gradients, status badges, progress bar)

**Open Questions (Resolved)**
1. Warning/paused → Air Force Blue (#598392) ✅ Approved
2. Background depth variations of Ink Black ✅ Approved
3. HTTP traffic: 2xx → Muted Teal, 4xx → Air Force Blue, 5xx → Vibrant Coral ✅ Approved
