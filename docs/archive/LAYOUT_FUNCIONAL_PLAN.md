# Layout – Resumen funcional y plan de implementación (módulo a módulo)

Este documento resume el estado actual de las funcionalidades del layout y propone un plan de trabajo por módulos para consolidar la experiencia (drawers, perfil, alertas, accesibilidad, etc.).

Nota de alcance: nos centramos en funcionalidades del layout y su ecosistema (no en navegación ni estructura de rutas).

## Contexto y arquitectura actual

- Layout autenticado (persistente): `src/app/(app)/layout.tsx`
  - Monta UI global: `Sidebar`, `DynamicHeader`, `DrawerController`, `BottomNav` y slot `drawer` para rutas interceptadas.
  - Controla autenticación con `authReady` y `firebaseUser` (evita flicker).
- Drawers globales con registro: `src/ui/drawers/DrawerController.tsx`, `src/ui/drawers/drawer-registry.tsx`
  - Contexto para abrir drawers desde cualquier componente (`useDrawer`).
  - Varios drawers stub listos para integrar datos reales.
- Panel de usuario: `src/components/layout/ProfileDrawer.tsx`
  - Incluye toggles de Tiempo Real (`RealtimeToggle`) y Persistencia (`PersistenceToggle`).
  - Gestión de scroll y cierre por ESC en este drawer.
- Alertas: `useAlerts` consumido en `src/app/(app)/layout.tsx`, render en `DynamicHeader`.
- Estilos y patrones comunes: `src/styles/components.css` (clases `sb-drawer`, `sb-app`, `sb-main`, `sb-page`).
- UI responsive: drawer como bottom-sheet en móvil y side-sheet en desktop, `BottomNav` móvil.

## Fortalezas

- Patrón de drawers centralizado y extensible (apertura desde cualquier widget).
- Guard de autenticación correcto (espera a `authReady`).
- Perfil y ajustes rápidos integrados en un drawer coherente.
- Diseño responsive de drawers con transiciones claras.

## Hallazgos funcionales (gaps)

- Drawers stub heterogéneos: no todos tienen overlay, foco/ESC unificados o atributos ARIA.
- Accesibilidad del panel de alertas: falta manejo de foco/ESC y roles adecuados.
- Toggles de Tiempo Real/Persistencia: wiring parcial; falta persistencia de preferencia y efectos en proveedores de datos.
- Slot `drawer` (rutas interceptadas): sin ejemplos ni guía de uso unificada.
- Z-index y stacking con literales dispersos (`z-[40]`, `z-[9999]`, drawers `z=70`).
- Tests limitados: sin E2E ni unit específicos para overlays y accesibilidad.

## Plan de implementación (módulo a módulo)

### Módulo 1 — Infraestructura de Drawers Unificada

Objetivo: homogeneizar comportamiento y accesibilidad de todos los drawers abiertos vía `DrawerController`.

- Cambios clave
  - Overlay global controlado por `DrawerController` con cierre por click y ESC.
  - Focus trap y retorno de foco al invocador; bloqueo de scroll del body mientras abierto.
  - Atributos ARIA (`role=dialog`, `aria-modal`, `aria-labelledby`).
  - Tipado de `DrawerPayload` por drawer (discriminado) y documentación mínima de props.

- Tareas
  - Añadir overlay y gestionarlo en `src/ui/drawers/DrawerController.tsx`.
  - Extraer util de focus trap (hook) reutilizable: `useFocusTrap`.
  - Revisar drawers stub e incorporar cabecera con `id` para `aria-labelledby`.
  - Mantener estilos existentes (`sb-drawer`) y añadir tokens de z-index (ver Módulo 6).

- Criterios de aceptación
  - ESC cierra cualquier drawer abierto y devuelve foco al botón/trigger que lo abrió.
  - Navegación por Tab contenida dentro del drawer.
  - Overlay clicable que cierra y respeta scroll lock.

### Módulo 2 — Toggles de Perfil: Tiempo Real y Persistencia

Objetivo: que los toggles alteren el comportamiento de datos en tiempo real y la persistencia local con feedback y persistencia de preferencia.

- Cambios clave
  - Proveedor global `RealtimeProvider`/`SettingsProvider` para exponer estado y efectos.
  - Persistencia de preferencia en `localStorage` y (si aplica) perfil de usuario.
  - Wiring con proveedores de datos (p.ej., activar/desactivar onSnapshot/streams; cache offline).

- Tareas
  - Crear contexto de ajustes (`src/components/providers/SettingsProvider.tsx`).
  - Conectar `RealtimeToggle` y `PersistenceToggle` a este contexto.
  - Exponer callbacks para que capas de datos ajusten suscriptores/cache.

- Criterios de aceptación
  - Al recargar, los toggles mantienen su estado.
  - Cambiar “Tiempo real” inicia/para listeners; “Persistencia” activa/desactiva cache.
  - Feedback con `Toaster` al cambiar estado o en error.

### Módulo 3 — Alertas: Accesibilidad y Robustez

Objetivo: panel de alertas accesible, escalable y con acciones básicas robustas.

- Cambios clave
  - Cierre por ESC, foco inicial en el panel y navegación de lista con teclado.
  - “Marcar todas” con actualización optimista y rollback en fallo.
  - Paginación/carga incremental (si el feed crece).

- Tareas
  - Mejorar `src/components/layout/DynamicHeader.tsx` (manejo de foco, roles, eventos teclado).
  - Extender `useAlerts` con `markAllRead` optimista y soporte de paginación (si procede).
  - Telemetría de aperturas y clicks (ver Módulo 7).

- Criterios de aceptación
  - Panel operable solo con teclado; lector de pantalla anuncia correctamente.
  - “Marcar todas” actualiza de inmediato y se recupera ante error.

### Módulo 4 — Búsqueda Global (Command Palette)

Objetivo: habilitar una paleta de comandos para buscar entidades y ejecutar acciones rápidas.

- Cambios clave
  - Implementar palette (custom o librería) invocada desde `onOpenSearch` del `DynamicHeader` y atajo (p.ej., ⌘K).
  - Índices/queries para entidades principales (cuentas, pedidos, lotes, tareas).
  - Acciones de navegación/creación (abrir drawers “nuevo X”).

- Tareas
  - Componente `GlobalCommandPalette` y contexto para registro de comandos.
  - Fuente de datos (mock primero, proveedor real después).
  - Integración con `DrawerController` para acciones de creación.

- Criterios de aceptación
  - Apertura con botón y atajo; resultados relevantes con highlight.
  - Navegable con teclado y accesible (aria, roles de listbox/menu).

### Módulo 5 — Rutas Interceptadas (slot `drawer`)

Objetivo: establecer un patrón para que páginas de detalle/creación se presenten en drawer usando parallel/intercepted routes.

- Cambios clave
  - Guía y ejemplos de uso de `drawer` en `src/app/(app)/layout.tsx`.
  - Patrones: “Detalle en drawer” y “Crear entidad en drawer” sin perder contexto de la lista.

- Tareas
  - Crear una demo (p.ej., detalle de tarea) como intercepted route que inyecta su UI en `drawer`.
  - Documentar estructura de carpetas y convenciones.

- Criterios de aceptación
  - Navegar a una entidad abre el drawer y la URL refleja el estado; back cierra drawer.

### Módulo 6 — Accesibilidad y Tokens de Z-Index

Objetivo: normalizar capas visuales y asegurar accesibilidad transversal.

- Cambios clave
  - Definir variables CSS para z-index (`--z-header`, `--z-drawer`, `--z-popover`, `--z-nav`).
  - Sustituir literales por tokens en componentes afectados.
  - Revisión de roles/aria y atajos (ESC/Tab) en overlays y menús.

- Tareas
  - Añadir tokens en `:root` (p.ej., en `globals.css` o `components.css`).
  - Reemplazar z-index en `Sidebar`, `DynamicHeader`, `DrawerController`, `ProfileDrawer`.

- Criterios de aceptación
  - Sin solapes incorrectos entre header, popovers y drawers; auditoría manual de foco.

### Módulo 7 — Observabilidad y Telemetría

Objetivo: instrumentar eventos clave para medir uso e identificar fricción.

- Cambios clave
  - Eventos: abrir/cerrar drawer (tipo, duración), cambios de toggles, panel de alertas (apertura, clicks, marcar todas), uso de búsqueda.
  - Integración con `MonitoringBoot`/plataforma existente.

- Tareas
  - Helper de tracking con tipado de eventos.
  - Emisión en puntos críticos de UI.

- Criterios de aceptación
  - Eventos visibles en la plataforma de monitorización con metadatos útiles.

### Módulo 8 — Testing (E2E + Unit)

Objetivo: cubrir las rutas críticas del layout y garantizar no-regresiones.

- Cambios clave
  - E2E (Playwright): abrir/cerrar drawers, panel de alertas, toggles con persistencia, command palette.
  - Unit: helpers (`moduleFromPath` si aplica al header), hooks de focus/overlay, lógica de `useAlerts`.

- Tareas
  - Añadir test suite E2E con fixtures básicos.
  - Unit tests sobre hooks/utilidades nuevas.

- Criterios de aceptación
  - CI ejecuta los tests y cubre flujos críticos del layout.

## Roadmap sugerido (3 sprints)

- Sprint 1: Módulos 1, 6 (parcial tokens), 8 (tests base)
  - Resultado: drawers accesibles y consistentes; base de z-index; primeras pruebas E2E.
- Sprint 2: Módulos 2, 3, 7
  - Resultado: toggles conectados, alertas robustas y telemetría activa.
- Sprint 3: Módulos 4 y 5
  - Resultado: búsqueda global operativa e interceptadas integradas en el slot `drawer`.

## Riesgos y mitigaciones

- Complejidad de focus-management: aislar en un hook reutilizable, tests de teclado.
- Integración con proveedores de datos (Tiempo real/Persistencia): empezar con mocks y feature flags.
- Cambios de stacking context: introducir tokens gradualmente y validar visualmente en vistas clave.

## Métricas de éxito (KPIs)

- Tasa de uso de drawers vs. modales legacy; tiempo medio en drawer.
- Latencia percibida y errores al cambiar toggles.
- Aperturas de panel de alertas, ratio de “marcar todas”, errores de API.
- Uso de búsqueda (aperturas, conversiones a acción/navegación).

---

Si se aprueba el plan, se recomienda iniciar por Módulo 1 (infraestructura de drawers) y Módulo 6 (tokens), que son la base para el resto.

