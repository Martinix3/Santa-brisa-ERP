# Auditoría Global – Capa SSOT & Gemini Hooks

**Alcance:** Revisión de la definición SSOT (`src/domain/ssot.ts`, schemas asociados) y evaluación del estado actual de los hooks Gemini (analyzers, actions, integración con tareas/alertas).  

---

## 1. Estado del SSOT

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| SSOT v5 agrupa todos los tipos y metadatos (trazabilidad, órdenes, cuentas, tasks…) en un único archivo de ~1.000 líneas. | ⚠ | `src/domain/ssot.ts` |
| Existen múltiples alias/`@deprecated` para mantener compatibilidad; cuesta identificar fields vigentes. | ⚠ | Comentarios en SSOT |
| No hay archivos derivados (`businessRules.ts`) que utilicen estos tipos para gobernar lógica; las reglas siguen incrustadas en acciones. | ⚠⚠ | Acciones server |
| Schemas zod sólo cubren partes (QualityRelease, QcTest…). Resto depende de TypeScript y no valida entrada. | ⚠ | `ssot.ts`, `ssot-schemas.ts` |
| TraceEvent centralizado, pero acciones siguen creando tipos propios ad hoc (ej. `goods-receipt.actions.ts`). | ⚠⚠ | Divergencia en server actions |
| Falta distribución por dominios (ventas, calidad, logística); dificulta tree-shaking y comprensión. | ⚠ | Organización actual |

**Recomendaciones**
1. Dividir SSOT en módulos (`/domain/ssot/{core, sales, logistics, quality}.ts`) y exportar índice.
2. Crear `businessRules.ts` con enums/triggers/thresholds y helpers de validación.
3. Adoptar `TraceEventFactory` para unificar generación (evitar tipos locales).
4. Extender validaciones zod para entidades clave (orders, shipments, payments).

---

## 2. Hooks Gemini (analyzers)

| Observación | Impacto | Evidencia |
| --- | --- | --- |
| Existen analyzers (`warehouse-analyzer.ts`, `quality-analyzer.ts`, `bom-analyzer.ts`, etc.) que definen prompts y structures, pero pocas rutas los invocan. | ⚠ | Carpeta `src/server/gemini/analyzers` |
| `WarehouseAnalyzer` genera prompts JSON, pero no hay persistencia de `AnalysisResult` ni consumo en UI. | ⚠ | `callGeminiJSON`, `getEmptyResult()` |
| `BaseAnalyzer` no impone `alertKey`; resultados quedan fuera de `TraceEvent/tareas`. | ⚠ | `BaseAnalyzer` |
| No hay scheduler/orchestrator que lance analyzers con periodicidad. | ⚠⚠ | Ausencia de jobs |
| Integración con TaskNew/alerts se mencionó en QuickLog, pero hooks reales (ej. `createGeminiAlert`) están stubbed. | ⚠⚠ | `quality.actions.ts` (`createGeminiAlert`) |
| Falta logging estructurado (historial de decisiones, latencia, errores). | ⚠ | console.warn |

**Recomendaciones**
1. Crear `GeminiOrchestrator` con colas/batch (ej. `runWarehouseAnalysis`) y guardar resultados en `gemini_analyses`.
2. Integrar `TraceEvent` y tasks: cada insight crítico → `alertKey`, `TaskNew`.
3. Implementar `createGeminiAlert`/`createRejectionFollowupTask` reales usando pipeline actions.
4. Añadir métricas para observabilidad (latencia, rate de errores), guardadas en `integrationLogs`.

---

## 3. Integración Gemini ↔ Dominios

| Dominio | Estado | Gaps |
| --- | --- | --- |
| Calidad | Hooks stubbed; no se usa analyzer para sugerir decisiones; no se registran alerts. | Falta wiring `WarehouseAnalyzer` + `quality.actions`. |
| Producción/BOM | Analyzers presentes, pero outputs no se consumen en UI ni tasks. | Necesaria persistencia y UI dashboards. |
| Ventas/QuickLog | Santa Brain se basa en heurísticas propias; no llama a Gemini para NLP real. | Motor Gemini no conectado. |
| Integraciones | Sin hooks: Gemini no monitorea SLA carriers, reconciliaciones, etc. | Requiere nuevos analyzers o prompts. |

---

## 4. Blueprint propuesto (SSOT + Gemini)

1. **SSOT consolidation**
   - Refactor modular.
   - `TraceEventFactory`, `TaskFactory`.
   - `businessRules.ts` con configuración editable (persistencia en Firestore `systemConfig.businessRules`).

2. **Gemini orchestration**
   - Cola (`firestore`/`tasks`) para análisis programados.
   - Guardar `GeminiAnalysis` (id, tipo, payload, resultado, severity).
   - Publicar insights críticos → `TraceEvent` + `TaskNew`.

3. **Hook implementations**
   - Reemplazar stubs (`createGeminiAlert`) por funciones que creen `alerts` / `tasks`.
   - En pipelines (QC, producción, ventas) invocar analyzers cuando data cambia.

4. **Observabilidad**
   - Logging en `integrationLogs`.
   - Métricas: latencia, tokens, ratio éxito/error.
   - Dashboard en `/admin/gemini` con resultados recientes.

---

**Checklist progreso general:**  
- Aguas abajo ✅  
- Aguas arriba ✅  
- Integraciones & conciliaciones ✅  
- SSOT + Gemini hooks ✅ (este informe)  
- Pendiente: síntesis ejecutiva y roadmap.
