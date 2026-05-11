# Auditoría Global – Síntesis Ejecutiva & Roadmap de Remediación

**Documentos previos:**  
1. `01-aguas-abajo.md` – Recepción, QC, producción, trazabilidad.  
2. `02-aguas-arriba.md` – Ventas, distribuidores, pedidos, logística, marketing.  
3. `03-integraciones-y-conciliaciones.md` – Shopify, Holded, Sendcloud, reglas R15.  
4. `04-ssot-gemini-hooks.md` – SSOT, Gemini analyzers y hook architecture.

---

## Resumen Ejecutivo

1. **Trazabilidad y calidad (Aguas abajo)**  
   - Flujo base implementado, pero los `TraceEvent` y bloqueos de consumo (`HOLD/HOLD`) son inconsistentes.  
   - Gemini no está activo en recepción/QC/producción; hooks stubbed.

2. **Ventas y operaciones (Aguas arriba)**  
   - Santa Brain/QuickLog automatizan acciones, pero con lógica acoplada y tareas legacy.  
   - Pedidos/logística: acciones clave son stubs; falta end-to-end con lotes, FEFO, conciliaciones.

3. **Integraciones externas**  
   - Clientes Shopify/Holded/Sendcloud existen, pero la orquestación y conciliación (R15) son manuales/incompletas.  
   - Falta centralización de logs, idempotencia y alertas automáticas.

4. **SSOT & Gemini**  
   - SSOT monolítico y saturado de alias; no hay `businessRules.ts` ni `TraceEventFactory`.  
   - Analyzers Gemini definidos, pero sin orquestación, persistencia o integración con tasks/alertas.

---

## Hallazgos Críticos

| Área | Hallazgo | Impacto |
| --- | --- | --- |
| Trazabilidad | Consumo de lotes sin validar `qcStatus`; `TraceEvent` divergentes | Alta (riesgo operativo/compliance) |
| Pedidos | Server actions (`placeOrder`, `logistics`) stubbed | Alta (flujo incompleto, riesgo de datos) |
| Conciliaciones | Reglas R15 no automatizadas | Alta (finanzas/logística) |
| Integraciones | Falta idempotencia, logging y alertas | Media-Alta |
| SSOT | Monolito con alias y validaciones parciales | Media |
| Gemini | Hooks stubbed, sin orquestador | Media |

---

## Roadmap de Remediación

### Norma de uso del Drawer (UI unificada)

0. **Principios**  
   - Patrón por defecto de interacción secundaria: el drawer sustituye a diálogos sueltos y minimiza navegación.  
   - Mobile-first: drawer inferior; desktop: lateral derecho. Estilos base ya definidos en `.sb-drawer` y `.sb-overlay` (animaciones `sb-slide-*`, `sb-fade-*`).  
   - Tokens y consistencia visual: radios, colores, motion y `z-index` provienen de `tokens.css` (`--radius`, `--z-dialog`, `--motion-*`).  
   - Accesibilidad: foco inicial en título o primer campo, `Esc` cierra, `Enter` confirma cuando exista acción primaria visible.

1. **Cuándo usar cada patrón**  
   - **Drawer**: lectura/edición contextual (≤3 pasos e impacto local). Ejemplos: QuickLog, crear tarea, asignar lotes, vista rápida de cuenta/pedido, subir COA, incidencias.  
   - **Página**: tareas largas, navegación propia, tablas grandes o reporting (p. ej. listados completos, trazabilidad multi-lote, dashboards).  
   - **Dialog**: confirmaciones destructivas o decisiones binarias (cancelar pedido, descartar cambios).  

2. **Implementación técnica**  
   - Factor común `EntityDrawerShell` → evolucionar a componente unificado con slots de header/body/footer, acciones configurables, soporte para reglas de negocio.  
   - Dejar el drawer “enchufable” al documento de reglas (`businessRules.ts`) y a Gemini: cada apertura puede recibir contexto (`ruleId`, `alertKey`) y disparar automatizaciones coherentes.  
   - Añadir historias de integración en cada fase para validar UX y accesibilidad antes del cierre de fase.

### Fase 0 – Gobierno & Observabilidad (1-2 semanas)
- Crear `TraceEventFactory` y `IntegrationLogger`.
- Establecer `businessRules.ts` con thresholds (inventario, ventas, calidad).  
- Configurar dashboards de conciliaciones (temporalmente manuales).
- **Revisión de fase:** demo funcional de TraceEventFactory + checklist accesibilidad drawer unificado + validación de dashboards.

### Fase 1 – Núcleo Operativo (3-4 semanas)
1. **Trazabilidad/QC**
   - Guardas de consumo (bloqueo `HOLD`), `TraceEvent` unificados.
   - Implementar `createGeminiAlert` real en `quality.actions.ts`.

2. **Pedidos & Logística**
   - Implementar `placeOrder`, `assignLots`, `createShipment`.
   - Conectar tasks `order_prep` con flujo real.  
   - Integrar Sendcloud webhooks → `TraceEvent` + tasks.

3. **Conciliaciones R15**
   - Jobs diarios para R15.1–R15.4; reportes y tasks automáticas.
- **Revisión de fase:** walkthrough end-to-end (pedido → envío) usando drawer unificado, checklist de bloqueos QC, informe R15 firmado por Finanzas/Logística.

### Fase 2 – Integraciones & SSOT (3 semanas)
- Integration Hub: orquestar Shopify/Holded/Sendcloud con idempotencia.  
- Reconciliaciones con Holded (pedidos ↔ facturas ↔ pagos).  
- Refactor SSOT en módulos y ampliar validaciones zod.
- **Revisión de fase:** runbook de integraciones (incluye drawer de incidencias), auditoría SSOT por dominio, stress-test de idempotencia.

### Fase 3 – Gemini & Automatización (3 semanas)
- Gemini Orchestrator + historial de insights.  
- Integrar analyzers con Tasks/TraceEvents (warehouse, producción, ventas).  
- Santa Brain: reemplazar heurísticas por NLP Gemini; modularizar servicios.
- **Revisión de fase:** reporte de insights Gemini + acceptance con stakeholders; test de regresión sobre tasks automáticas; validación accesibilidad drawer con flujos Gemini.

### Fase 4 – Observabilidad & UX (continuo)
- Dashboards admin: integraciones, reconciliaciones, insights Gemini.  
- Documentación actualizada (operativa + técnica).  
- Iterar roadmap según métricas/feedback.
- **Revisión continua:** sprint review con checklist UX (drawer/páginas/dialogs), métricas de adopción y feedback de usuarios.

---

## Próximos Pasos Inmediatos

1. Aprobar roadmap y asignar responsables por fase.  
2. Priorizar Fase 0 + Fase 1 para asegurar operación crítica.  
3. Crear tablero de seguimiento (GitHub Projects/Jira) con entregables por informe.

---

**Checklist final:**  
- Aguas abajo ✅  
- Aguas arriba ✅  
- Integraciones & conciliaciones ✅  
- SSOT + Gemini ✅  
- Síntesis & roadmap ✅
