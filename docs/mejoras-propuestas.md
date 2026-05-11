# Registro de Mejoras Propuestas

Documento vivo para anotar ideas, necesidades y mejoras detectadas durante la implementación del plan maestro 2025. Cada entrada debe incluir contexto, estado y próximos pasos.

---

## Cómo usar este registro
- **Título corto** y **descripción** con el problema/idea.
- Asociar si aplica a una fase/domino (`F0`, `F1`, etc.).
- Mantener estado actualizado: `pendiente`, `en progreso`, `completado`, `descartado`.
- Añadir responsable y fecha cuando se asigne.

---

## Entradas actuales

### 1. Sistema de códigos amigables (lotes, SKUs, envíos)
- **Estado:** pendiente  
- **Fase sugerida:** Post Fase 1  
- **Descripción:** Unificar generación de IDs en `lib/codes.ts`, definir prefijos legibles, check digit simple y alias para uso externo. Asegurar que TraceEventFactory e IntegrationLogger registren ambos valores.
- **Próximos pasos:** Diseñar especificación, migrar generadores actuales y documentar los nuevos formatos.

### 2. Migración drawers existentes al patrón BaseDrawer
- **Estado:** pendiente  
- **Fase:** F1  
- **Descripción:** Actualizar QuickLog, QC, picking y el resto de drawers para usar `BaseDrawer` y aprovechar accesibilidad + contexto (ruleId, alertKey).  
- **Próximos pasos:** Inventario de drawers, migración progresiva y validación con checklist UX.

### 3. TraceEventFactory unificado
- **Estado:** completado (Fase 0)  
- **Descripción:** Crear factoría única para construir `TraceEvent` con tipos SSOT, fases por defecto y normalización de datos.  
- **Resultado:** Implementado en `src/lib/trace/trace-event-factory.ts` y aplicado en `goods-receipt.actions.ts`.

### 4. IntegrationLogger centralizado
- **Estado:** completado (Fase 0)  
- **Descripción:** Registrar todas las llamadas a integraciones con masking de datos sensibles, metadatos y soporte para correlaciones.  
- **Resultado:** Implementado en `src/server/integrations/integration-logger.ts` y usado desde `base-integration.ts`.

### 5. Reglas de negocio base + Gemini hooks
- **Estado:** completado (Fase 0)  
- **Descripción:** Definir `businessRules.ts` con evaluaciones iniciales (HOLD, caducidad, SLA envíos, churn, integraciones) e integrarlas con alertKey/taskKey para Gemini.  
- **Resultado:** Archivo `src/domain/businessRules.ts` disponible y listo para ampliación.

### 6. Drawer unificado accesible
- **Estado:** completado (Fase 0)  
- **Descripción:** Crear componente `BaseDrawer` con focus trap, accesibilidad, contexto (`ruleId`, `alertKey`, `taskKey`) y checklist documentado.  
- **Resultado:** `src/components/drawers/BaseDrawer.tsx`, `EntityDrawerShell` actualizado y guía en `docs/drawer-accessibility-checklist.md`.

### 7. Gemini Orchestrator & persistencia de insights
- **Estado:** pendiente  
- **Fase sugerida:** Fase 3  
- **Descripción:** Construir orquestador que ejecute analyzers (warehouse, quality, sales, etc.), guarde `GeminiAnalysis`, habilite historial e integración con tasks/alerts. Sustituir llamados ad-hoc actuales por pipeline central.  
- **Próximos pasos:** Definir modelo `GeminiAnalysis`, colas/jobs, conectar con `businessRules` y UI de seguimiento.

### 8. Inventario – Acciones reales y trace events
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Implementar `createManualOnHand`, `rebuildOnHand` y ajustes de stock usando Firestore (movimientos, lotes, QC), registrando `TraceEvent` y `alertKey/taskKey`.  
- **Próximos pasos:** Diseñar payloads, validar permisos, actualizar UI (`NewOnHandDialog`) y pruebas.

### 9. Inventario – Rollups y métricas confiables
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Corregir `computeSkuRollup` (lookup por `itemId`, valor inventario real), recalcular columnas en UI (reservado, free) y evitar duplicar qty en `lotRows`.  
- **Próximos pasos:** Ajustar helper, tests unitarios, actualizar componentes (`SkuAccordionRow`, `InventoryDashboard`, `LotRows`).

### 10. Inventario – Normalización filtros y lot detail
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Normalizar casing QC, exponer FEFO real (usar datos de lotes maestros), mejorar `LotDetailPanel` (cantidades por lote, trace events).  
- **Próximos pasos:** Añadir helpers, enriquecer `lotDetails` con info SSOT, UX review.

### 11. Inventario – Data fetching escalable
- **Estado:** pendiente  
- **Fase sugerida:** F2  
- **Descripción:** Migrar página de inventario a server component/paginación, evitar cargar todo `onHand/stockMoves` en cliente, dividir dashboards en componentes ligeros.  
- **Próximos pasos:** Plan RSC, endpoints paginados/filters server-side, medir rendimiento.

### 12. Inventario – Integración con Gemini & business rules
- **Estado:** pendiente  
- **Fase sugerida:** F3  
- **Descripción:** Usar `businessRules` para detectar stock crítico, lotes en HOLD > SLA, etc., y canalizar a Gemini (insights, tareas automáticas).  
- **Próximos pasos:** Mapear reglas -> UI, persistir en `GeminiAnalysis`, conectar con tasks agenda.

### 13. Inventario – Unificar UI con BaseDrawer
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Migrar `GoodsReceiptDrawer`, ajustes manuales y otros flujos al nuevo `BaseDrawer`, aplicando checklist de accesibilidad.  
- **Próximos pasos:** Refactor componentes, validar UX móvil/desktop, tests de interacción.

### 14. Inventario – Refinar UI/UX y tokens globales
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Consolidar cabeceras (título, toolbar, dashboard), aplicar tokens tipográficos/colores y alinear con el diseño de siglas.  
- **Próximos pasos:** Rediseñar `InventoryPage` con layout unificado, usar componentes base (`SBHeader`, `SBToolbar`) y validar accesibilidad.

### 15. Inventario – Drawer para nuevas recepciones
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Convertir el flujo de recepción en un drawer basado en `BaseDrawer` con focus trap y contexto (`ruleId`, `alertKey`).  
- **Próximos pasos:** Refactor UI, aplicar checklist accesibilidad, integrar autosave para líneas extensas y evitar fetches redundantes.

### 16. Inventario – Formulario inteligente de items/proveedores
- **Estado:** pendiente  
- **Fase sugerida:** F1/F2  
- **Descripción:** Autocompletar categoría, UoM, último coste y permitir registrar costes logísticos/aranceles cuando se selecciona item/proveedor.  
- **Próximos pasos:** Añadir API para recuperar histórico (últimos costes, proveedores), prellenar campos en recepciones/ajustes.

### 17. Calidad – Automatizaciones post-QC
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Implementar `createGeminiAlert`, tareas de seguimiento, emails y bloqueos tras `releaseOrRejectLot`, usando `alertKey/taskKey`.  
- **Próximos pasos:** Completar helpers, conectar con agenda/tasks y validar con operaciones.

### 18. Calidad – ReleaseLotDrawer unificado
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Migrar `ReleaseLotDrawer` a `BaseDrawer`, captar usuario real, reemplazar `alert()` por toasts y registrar contexto (ruleId, alertKey).  
- **Próximos pasos:** Refactor componente, usar `useDrawerContext`, tests de accesibilidad.

### 19. Calidad – Persistencia Gemini & orquestación
- **Estado:** pendiente  
- **Fase sugerida:** F3  
- **Descripción:** Guardar `GeminiAnalysis` al generar alerts/patrones, evitar recálculo completo y exponer historial en UI.  
- **Próximos pasos:** Diseñar colección `gemini_analyses`, colas batch y panel de insights.

### 20. Calidad – RSC y paginación en dashboard/releases/plans
- **Estado:** pendiente  
- **Fase sugerida:** F1/F2  
- **Descripción:** Transformar páginas de calidad en server components con data fetch filtrado, paginación y memorias mínimas en cliente.  
- **Próximos pasos:** Extraer queries a server actions, añadir filtros server-side y medir rendimiento.

### 21. Calidad – Refactor trazabilidad
- **Estado:** pendiente  
- **Fase sugerida:** F2  
- **Descripción:** Reescribir `getLotTraceability` para usar `TraceEventFactory`, consultas indexadas (`onHand` por lote) y summarizar datos SSOT (categoría, stdCost, FEFO).  
- **Próximos pasos:** Implementar nuevos eventos, friendly codes y simplificar UI con tokens.

### 22. Calidad – UI/UX cohesionada
- **Estado:** pendiente  
- **Fase sugerida:** F1  
- **Descripción:** Unificar headers, usar tokens (`sb-page`, `sb-toolbar`, tipografías), reemplazar modales legacy (planes/tests) por drawer/form accesible.  
- **Próximos pasos:** Diseñar layout común para dashboard/plans/releases, aplicar checklist y validar con usuarios de calidad.

---

_Añadir nuevas mejoras debajo de esta línea siguiendo el formato anterior._
