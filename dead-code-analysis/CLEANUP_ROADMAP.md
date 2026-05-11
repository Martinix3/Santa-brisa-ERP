# Plan de Limpieza de Código Muerto - Santa Brisa ERP

**Fecha:** 19/01/2025  
**Basado en:** Análisis Knip v5.66.0  
**Estrategia:** Limpieza iterativa, segura y validada

---

## 📊 Resumen Ejecutivo

| Categoría | Total | Eliminar | Validar | Mantener |
|-----------|-------|----------|---------|----------|
| **Archivos** | 199 | ~50 | ~100 | ~49 |
| **Deps npm** | 20 | ~8 | ~7 | ~5 |
| **DevDeps** | 17 | ~10 | ~4 | ~3 |
| **Exports** | 333 | ~80 | ~150 | ~103 |
| **Exports duplicados** | 16 | 0 | 16 | 0 |

**Impacto estimado total:**
- Bundle size: **-1.5 a 2MB** (~15-20%)
- Archivos: **-50 a 100 archivos** (~5-10%)
- Dependencias: **-15 a 18 paquetes** (~45%)
- Build time: **-10 a 15 segundos** (~12-15%)

---

## 🎯 Estrategia de 4 Fases

### Fase 1: Quick Wins (Semana 1) - BAJO RIESGO
**Objetivo:** Eliminar código obviamente sin uso con impacto inmediato

### Fase 2: Validación con Equipo (Semana 2) - MEDIO RIESGO
**Objetivo:** Revisar y eliminar features deprecadas confirmadas

### Fase 3: Refactoring (Semanas 3-4) - RIESGO CONTROLADO
**Objetivo:** Limpiar código que requiere ajustes antes de eliminar

### Fase 4: Mantenimiento (Continuo)
**Objetivo:** Prevenir acumulación de código muerto

---

## 🟢 FASE 1: Quick Wins (Semana 1)

### Sprint 1.1: DevDependencies Sin Uso (Día 1)

#### ✅ Eliminar Directamente (10 paquetes):
```bash
npm uninstall \
  @faker-js/faker \
  @types/estree \
  @types/json-schema \
  @types/lru-cache \
  @types/react-day-picker \
  esbuild \
  eslint-plugin-regexp \
  fast-check \
  madge \
  vite-node
```

**Validación:**
- [ ] Ejecutar `npm run build` (debe compilar sin errores)
- [ ] Ejecutar `npm run typecheck` (debe pasar)
- [ ] Ejecutar `npm run lint` (debe pasar)
- [ ] Ejecutar `npm test` (todos los tests pasan)

**Impacto:** ~50MB menos en node_modules, instalaciones más rápidas

---

### Sprint 1.2: Dependencies npm Claramente Sin Uso (Día 2)

#### ✅ Eliminar con Validación Simple (4 paquetes):
```bash
# 1. Verificar que no están en uso
grep -r "vulture" src/
grep -r "nanoid" src/
grep -r "jszip" src/
grep -r "react-dropzone" src/

# 2. Si no hay matches, eliminar
npm uninstall vulture nanoid jszip react-dropzone
```

**Validación:**
- [ ] Build exitoso
- [ ] Tests pasan
- [ ] Probar upload de archivos (si react-dropzone se usaba)

**Impacto:** ~10-15MB menos en bundle

---

### Sprint 1.3: Componentes UI Duplicados o Deprecados (Día 3)

#### ✅ Eliminar Componentes Claramente Deprecados:

**A. Componentes compartidos sin uso:**
```bash
# Eliminar estos archivos
rm src/components/shared/EmptyState.tsx
rm src/components/shared/LoadingState.tsx
rm src/components/shared/PageShell.tsx
rm src/components/shared/index.ts
```

**B. Componentes UI antiguos:**
```bash
# Eliminar versiones antiguas de componentes
rm src/components/ui/badge.tsx
rm src/components/ui/button.tsx
rm src/components/ui/command.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/tooltip.tsx
```

**Validación:**
- [ ] Buscar imports: `grep -r "EmptyState\|LoadingState" src/`
- [ ] Build exitoso
- [ ] Verificar que componentes modernos existen (SB_*, FS_*)

**Impacto:** ~10-15 archivos menos, código más limpio

---

### Sprint 1.4: Exports Duplicados - Estandarización (Día 4)

#### 🔄 Estandarizar a Named Exports (16 archivos):

**Archivos a modificar:**
```
src/components/fs/FS_ActivityFeed.tsx
src/components/fs/FS_AlertsCard.tsx
src/components/fs/FS_ChartCard.tsx
src/components/fs/FS_KpiCard.tsx
src/components/fs/layout/FS_AppLayout.tsx
src/components/fs/layout/FS_Drawer.tsx
src/components/fs/layout/FS_PageShell.tsx
src/components/fs/primitives/FS_Badge.tsx
src/components/fs/primitives/FS_Button.tsx
src/components/fs/primitives/FS_Card.tsx
src/components/fs/primitives/FS_Table.tsx
src/components/fs/primitives/FS_Tabs.tsx
src/config/dashboard-config.ts
src/domain/id-helpers.ts
src/lib/dashboard-adapters.ts
src/server/firebase.ts
```

**Cambio a realizar:**
```typescript
// ANTES (con duplicación)
export const FS_Badge = () => { ... }
export default FS_Badge;

// DESPUÉS (solo named export)
export const FS_Badge = () => { ... }
```

**Validación:**
- [ ] Actualizar todos los imports de `import X from` a `import { X } from`
- [ ] Build exitoso
- [ ] Tests pasan

**Impacto:** Código más consistente, exports más claros

---

### Sprint 1.5: Archivos de Configuración Sin Uso (Día 5)

#### ✅ Eliminar Configuración Obsoleta:
```bash
rm src/config/carriers.ts
```

**Validación:**
- [ ] Verificar que no se importa: `grep -r "carriers" src/`
- [ ] Build exitoso

---

## 🟡 FASE 2: Validación con Equipo (Semana 2)

### Sprint 2.1: Features Completas (Días 6-7)

#### 🔍 Validar con Product Owner:

**A. Feature: QuickLog (12 archivos)**
```
src/features/quicklog/QuickLogDialog.tsx
src/features/quicklog/QuickLogDrawer.tsx
src/features/quicklog/QuickLogForm.tsx
src/features/quicklog/SantaBrainInput.tsx
src/features/quicklog/components/MessageReviewForm.tsx
src/features/quicklog/components/SantaBrainConfirmation.tsx
src/features/quicklog/components/SBFlows.tsx
src/features/quicklog/components/VoiceRecorder.tsx
```

**Preguntas de validación:**
- [ ] ¿Esta feature está en producción?
- [ ] ¿Hay usuarios usándola?
- [ ] ¿Está en el roadmap 2025?
- [ ] ¿Reemplazada por otra funcionalidad?

**Decisión:**
- ✅ **Si NO está en uso:** Eliminar completo
- ⏸️ **Si está deprecada:** Marcar como deprecated, eliminar en Fase 3
- ❌ **Si está en uso:** Mantener y documentar

---

**B. Feature: Personal Dashboard (12 archivos)**
```
src/features/personal/CompactCalendar.tsx
src/features/personal/PersonalPipelineBoard.tsx
src/features/personal/TasksSection.tsx
src/features/personal/components/DashboardKpiCard.tsx
src/features/personal/components/RescheduleDialog.tsx
src/features/personal/components/TargetAccountsList.tsx
src/features/personal/components/TaskItem.tsx
src/features/personal/components/TaskList.tsx
```

**Preguntas de validación:**
- [ ] ¿Dashboard personal se usa?
- [ ] ¿Migrado a nuevo sistema?
- [ ] ¿Usuarios activos?

---

**C. Feature: Sales Pipeline v2 (11 archivos)**
```
src/features/sales/pipeline/components/AccountCard.tsx
src/features/sales/pipeline/components/AccountDrawer.tsx
src/features/sales/pipeline/components/PipelineBoard.tsx
src/features/sales/pipeline/components/PipelineColumn.tsx
src/features/sales/pipeline/components/PipelineHeader.tsx
src/features/sales/pipeline/components/skeletons.tsx
src/features/sales/pipeline/components/StageColumn.tsx
src/features/sales/pipeline/hooks/usePipeline.ts
src/features/sales/pipeline/pipeline.actions.v2.ts
src/features/sales/pipeline/pipeline.mappers.ts
```

**Preguntas de validación:**
- [ ] ¿V2 está activa o seguimos en v1?
- [ ] ¿Pipeline v2 está en staging?
- [ ] ¿Cuándo se planea activar?

---

**D. Feature: POS (Point of Sale) (6 archivos)**
```
src/features/pos/DeliveryQtyForm.tsx
src/features/pos/KpisDynamicForm.tsx
src/features/pos/PosCompleteDialog.tsx
src/features/pos/PosLinesPicker.tsx
src/features/pos/server/pos-actions.ts
src/features/pos/server/pos-complete.ts
```

**Preguntas de validación:**
- [ ] ¿Sistema POS está activo?
- [ ] ¿Se usa en algún punto de venta?
- [ ] ¿Deprecado por nuevo sistema?

---

### Sprint 2.2: Dependencies Grandes (Día 8)

#### 🔍 Validar con Tech Lead:

**A. FullCalendar (6 paquetes, ~1MB)**
```json
{
  "@fullcalendar/core": "6.1.19",
  "@fullcalendar/daygrid": "6.1.19",
  "@fullcalendar/interaction": "6.1.19",
  "@fullcalendar/list": "6.1.19",
  "@fullcalendar/react": "6.1.19",
  "@fullcalendar/timegrid": "6.1.19"
}
```

**Validación:**
```bash
grep -r "fullcalendar" src/
grep -r "Calendar" src/app/
grep -r "FullCalendar" src/
```

**Decisión:**
- ✅ **Si no hay matches:** Eliminar inmediatamente
- ⏸️ **Si hay código:** Validar si está en uso o es legacy

---

**B. Puppeteer (~300MB)**
```json
{ "puppeteer": "24.23.0" }
```

**Validación:**
```bash
grep -r "puppeteer" src/
grep -r "launch" src/server/
```

**Preguntas:**
- [ ] ¿Se usa para PDF generation?
- [ ] ¿Se usa para scraping?
- [ ] ¿Server-side rendering?
- [ ] ¿Testing E2E?

**Alternativas si se necesita:**
- Playwright (más ligero)
- Headless Chrome directamente
- Servicio cloud (AWS Lambda + Chrome)

---

**C. ReactFlow (~500KB)**
```json
{ "reactflow": "11.11.4" }
```

**Validación:**
```bash
grep -r "reactflow\|ReactFlow" src/
grep -r "useNodesState\|useEdgesState" src/
```

**Uso potencial:**
- Diagramas de flujo
- Visualización de procesos
- Grafos de dependencias

---

**D. Framer Motion (~100KB)**
```json
{ "framer-motion": "12.23.22" }
```

**Validación:**
```bash
grep -r "framer-motion\|motion\." src/
grep -r "AnimatePresence" src/
```

**Alternativas si se necesita:**
- CSS animations
- Tailwind animate
- React Spring (más ligero)

---

### Sprint 2.3: Integraciones (Días 9-10)

#### 🔍 Validar con Equipo Integraciones:

**A. Shopify (9 archivos)**
```
src/server/integrations/shopify/hmac.ts
src/server/integrations/shopify/process.ts
src/server/integrations/shopify/shopify.fulfillment.worker.ts
src/server/integrations/shopify/shopify.webhooks.ts
src/server/integrations/shopify/upsertShopifyOrder.usecase.ts
src/components/shopify/ShopifyKPIs.tsx
src/components/shopify/ShopifyOrdersTable.tsx
```

**Validación:**
- [ ] ¿Integración Shopify activa en producción?
- [ ] ¿Webhooks configurados?
- [ ] ¿Órdenes syncing?
- [ ] ¿Último uso registrado en logs?

---

**B. Holded (3 archivos)**
```
src/server/integrations/holded/mappers.ts
src/server/integrations/holded/validators.ts
src/features/integrations/holded/service.ts
```

**Validación:**
- [ ] ¿Integración Holded activa?
- [ ] ¿Facturas automáticas?
- [ ] ¿Sync de clientes?

---

**C. Gemini AI Analyzers (2 archivos sin uso)**
```
src/server/gemini/analyzer-orchestrator.ts
src/server/gemini/analyzers/warehouse-analyzer.ts
```

**Validación:**
- [ ] ¿Analizadores en uso?
- [ ] ¿Parte del sistema de recomendaciones?
- [ ] ¿En desarrollo?

---

## 🔵 FASE 3: Refactoring Necesario (Semanas 3-4)

### Sprint 3.1: Server Actions Sin Referencias (Semana 3)

#### 🔄 Revisar y Limpiar Server Actions:

**Metodología:**
1. Verificar uso en formularios
2. Verificar uso en event handlers
3. Buscar uso dinámico
4. Revisar logs de producción

**Ejemplo de validación:**
```bash
# Para cada server action
function_name="importPreview"

# 1. Búsqueda estática
grep -r "$function_name" src/app/
grep -r "action={$function_name" src/
grep -r "formAction={$function_name" src/

# 2. Búsqueda en strings (uso dinámico)
grep -r "\"$function_name\"" src/
grep -r "'$function_name'" src/

# 3. Si no hay matches -> Candidato a eliminar
```

**Server Actions a Revisar (prioridad alta):**
```typescript
// Admin
- importPreview
- importCommit
- deleteUser
- updateUserPermissions
- assignTerritory
- assignDistributors
- getUserById
- bulkUpdateKPIs

// Orders
- placeQuickOrder
- importShopifyOrder

// Marketing
- createMarketingEvent
- updateMarketingEvent
- deleteMarketingEvent
- createOnlineCampaign
- updateOnlineCampaign
- deleteOnlineCampaign
```

**Proceso por cada action:**
- [ ] Verificar uso estático
- [ ] Verificar logs producción (últimos 30 días)
- [ ] Consultar con equipo backend
- [ ] Si sin uso confirmado: Eliminar
- [ ] Si uso confirmado: Documentar y mantener

---

### Sprint 3.2: Domain Types SSOT (Semana 3)

#### ⚠️ CRÍTICO: NO ELIMINAR SIN VALIDACIÓN EXHAUSTIVA

**Tipos a revisar (333 exports):**
```typescript
// Estos son parte de la API pública del sistema
// Muchos se usan en runtime o son contratos
```

**Proceso de validación:**
1. **Categorizar por uso:**
   - Tipos de datos (Contact, Account, Order, etc.)
   - Tipos de estado (Status, Stage, etc.)
   - Tipos de configuración (Config, Options, etc.)

2. **Validar uso:**
```bash
# Para cada tipo
type_name="BillingStatus"

# Búsqueda exhaustiva
grep -r ": $type_name" src/
grep -r "<$type_name>" src/
grep -r "as $type_name" src/
grep -r "extends $type_name" src/
```

3. **Decisión conservadora:**
   - ❓ **Si duda:** MANTENER
   - ✅ **Si 100% seguro sin uso:** Eliminar
   - 📝 **Siempre:** Documentar razón

---

### Sprint 3.3: Lib Helpers y Utils (Semana 4)

#### 🔄 Consolidar y Limpiar Helpers:

**Helpers identificados sin uso directo:**
```
src/lib/consignment-and-samples.ts
src/lib/dashboard-helpers.ts
src/lib/distributor-helpers.ts
src/lib/finance-helpers.ts
src/lib/formatters.ts
src/lib/logistics.helpers.ts
src/lib/order-flow-validators.ts
src/lib/pipeline-helpers.ts
src/lib/sales-helpers.ts
src/lib/status.ts
src/lib/time-range-helpers.ts
```

**Proceso:**
1. Revisar cada helper
2. Verificar uso indirecto (otros helpers que lo usan)
3. Consolidar helpers similares
4. Eliminar solo los 100% sin uso

**Validación:**
```bash
filename="dashboard-helpers"
grep -r "from.*$filename" src/
grep -r "import.*$filename" src/
```

---

### Sprint 3.4: Components Sin Uso (Semana 4)

#### 🔄 Limpiar Componentes Verificados:

**Categorías:**

**A. Dialogs/Forms antiguos (8 archivos)**
```
src/components/dialogs/ActionDialogShell.tsx
src/components/dialogs/forms/EventForm.tsx
src/components/dialogs/forms/InteractionForm.tsx
src/components/dialogs/forms/OrderForm.tsx
src/components/dialogs/forms/PosForm.tsx
src/components/forms/examples/CreateContactDrawer.tsx
src/components/forms/SchemaDrawer.tsx
src/components/forms/SchemaForm.tsx
```

**B. Layout antiguo (2 archivos)**
```
src/components/layout/Header.tsx
src/components/layout/SBHeader.tsx
```

**C. Components específicos (10+ archivos)**
```
src/components/admin/EditableCollectionTable.tsx
src/components/ai/AIInsightCard.tsx
src/components/ai/AIPredictionChart.tsx
src/components/ai/AIRecommendations.tsx
src/components/brand/BrandPalette.tsx
src/components/cuentas/AccountsDataTable.tsx
src/components/cuentas/CSVUploadModal.tsx
src/components/cuentas/SignalsUploadModal.tsx
```

**Validación para cada uno:**
- [ ] No hay imports
- [ ] No está en Storybook
- [ ] No mencionado en docs
- [ ] Confirmado obsoleto por UX/UI team

---

## 🔄 FASE 4: Prevención y Mantenimiento (Continuo)

### Proceso Mensual:

#### 1. Análisis Automático (1er día del mes)
```bash
npm run dead-code:knip-json
npm run dead-code:knip > dead-code-analysis/reports/$(date +%Y-%m).txt
```

#### 2. Revisión (2do día del mes)
- [ ] Revisar nuevos archivos sin uso
- [ ] Categorizar por riesgo
- [ ] Crear tickets de limpieza

#### 3. CI/CD Integration
```yaml
# .github/workflows/dead-code-check.yml
name: Dead Code Check
on:
  pull_request:
    branches: [main, develop]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run dead-code:knip
      # Fail si hay nuevos archivos sin uso
      - run: scripts/check-dead-code-diff.sh
```

#### 4. Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run knip en archivos cambiados
npm run dead-code:knip --changed
```

#### 5. Code Review Guidelines
- ✅ Al eliminar imports, verificar exports huérfanos
- ✅ Al crear componentes, documentar uso esperado
- ✅ Al deprecar código, marcar con `@deprecated`
- ✅ Al refactorizar, verificar código obsoleto

---

## 📋 Checklist de Seguridad Por Sprint

### Antes de Eliminar Código:
- [ ] ✅ Knip confirma sin uso
- [ ] ✅ Búsqueda manual en codebase (grep)
- [ ] ✅ Revisión Git history (últimos 6 meses)
- [ ] ✅ Búsqueda en documentación
- [ ] ✅ Consulta con equipo responsable
- [ ] ✅ Verificación en logs de producción
- [ ] ✅ Crear branch específico
- [ ] ✅ Backup documentado

### Después de Eliminar:
- [ ] ✅ Build exitoso
- [ ] ✅ Tests pasan (100%)
- [ ] ✅ TypeCheck sin errores
- [ ] ✅ Lint sin nuevos warnings
- [ ] ✅ Bundle size verificado
- [ ] ✅ Smoke tests en staging
- [ ] ✅ Code review aprobado
- [ ] ✅ Deploy a staging
- [ ] ✅ Testing manual en staging
- [ ] ✅ Deploy a producción
- [ ] ✅ Monitoring 24h post-deploy

---

## 🎯 Métricas de Éxito

### Por Fase:

| Fase | Archivos | Deps | Bundle | Build Time |
|------|----------|------|--------|------------|
| **Fase 1** | -15 | -14 | -500KB | -5s |
| **Fase 2** | -40 | -4 | -800KB | -5s |
| **Fase 3** | -30 | -0 | -400KB | -5s |
| **Total** | **-85** | **-18** | **-1.7MB** | **-15s** |

### Tracking Dashboard:
```bash
# Generar reporte de progreso
npm run dead-code:knip-json
node scripts/dead-code-progress.js
```

---

## 📞 Contactos y Responsables

| Área | Responsable | Consultar Para |
|------|-------------|----------------|
| **Product** | Product Owner | Features deprecadas, roadmap |
| **Backend** | Tech Lead | Server actions, integraciones |
| **Frontend** | UI/UX Lead | Componentes, design system |
| **DevOps** | DevOps Lead | Dependencies, build process |
| **QA** | QA Lead | Testing post-limpieza |

---

## 🚨 Casos de Emergencia

### Si algo falla en producción:

1. **Rollback inmediato:**
```bash
git revert <commit-hash>
git push origin main
```

2. **Restaurar código:**
```bash
git checkout <backup-branch> -- src/path/to/file.ts
```

3. **Comunicar:**
- Equipo DevOps
- Product Owner
- Stakeholders afectados

4. **Post-mortem:**
- Documentar qué falló
- Por qué no se detectó
- Cómo prevenir en futuro

---

## 📚 Scripts de Ayuda

### Script 1: Validar uso de archivo
```bash
#!/bin/bash
# scripts/check-file-usage.sh
FILE=$1
echo "Checking usage of: $FILE"
echo "---"
echo "Direct imports:"
grep -r "from ['\"].*$FILE" src/ | wc -l
echo "---"
echo "Matches found:"
grep -r "from ['\"].*$FILE" src/
```

### Script 2: Validar dependency
```bash
#!/bin/bash
# scripts/check-dependency-usage.sh
DEP=$1
echo "Checking usage of: $DEP"
grep -r "from ['\"]$DEP" src/ | wc -l
```

### Script 3: Progress tracker
```bash
#!/bin/bash
# scripts/dead-code-progress.sh
echo "Dead Code Cleanup Progress"
echo "==========================="
TOTAL_FILES=$(npm run dead-code:knip 2>&1 | grep "Unused files" | grep -o '[0-9]*')
echo "Files remaining: $TOTAL_FILES"
echo "Target: 0"
echo "Progress: $((100 - TOTAL_FILES * 100 / 199))%"
```

---

## 📖 Documentación Adicional

### Para cada eliminación mayor, documentar:

```markdown
# Eliminación: [Feature/Component Name]

## Fecha: [DD/MM/YYYY]
## Responsable: [Nombre]

### Razón de Eliminación:
- [ ] Sin uso en producción
- [ ] Reemplazado por: [nuevo sistema]
- [ ] Deprecado desde: [fecha]
- [ ] Aprobado por: [stakeholder]

### Archivos Eliminados:
- path/to/file1.ts
- path/to/file2.tsx

### Impacto:
- Bundle size: -XKB
- Tests afectados: N
- Usuarios afectados: N

### Validación:
- [ ] Tests pasan
- [ ] Build exitoso
- [ ] Deploy staging OK
- [ ] Smoke tests OK
- [ ] 24h monitoring OK

### Rollback Plan:
git checkout <commit> -- <files>
```

---

## 🎓 Lecciones Aprendidas

### Actualizar después de cada fase:

1. **Qué funcionó bien:**
   - [Documentar]

2. **Qué podría mejorar:**
   - [Documentar]

3. **Falsos positivos encontrados:**
   - [Listar y documentar]

4. **Código inesperadamente en uso:**
   - [Documentar por qué Knip no lo detectó]

5. **Tiempo real vs estimado:**
   - Estimado: X días
   - Real: Y días
   - Razones: [...]

---

## ✅ Criterios de Finalización

### El cleanup está completo cuando:

- [ ] Knip reporta <50 archivos sin uso
- [ ] Todas las dependencies críticas validadas
- [ ] Bundle size reducido al objetivo
- [ ] Build time mejorado
- [ ] Tests al 100% passing
- [ ] Documentación actualizada
- [ ] Equipo capacitado en prevención
- [ ] CI/CD integrado con checks
- [ ] Monitoring establecido
- [ ] Zero incidentes en producción post-cleanup

---

## 🔗 Referencias

- **Análisis inicial:** `dead-code-analysis/INITIAL_RESULTS_SUMMARY.md`
- **Plan completo:** `DEAD_CODE_DETECTION_PLAN.md`
- **Quick start:** `DEAD_CODE_QUICK_START.md`
- **Knip docs:** https://knip.dev/
- **Next.js optimization:** https://nextjs.org/docs/app/building-your-application/optimizing

---

**Última actualización:** 19/01/2025  
**Versión:** 1.0  
**Estado:** 📋 Listo para Ejecución  
**Próxima revisión:** Después de Fase 1
