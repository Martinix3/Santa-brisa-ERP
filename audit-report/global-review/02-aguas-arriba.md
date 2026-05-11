# Auditoría Global – Aguas Arriba (R6–R11)

**Alcance:** Modelo comercial aguas arriba (cuentas, distribuidores, QuickLog + Santa Brain, pedidos, logística, marketing/POS).  
**Fuentes analizadas:**  
- `src/server/actions/accounts-data.ts`  
- `src/features/sales/pipeline/pipeline.actions.v2.ts` y componentes asociados (`AccountCard`, `AccountDrawer`, etc.)  
- `src/features/quicklog/QuickLogForm.tsx`  
- `src/server/actions/santa-brain.actions.ts`  
- `src/app/(app)/orders/actions.ts` (stubs actuales)  
- `src/features/orders/components/*` (visión UI)  
- Documentación SSOT (`src/domain/ssot.ts`) para referencia de tipos.

---

## 6. Modelo de negocio & cuentas (R6.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| `accounts-data.ts` expone lectura masiva y edición de campos (segment, stage, flow, customerType) sin capa de reglas ni trazabilidad. Cambios se aplican directamente a Firestore. | ⚠ | `updateAccountField`, `updateAccountBulk`, `updateAccountsBatch` |
| No hay priorización automática de cuentas en riesgo: se depende de exports y filtros manuales. | ⚠ | Ausencia de scoring/alertas en código |
| SSOT define metadatos (`ACCOUNT_STAGE_META`, `DEFAULT_BUSINESS_RULES`), pero no hay motor que los aplique para generar alertas o tareas. | ⚠ | `src/domain/ssot.ts` |

**Recomendaciones rápidas**
1. Crear `businessRules.accounts.ts` que evalúe métricas (días sin pedido/visita, riesgo churn) y exponga resultados a Gemini + agenda.
2. Instrumentar cambios críticos (`stage`, `flow`) en `TraceEvent` (fase `SALE`) y/o `AuditLog`.
3. Construir vistas agregadas (cuentas ↔ pedidos ↔ interacciones) en DataProvider para alimentar dashboards y recomendaciones.

---

## 7. Interacciones comerciales (QuickLog + Santa Brain) (R7.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| QuickLog captura acciones manuales/voz y envía payload a `saveSantaBrainData`. | ✅ | `QuickLogForm.tsx` |
| `saveSantaBrainData` mezcla responsabilidades: fuzzy matching de cuentas, creación de cuentas, registro de interacciones/pedidos/eventos/POS y creación de tareas. Código de +600 líneas sin separación por dominio. | ⚠⚠ | `santa-brain.actions.ts` |
| Tareas generadas siguen formato legacy (`status: 'todo'`, `kind` minúsculo), sin integrarse con `TaskNew` (`pipeline.actions.v2.ts`). | ⚠ | mismatch TaskNew vs legacy |
| Clasificación/NBA real (Gemini) no está implementada; se usa heurística básica de palabras negativas. | ⚠ | `saveSantaBrainData` |
| No se registran `TraceEvent` para interacciones/pedidos creados automáticamente. | ⚠ | Falta trazabilidad |

**Recomendaciones rápidas**
1. Refactorizar `saveSantaBrainData` en servicios: `resolveAccount`, `recordInteraction`, `recordOrder`, `recordEvent/POS`, `createTasks`, cada uno devolviendo `TraceEvent`.
2. Migrar a `TaskNew` (usar `createPipelineTask` o nuevos helpers) con `alertKey/taskKey` para idempotencia.
3. Añadir capa Gemini: clasificación de intención (NLP) y sugerencias (NBA) antes de persistir.

---

## 8. Distribuidores (portal) (R8.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| No se localizaron server actions específicas del portal; el código actual solo distingue distribuidores mediante `getUserDistributor` en Santa Brain. | ⚠ | Lógica dispersa |
| El mapa de negocio define métricas de sell-out/SLA, pero no hay implementaciones de scoring, alertas o `TraceEvent` `DISTRIBUTOR_PORTAL_ACTIVITY`. | ⚠ | Ausente en repo |
| Falta reconciliación automática de datos del portal (incidencias, documentos). | ⚠ | No hay jobs/reportes |

**Recomendaciones rápidas**
1. Consolidar las acciones del portal en `server/actions/distributor.actions.ts` con eventos `TraceEventPhase = 'SALE'/'DELIVERY'`.
2. Implementar job nocturno que calcule KPIs distribuidor (sell-in vs sell-out, SLA) y alimente Gemini + tasks.
3. Registrar actividades del portal con `TraceEvent` + `alertKey`.

---

## 9. Pedidos y tipos de venta (R9.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Server actions principales (`placeOrder`, `placeQuickOrder`, `importShopifyOrder`) son stubs. La creación efectiva de pedidos ocurre directamente en Firestore desde Santa Brain u otras capas. | ⚠⚠ | `orders/actions.ts` |
| Falta tipado/validación por `CommercialFlow`; las órdenes se insertan con campos sueltos (`status: 'CONFIRMED'`, sin control FEFO/stock). | ⚠ | `saveSantaBrainData` |
| Tasks `order_prep` existen (`pipeline.actions.v2.ts`) pero no hay flujo end-to-end que conecte confirmación/stock/logística. | ⚠ | pipelines |
| Automatización Gemini para riesgo de fraude/stock no implementada. | ⚠ | Ausente |

**Recomendaciones rápidas**
1. Implementar `placeOrder` completo: validar payload, reservar stock FEFO, crear `TraceEvent` (`SHIPMENT`, `SALE`), disparar tasks/mensajes Gemini.
2. Extraer asignación de lotes (respetar QC/FEFO) a helper reutilizable.
3. Conectar tasks `order_prep` con el estado del pedido (al completar task ⇒ actualizar `status`).

---

## 10. Logística (R10.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| No se revisaron acciones específicas de preparación/etiquetado; se detectan stubs y ausencia de `TraceEvent` logísticos en módulos analizados. | ⚠ | Requiere revisión de `/app/api/shipment/*` |
| Automatizaciones Sendcloud (selección carrier, SLA) y reconciliación de incidencias no están visibles. | ⚠ | Faltan hooks |
| No hay `alertKey`/`taskKey` para incidentes logísticos; mapeo a lotes es manual. | ⚠ | Trazabilidad parcial |

**Recomendaciones rápidas**
1. Auditar `/app/api/shipment/[shipmentId]/*` y consolidar en `server/actions/logistics.actions.ts` con eventos `TraceEventKind = 'SHIPMENT'`.
2. Integrar Sendcloud: client único, manejo de errores, recomendación de carrier (Gemini).
3. Crear workflow para incidencias: `TraceEvent` + tasks + bloqueo de lotes (cuando procede).

---

## 11. Marketing & POS (R11.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Santa Brain crea registros `marketingEvents` y `posTactics`, pero sin métricas ROI ni estados (`status`, `result`). | ⚠ | `saveSantaBrainData` |
| No se detecta automatización de reposición POS ni evaluación ROI; QuickLog solo guarda notas. | ⚠ | Falta análisis |
| Ausencia de dashboards/alertas integrados al pipeline de marketing. | ⚠ | No hay jobs |

**Recomendaciones rápidas**
1. Extender schema `posTactics`/`marketingEvents` con métricas (coste, ROI, estatus) y alimentar dashboards.
2. Definir hooks Gemini para recomendaciones POS/campañas basadas en ventas.
3. Conectar eventos POS con tasks de seguimiento (estado `INSTALADO`, `RETIRADO`).

---

## Conclusiones generales Aguas Arriba

1. **Stubs críticos** – Pedidos, logística e integraciones (Shopify, Holded, Sendcloud) requieren implementación real; hoy se depende de escrituras directas a Firestore.
2. **Acoplamiento excesivo** – `saveSantaBrainData` concentra múltiples dominios; urge modularizar en servicios separados y adoptar patrones de `TraceEvent`.
3. **Gemini no integrado** – Las decisiones automatizadas descritas en el mapa de negocio no se encuentran en el código actual; se necesitan hooks reales y estructuras de reglas (`businessRules.ts`).
4. **Tasks heterogéneas** – Coexisten tasks legacy y `TaskNew`; unificar para facilitar reporting y automatización.
5. **Falta trazabilidad** – Pedidos, logística y marketing carecen de eventos estructurados (`TraceEvent`, `alertKey`), lo que impide auditorías end-to-end.

---

## Quick Wins sugeridos

1. **Factory de Trace Events comercial**  
   - Similar al plan aguas abajo, crear helper `createTraceEvent({phase:'SALE', kind, data})` y usarlo en todas las acciones comerciales/logísticas.  
   - Añadir `alertKey` para idempotencia.

2. **Modularizar Santa Brain**  
   - Dividir en servicios (`accountService`, `interactionService`, `orderService`, `taskService`).  
   - Reutilizar `TaskNew` (`createPipelineTask`) para las tareas generadas automáticamente.

3. **Implementar `placeOrder` real**  
   - Consumir services (reservas FEFO, pricing) y disparar tasks + Gemini (fraude, stock).  
   - Conectar `order_prep` con cierre de pedido.

4. **Portal de distribuidores**  
   - Exponer acciones con `TraceEvent` dedicado y job de SLA.  
   - Integrar con pipeline de tareas (scoring de distribuidores).

5. **Marketing/POS**  
   - Estandarizar schema + tareas de seguimiento, habilitar ROI y reposiciones automáticas.

---

**Checklist progreso:**  
- Aguas abajo ✅ documentado (`01-aguas-abajo.md`).  
- Aguas arriba ✅ documentado (este informe).  
- Integraciones/conciliaciones, capa SSOT + hooks, síntesis final: pendientes en fases siguientes.
