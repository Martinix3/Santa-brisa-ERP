# 🔍 ANÁLISIS QUALITY LEGACY vs QUALITY-V2
## Identificación de Código Obsoleto

**Fecha:** 20 de Octubre 2025  
**Objetivo:** Identificar qué del sistema quality legacy está en uso y qué es obsoleto

---

## 📂 ESTRUCTURA ACTUAL

### Sistema LEGACY (`/quality/`)
```
src/app/(app)/quality/
├── dashboard/          ❓ En uso
├── lots/              ❓ En uso  
├── releases/          ❓ En uso
├── plans/             ❓ En uso
└── traceability/      ❓ En uso

src/components/quality/
├── GeminiAlertsCard.tsx      ✅ EN USO (5 referencias)
├── QcPlanDrawer.tsx          ✅ EN USO (13 referencias)
├── QcPlanEditorDrawer.tsx    ✅ EN USO (16 referencias)
├── ReleaseLotDrawer.tsx      ✅ EN USO (1 referencia)
├── QualityBadge.tsx          ✅ EN USO (múltiples)
└── DecisionBadge.tsx         ✅ EN USO

src/server/actions/
├── quality.actions.ts        ✅ EN USO (16 referencias)
├── quality.data.ts           ✅ EN USO (3 referencias)
├── quality-helpers.ts        ✅ EN USO (1 referencia)
├── quality-stats.ts          ✅ EN USO (2 referencias)
└── quality-v2.actions.ts     ✅ NUEVO SISTEMA

src/domain/
├── qc-plan-helpers.ts        ✅ EN USO (1 referencia)
└── ssot-v2-plus-schemas.ts   ✅ NUEVO SISTEMA
```

### Sistema NUEVO (`/quality-v2/`)
```
src/app/(app)/quality-v2/
├── dashboard/                ✅ REFACTORIZADO
├── library/                  ✅ REFACTORIZADO
└── (falta migrar otros)

src/components/quality-v2/
├── LotQcDrawer.tsx          ✅ REFACTORIZADO
├── QcResultsForm.tsx        ✅ NUEVO
└── LotDocumentsPanel.tsx    ✅ NUEVO
```

---

## 📊 ANÁLISIS DE USO

### Archivos LEGACY Activamente Utilizados

#### 1. **GeminiAlertsCard.tsx** (5 usos)
**Usado en:**
- `quality/plans/QualityPlansClient.tsx`
- `quality/dashboard/page.tsx`
- `quality/lots/QualityLotsClient.tsx`
- `quality/traceability/QualityTraceabilityClient.tsx`
- `quality/GeminiAlertsCard.tsx` (auto-referencia)

**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** MIGRAR a quality-v2 con Design System v2.0

#### 2. **QcPlanDrawer.tsx** (13 usos)
**Usado en:**
- `quality/plans/QualityPlansClient.tsx`
- Múltiples referencias internas

**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** MIGRAR a quality-v2 como `QualityPlanDrawer.tsx`

#### 3. **QcPlanEditorDrawer.tsx** (16 usos)
**Usado en:**
- `quality/plans/QualityPlansClient.tsx`
- Componentes de edición

**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** MIGRAR a quality-v2 como `QualityPlanEditorDrawer.tsx`

#### 4. **ReleaseLotDrawer.tsx** (1 uso)
**Usado en:**
- `quality/lots/QualityLotsClient.tsx`

**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** Ya existe `LotQcDrawer.tsx` en v2 - DEPRECAR tras migración

#### 5. **QualityBadge.tsx** / **DecisionBadge.tsx**
**Usado en:** Múltiples páginas quality legacy

**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** REEMPLAZAR por badges Design System v2.0 (`.sb-badge--variant`)

### Server Actions LEGACY

#### **quality.actions.ts** (16 referencias)
**Usado en:** Múltiples componentes legacy

**Estado:** ⚠️ LEGACY ACTIVO - SISTEMA PARALELO
**Acción:** Mantener hasta migración completa, luego deprecar

#### **quality.data.ts** (3 referencias)
**Estado:** ⚠️ LEGACY ACTIVO
**Acción:** Migrar queries a servicios canónicos

#### **quality-helpers.ts** (1 referencia)
**Estado:** ⚠️ LEGACY ACTIVO  
**Acción:** Migrar lógica a servicios canónicos

---

## 🎯 PLAN DE MIGRACIÓN

### Fase 1: COMPLETADA ✅
- [x] quality-v2/dashboard (Design System v2.0)
- [x] quality-v2/library (Design System v2.0)
- [x] LotQcDrawer.tsx (Design System v2.0)

### Fase 2: PENDIENTE (Prioridad Alta)

#### 2.1 Migrar Componentes Core (3 días)
- [ ] **GeminiAlertsCard.tsx** → `quality-v2/GeminiAlertsCard.tsx`
  - Aplicar Design System v2.0
  - Usar `.sb-card-glass-light`
  - Tipos canónicos `GeminiAnalysis[]`

- [ ] **QcPlanDrawer.tsx** → `quality-v2/QualityPlanDrawer.tsx`
  - Aplicar `.sb-drawer`
  - Tabs `.sb-tabs`
  - Tipos `QualityPlan`

- [ ] **QcPlanEditorDrawer.tsx** → `quality-v2/QualityPlanEditorDrawer.tsx`
  - Form con `.sb-input`, `.sb-select`
  - Validación Zod
  - Error handling

#### 2.2 Migrar Páginas (2 días)
- [ ] `quality/lots/` → `quality-v2/lots/`
- [ ] `quality/releases/` → `quality-v2/releases/`
- [ ] `quality/plans/` → `quality-v2/plans/`
- [ ] `quality/traceability/` → `quality-v2/traceability/`

#### 2.3 Deprecar Actions Legacy (2 días)
- [ ] Migrar lógica de `quality.actions.ts` a `quality-v2.actions.ts`
- [ ] Migrar queries de `quality.data.ts` a servicios canónicos
- [ ] Marcar como `@deprecated` en TSDoc

### Fase 3: LIMPIEZA (1 día)

- [ ] Eliminar `src/app/(app)/quality/` completo
- [ ] Eliminar `src/components/quality/` completo
- [ ] Eliminar actions legacy
- [ ] Actualizar rutas en navegación
- [ ] Tests de regresión

---

## 📋 COMPONENTES POR MIGRAR

### Alta Prioridad (usados en >5 lugares)

| Componente | Referencias | Complejidad | Estimado |
|------------|-------------|-------------|----------|
| GeminiAlertsCard | 5 | Media | 4h |
| QcPlanDrawer | 13 | Alta | 8h |
| QcPlanEditorDrawer | 16 | Alta | 12h |

### Media Prioridad (usados en 1-5 lugares)

| Componente | Referencias | Complejidad | Estimado |
|------------|-------------|-------------|----------|
| ReleaseLotDrawer | 1 | Media | 6h |
| QualityBadge | 3 | Baja | 2h |
| DecisionBadge | 2 | Baja | 1h |

### Baja Prioridad (helpers/utils)

| Archivo | Referencias | Acción |
|---------|-------------|--------|
| quality-helpers.ts | 1 | Migrar lógica a servicios |
| quality-stats.ts | 2 | Migrar queries a servicios |
| qc-plan-helpers.ts | 1 | Migrar a QualityService |

---

## 🔄 ESTRATEGIA DE COEXISTENCIA

Durante la migración, ambos sistemas coexistirán:

### Rutas Paralelas
```
/quality/dashboard          → LEGACY (mantener hasta migración)
/quality-v2/dashboard       → NUEVO ✅ (ya migrado)

/quality/lots               → LEGACY (usar hasta migración)
/quality-v2/lots            → NUEVO (pendiente)

/quality/plans              → LEGACY (usar hasta migración)
/quality-v2/plans           → NUEVO (pendiente)
```

### Feature Flags (Recomendado)
```typescript
// config/features.ts
export const FEATURES = {
  QUALITY_V2_ENABLED: process.env.NEXT_PUBLIC_QUALITY_V2 === 'true',
  QUALITY_V2_LOTS: false,      // Feature específica
  QUALITY_V2_PLANS: false,     // Feature específica
};

// Uso en navegación
{FEATURES.QUALITY_V2_ENABLED ? (
  <Link href="/quality-v2/dashboard">Dashboard QC</Link>
) : (
  <Link href="/quality/dashboard">Dashboard QC</Link>
)}
```

---

## 🗑️ ARCHIVOS CANDIDATOS A DEPRECACIÓN

### Inmediata (tras migrar referencia)
- `src/components/quality/QualityBadge.tsx` → Reemplazar por `.sb-badge--variant`
- `src/components/quality/DecisionBadge.tsx` → Reemplazar por `.sb-badge--variant`

### Tras migración completa
- **TODO** `src/app/(app)/quality/` (directorio completo)
- **TODO** `src/components/quality/` (directorio completo)
- **TODO** `src/server/actions/quality.actions.ts`
- **TODO** `src/server/actions/quality.data.ts`
- **TODO** `src/server/actions/quality-helpers.ts`
- **TODO** `src/server/actions/quality-stats.ts`
- **TODO** `src/domain/qc-plan-helpers.ts`

---

## 📊 IMPACTO DE MIGRACIÓN

### Archivos a Crear (quality-v2)
```
src/components/quality-v2/
├── GeminiAlertsCard.tsx      (migrar de legacy)
├── QualityPlanDrawer.tsx     (migrar QcPlanDrawer)
├── QualityPlanEditor.tsx     (migrar QcPlanEditorDrawer)
└── StatusBadges.tsx          (migrar QualityBadge + DecisionBadge)

src/app/(app)/quality-v2/
├── lots/
│   ├── page.tsx
│   └── QualityLotsClient.tsx
├── releases/
│   ├── page.tsx
│   └── QualityReleasesClient.tsx
├── plans/
│   ├── page.tsx
│   └── QualityPlansClient.tsx
└── traceability/
    ├── page.tsx
    └── QualityTraceabilityClient.tsx
```

### Archivos a Eliminar (tras migración)
```
src/app/(app)/quality/         (completo)
src/components/quality/        (completo)
```

---

## ⚠️ RIESGOS

1. **Pérdida de funcionalidad**: Verificar que todas las features estén migradas
2. **Referencias rotas**: Actualizar imports en toda la codebase
3. **Data consistency**: Asegurar
