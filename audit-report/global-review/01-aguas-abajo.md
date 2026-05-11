# Auditoría Global – Aguas Abajo (R1–R5)

**Alcance:** Recepción de materiales, calidad inicial, consumo de lotes, producción y trazabilidad continua.  
**Fuentes analizadas:**  
- `src/server/actions/goods-receipt.actions.ts`  
- `src/server/actions/quality.actions.ts`  
- `src/server/actions/production.actions.ts`  
- `src/domain/ssot.ts` (tipos canónicos)  
- `src/lib/trace/FirestoreTracer.ts`, `src/features/trace/*` (lectura auxiliar)

---

## 1. Recepción de materiales (R1.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Creación de lotes, onHand y stockMoves cumple con SSOT (uso de `LotSchema`, `makeOnHandId`, normalización de UoM). | ✅ | `createGoodsReceipt` |
| Se generan `TraceEvent` tipo `ARRIVED` pero con tipos locales (`TraceEventPhase` admite `LOGISTICS`, `QUALITY`), rompiendo la uniformidad con `ssot.ts`. | ⚠ | Tipos ad hoc en `goods-receipt.actions.ts` |
| No existe integración real con Gemini (observación de incoherencias, severidad, tareas automáticas). | ⚠ | Hooks ausentes |
| No se enriquecen trace events con hashes idempotentes (`alertKey/taskKey`), coste o normalización extra de proveedor. | ⚠ | Evento `ARRIVED` con `data` mínima |

**Recomendaciones rápidas**
- Sustituir tipos locales por los canónicos (`TraceEventKind`, `TraceEventPhase`) desde `@/domain/ssot`.
- Centralizar la generación de `TraceEvent` en un helper común (permitirá añadir `alertKey`, metadatos).
- Implementar hook Gemini: validar campos, asignar severidad, crear tasks automáticas.

---

## 2. QC inicial (R2.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| `releaseOrRejectLot` cubre validación, actualización de lotes/onHand y crea `TraceEvent`/`QualityRelease`. | ✅ | `quality.actions.ts` |
| Hooks `createGeminiAlert`, `createRejectionFollowupTask`, emails están stubbed → no hay automatización real. | ⚠ | Funciones `console.log` |
| No hay guardas que bloqueen consumo de lotes que siguen en `HOLD`/`IN_PROGRESS`. | ⚠⚠ | Consumo permitido en producción/ventas |
| `startQcReview` y `getPendingLots` ayudan al flujo, pero no generan tareas/alertas cuando el lote excede tiempos de retención. | ⚠ | Falta integración agenda |

**Recomendaciones rápidas**
- Implementar los hooks stubbed para crear tareas, alertas y correos vía Gemini/SB agenda.
- Añadir reglas de negocio en capa de dominio para impedir consumos de lotes no liberados.
- Incorporar métricas históricas en `TraceEvent` (duración QC, COA, proveedor).

---

## 3. Uso del lote (R3.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| `completeProductionOrder` descuenta consumos y genera lotes nuevos (consistencia básica). | ✅ | `production.actions.ts` |
| No valida el `qcStatus` del lote antes de consumirlo (riesgo FEFO/QA). | ⚠⚠ | Falta de checks previos |
| No existe FEFO inteligente ni replanificación automática ante caducidades o QC incompleto. | ⚠ | Hooks Gemini ausentes |
| No se registran tareas de recolocación o alertas por caducidad próxima. | ⚠ | Sin integración tasks |

**Recomendaciones rápidas**
- Añadir validación de `lot.qcStatus === 'PASSED'` (o condición configurada) previa al consumo.
- Integrar Gemini para detectar caducidades y violaciones FEFO, generando tareas.

---

## 4. Producción (R4.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Movimientos de stock, lotes PENDING QC, trace events `CONSUME/OUTPUT` funcionan. | ✅ | `completeProductionOrder` |
| `TraceEvent` tipado como `any`; metadatos de desviaciones, mermas, tiempos no se guardan de forma estructurada. | ⚠ | Traza minimalista |
| No se computa `LotCostSummary` ni se anotan KPIs de OEE/coste por lote. | ⚠ | Falta módulo coste |
| Ausente integration con Gemini para detener/inspeccionar ante mermas anómalas. | ⚠ | Sin hook |

**Recomendaciones rápidas**
- Cambiar `TraceEvent` a tipado SSOT y definir payload con desviaciones, merma, tiempos.
- Calcular coste real por lote y persistir `LotCostSummary`.
- Hook Gemini para analizar mermas, cuellos de botella y generar subtareas.

---

## 5. Trazabilidad y calidad continua (R5.x)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Se registran eventos principales (`ARRIVED`, `CONSUME`, `OUTPUT`, `QC_TEST`). | ✅ | Acciones revisadas |
| No se generan relaciones de genealogía (`GENEALOGY_PARENT/CHILD`) ni se garantiza evento en transición `HOLD→RELEASED`. | ⚠ | Falta en `completeProductionOrder`/`releaseOrRejectLot` |
| Eventos no incluyen `alertKey/taskKey`, dificultando idempotencia y deduplicación. | ⚠ | Data actual |
| No hay analítica automática (Gemini) sobre huecos en trazabilidad o auditoría. | ⚠ | Sin reporting automático |

**Recomendaciones rápidas**
- Implementar helper de genealogía al crear lotes hijos (`TRACE_EVENT` + `lotGenealogy`).
- Añadir `alertKey`/`taskKey` y canalización a motor Gemini para auditoría proactiva.

---

## Conclusiones Generales

1. **Tipado no unificado** – Funciones server-side siguen creando `TraceEvent` con tipos ad hoc. Urgente consolidar en helper compartido que utilice `ssot.ts`.
2. **Automatizaciones Gemini ausentes** – Descripciones del flujo mencionan observaciones/decisiones automatizadas, pero actualmente no existen: prioridad alta para recepción y QC.
3. **Controles de QC incumplidos** – No se bloquea el consumo de lotes en `HOLD`/`IN_PROGRESS`. Riesgo operativo crítico.
4. **Trazabilidad parcial** – Falta genealogía, datos enriquecidos e idempotencia; dificulta auditorías y alertas.
5. **KPIs desaprovechados** – No se calculan costes ni mermas con granularidad necesaria para las decisiones mencionadas.

---

## Próximos pasos sugeridos

1. **Factory de Trace Events**  
   - Crear módulo central (`lib/trace/events.ts`) que reciba `{kind, phase, title, data}` y use tipos SSOT + `alertKey`.
   - Emitir eventos desde server actions reutilizando helper.

2. **Gemini Hooks Reales**  
   - Implementar clients en recepción, QC y producción para analizar datos (coherencia, severidad, mermas) y generar alerts/tasks.
   - Definir `GeminiObservation`/`GeminiDecision` en `businessRules.ts`.

3. **Política de Consumo de Lotes**  
   - Middleware/validator antes de decrementar `onHand` para forzar `qcStatus === PASSED` (salvo excepciones configurables).
   - Añadir reglas en `businessRules.ts` (`allowConsumeOnHold=false`).

4. **Genealogía + Costes**  
   - Registrar `TraceEvent` `GENEALOGY_PARENT/CHILD` cada vez que se crea un lote hijo.
   - Persistir `LotCostSummary` al finalizar producción.

5. **Integración con agenda/tasks**  
   - Conectar los findings (ej. lotes retenidos > SLA) con `tasks` del módulo QuickLog/SantaBrain.

---

**Estado checklist general:** `Aguas abajo` ✅ completado. El resto de fases se continuará en los siguientes informes.
