# Auditoría de Calidad (Dashboard, Plans, Releases, Traceability)
_Fecha: 2025-10-18_

## Resumen operativo
- **Páginas client-side:** `quality/dashboard`, `quality/plans`, `quality/releases`, `quality/traceability`. Todas dependen de `useData`, cargando datasets completos (lots, qcTests, qualityReleases, qcPlans, stockMoves, etc.) en el cliente.
- **Server actions clave:** `quality.actions.ts`, `quality-plans.ts`, `quality-gemini.ts`, `traceability/actions.ts`. Varias operaciones siguen siendo stubs para tareas, alertas y emails.
- **Componentes asociados:** `ReleaseLotDrawer`, `QualityBadge`, `QcTestCard`, dashboards, etc.

## Observaciones clave

### 1. Acciones y automatización incompletas
- `releaseOrRejectLot` valida y escribe datos, pero las integraciones posteriores (`createGeminiAlert`, `createRejectionFollowupTask`, `queue*Email`, `checkStockAlertsAfterApproval`) están stubbed → no hay tareas, alertas ni notificaciones reales.
- `ReleaseLotDrawer` envía siempre `'current-user-id'` y usa `alert()` para errores; no consume el contexto de autenticación ni el sistema de toasts/alertKey.
- `quality-gemini` recalcula insights cada llamada leyendo colecciones completas de Firestore; no persiste los resultados en `GeminiAnalysis` ni respeta límites/paginación.

### 2. UI / UX inconsistente
- **Dashboard:** múltiple encabezados, tarjetas sin tokens, mezcolanza de clases (`text-gray-900`, `sb-card-glass-light`). Todo el cálculo (KPIs, tendencias) se hace en cliente a partir de `useData`.
- **Planes:** diálgos inflados (`isCreating`) basados en modales custom sin accesibilidad; filtros con inputs nativos sin tokens. Las estadísticas usan `toFixed` sin formato localizado.
- **Liberaciones:** lista móvil sin detalle real (al hacer click sólo muestra un toast “ver detalles”); no existe drawer/panel resumen. Export y refresh son stubs.
- **Traceability:** UI muy cargada visualmente, sin tokens consistentes; eventos construidos ad-hoc y sin friendly labels.

### 3. React Data / Rendimiento
- `useData` trae colecciones completas: con volúmenes grandes (qcTests, qualityReleases, stockMoves) la página se vuelve lenta.
- `traceability/actions.ts` descarga TODO `onHand` para filtrar por `lotNumber` y crea `TraceEvent` sin `TraceEventFactory`; mezcla `console.log` y no normaliza `phase/kind`.
- No hay paginación ni lazy-loading: `quality/releases` filtra en memoria, `quality/plans` idem.

### 4. SSOT y consistencia de datos
- `QualityReleaseFormData` usa `sku`/`itemId` indistintamente; faltan helpers para obtener el canonical (party/item).
- `releaseOrRejectLot` no bloquea consumo de lotes HOLD/IN_PROGRESS previo (depende de que la UI lo respete).
- Recepción de datos en traceability no enriquece lot con categoría, stdCost, etc.; se muestra “N/A”.

### 5. Gemini / business rules
- El dashboard enseña tarjetas “alerts”, pero no hay `alertKey/taskKey` persistidos. Si se recarga, se recalcula todo y se pierden decisiones previas.
- No existe conexión con `businessRules` (por ejemplo, lotes > SLA). Todo se queda en componentes client-side.

### 6. Accesibilidad y patrones UI
- `ReleaseLotDrawer` y otros paneles no usan el nuevo `BaseDrawer`: focus trap manual, overlays legacy, botones sin `aria-label`.
- Formularios de planes/test no muestran errores accesibles, usan `confirm()`/`alert()`.
- Tablas y listas no tienen roles/labels; iconos sin `aria-hidden`.

## Sugerencias de mejora (añadidas al registro)
1. **Completar automatizaciones post-QC**: implementar `createGeminiAlert`, tareas de seguimiento, emails y bloqueos usando `alertKey/taskKey`.  
2. **Migrar ReleaseLotDrawer a BaseDrawer** con contexto de usuario real, toasts y `alertKey`/`taskKey`.  
3. **Persistir insights Gemini** en `GeminiAnalysis`, reutilizar resultados y evitar fetch exhaustivo en cada request.  
4. **Convertir páginas a server components / paginadas**: dashboard, releases, plans y traceability deberían cargar datasets filtrados desde el servidor.  
5. **Refactor Traceability**: usar `TraceEventFactory`, consultar `onHand` por índice, enriquecer lot con SSOT y simplificar UI con tokens.  
6. **Friendly codes y metadatos en QA**: mostrar lotes con nomenclatura clara, categoría, stdCost, y links a trace events.  
7. **Unificar estilos/tokens**: cabeceras `sb-page` coherentes, botones `sb-btn`, grids con clases estándar y sin `text-gray-*`.  
8. **Detallado de liberaciones**: crear drawer/dossier con histórico, tests, comentarios, adjuntos, trace events relacionados.  
9. **Planes con formularios accesibles**: reemplazar modales custom por drawer/form server-driven, mostrar validaciones inline, permitir duplicar con control de versiones.  
10. **Catálogo de tests parametrizable**: exponer parámetros (límites, unidades) desde SSOT en lugar de strings sueltos en la UI.

## Próximos pasos
- Priorizar las mejoras críticas (automatización post-QC, refactor traceability, releases drawer) para las fases F1-F2 del plan maestro.  
- Documentar decisiones Gemini (persistencia, orquestador) antes de avanzar a Fase 3.  
- Registrar tareas específicas en el tablero y coordinar con equipos de operación/calidad para validar la nueva UX.
