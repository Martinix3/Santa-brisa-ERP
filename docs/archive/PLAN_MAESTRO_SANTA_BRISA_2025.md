# Plan Maestro Santa Brisa ERP 2025

> Basado en la auditoría global (`audit-report/global-review/*.md`), la norma de drawer unificado y la lógica de negocio + Gemini consolidada en esta sesión.

---

## 0. Principios rectores

1. **SSOT primero**  
   - Todos los cambios funcionales deben reflejarse en tipos/zod de `src/domain/ssot*.ts`.  
   - `TraceEventFactory` y `businessRules.ts` son la puerta de entrada para nuevas reglas.

2. **Drawer unificado como patrón secundario**  
   - Mobile bottom / Desktop side (`.sb-drawer`, `.sb-overlay`).  
   - Accesibilidad: foco inicial, `Esc` cierra, `Enter` confirma acción primaria.  
   - Componentes enchufables al motor de reglas y Gemini (`ruleId`, `alertKey`, `context`).

3. **Gemini como copiloto operativo**  
   - Observa -> Decide -> Automatiza.  
   - Todo insight genera `alertKey` / `taskKey` y se persiste en `GeminiAnalysis`.  
   - Integrado con agenda/tasks (QuickLog, logística, QC).

4. **Revisiones obligatorias al cierre de cada fase**  
   - Demo funcional + checklist de accesibilidad/UX (drawer/páginas/dialogs).  
   - Validación con negocio (Operaciones, Ventas, Finanzas).  
   - Informe de métricas o stress-test según el dominio.

---

## 1. Gobernanza y Observabilidad (F0) — 2 semanas

| Objetivo | Entregables | Revisión |
| --- | --- | --- |
| Estandarizar eventos e integraciones | - `TraceEventFactory` central<br>- `IntegrationLogger` + formato JSON<br>- `businessRules.ts` (thresholds iniciales)<br>- Dashboard temporal de conciliaciones | Demo de TraceEventFactory + checklist accesibilidad drawer <br>Validación dashboard con Operaciones |

**Tareas clave**
- Migrar server actions a `TraceEventFactory`.  
- Documentar `alertKey`/`taskKey` y reglas de idempotencia.  
- Crear mock Gemini (hasta que el orquestador esté listo).

---

## 2. Núcleo Operativo (F1) — 4 semanas

### 2.1 Trazabilidad & QC
- Bloqueo consumo de lotes en `HOLD/IN_PROGRESS`.  
- `TraceEvent` unificados + genealogía (`GENEALOGY_PARENT/CHILD`).  
- `createGeminiAlert` real en `quality.actions.ts` (observa COA, desviaciones, severidad).  
- **ReleaseLotDrawer** migrado a `BaseDrawer` con contexto SSOT (`alertKey`, `taskKey`, usuario real) y automatizaciones post-QC (emails, tareas, GeminiAnalysis) alineadas con las reglas.

### 2.2 Pedidos & Logística
- `placeOrder`, `assignLots`, `createShipment` completos.  
- FEFO inteligente + sugerencias de lote.  
- Webhooks Sendcloud → `TraceEvent` + tasks automáticas.

### 2.3 Conciliaciones R15
- Jobs diarios para R15.1–R15.4.  
- Reportes y tasks automáticas (Finanzas/Logística).

### Artefactos UX
- Drawer unificado aplicado a QuickLog, Lot Release, Picking y Validaciones.  
- Storybook/preview de drawer con reglas dinamizadas.

**Revisión F1:** walkthrough end-to-end (pedido → envío) usando drawer unificado, checklist QC, informe R15 firmado por Finanzas y Logística.

---

## 3. Integraciones & SSOT (F2) — 3 semanas

| Subdominio | Objetivo | Entregables |
| --- | --- | --- |
| Integration Hub | Orquestar Shopify/Holded/Sendcloud con idempotencia | - Cola unificada<br>- Retries + DLQ<br>- Logs centralizados |
| Finanzas | Conciliar pedidos ↔ facturas ↔ pagos | - Sync bidireccional Holded<br>- Reporte automatizado vencidos |
| SSOT | Modularizar y endurecer validaciones | - Split de `ssot.ts` en dominios<br>- Schemas zod reforzados<br>- `businessRules.integrations.ts` |
| UX | Drawer de incidencias de integraciones | - Vista rápida con acciones (reprocesar, escalar) |

**Revisión F2:** runbook de integraciones + auditoría SSOT; stress-test de idempotencia y demo del drawer de incidencias.

---

## 4. Gemini & Automatización (F3) — 3 semanas

1. **Gemini Orchestrator**  
   - Scheduler + colas (`GeminiAnalysis` persistente).  
   - Dashboards de insights (historial, severidad).

2. **Hooks por dominio**  
   - Warehouse/producción: mermas, OEE, desviaciones.  
   - Ventas: NBA, riesgo churn, campañas.  
   - Logística: SLA carrier, excepciones, re-rutas.

3. **Santa Brain NLP**  
   - Reemplazar heurísticas por clasificación Gemini.  
   - Tareas automáticas basadas en intención.

4. **Drawer inteligente**  
   - Cada insight abre drawer contextual con acciones (QuickLog, QC, picking).  
   - Conexión con `businessRules` para mostrar campos/responsables dinámicos.

**Revisión F3:** reporte de insights Gemini, test de regresión de tareas automáticas, validación accesibilidad drawer con stakeholders.

---

## 5. Observabilidad & UX continua (F4) — ongoing

- Dashboards admin: integraciones, reconciliaciones, Gemini.  
- Documentación operativa + técnica (handbook).  
- Track de métricas: OTIF, OEE, coste por lote, ROI POS, SLA carrier, DSO.  
- Cadencia: sprint review + checklist UX (drawer/página/dialog) + feedback usuarios.

---

## 6. Gestión y coordinación

Somos un equipo compacto, así que trabajaremos en conjunto sobre todas las áreas.  
Para cada fase usaremos el checklist de revisión acordado (demo funcional, accesibilidad, validación con negocio) antes de avanzar a la siguiente.

---

## 7. Checklist de despliegue por fase

1. **Code freeze parcial** (dominio en curso).  
2. **Revisión peer** (tech + negocio).  
3. **Demo y acta de revisión** vinculadas a este plan.  
4. **Go/No-Go** documentado; rollback plan.  
5. **Retro** corto para decidir ajustes en fases siguientes.

---

## 8. Próximos pasos inmediatos

1. Asignar responsables de F0 y F1 + calendario de revisiones.  
2. Crear tablero (Jira/Projects) alineado con las fases y entregables.  
3. Priorizar migración de drawers existentes al nuevo patrón (QuickLog, Contact, Lot Release).  
4. **Inventario fase 1**:  
   - Migración a RSC completada (`getInventorySnapshot`).  
   - Drawer de ajustes manuales sobre `BaseDrawer`, alta SSOT de productos, UoM normalizada.  
   - Alertas SSOT (`alertKey`, `taskKey`) persistidas y trazas tipo `ALERT`.  
   - UI glass + valor real + incidencias UoM en dashboards y tablas.
5. Preparar pruebas base para TraceEventFactory y Conciliaciones R15.  
6. Cargar este plan en el handbook interno para seguimiento quincenal.
