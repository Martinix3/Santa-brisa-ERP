# 🎯 FASE 6 - MEJORAS UX Y TESTS

**Objetivo:** Implementar 3 mejoras UX críticas + tests básicos
**Tiempo estimado:** 1-2 días
**Resultado esperado:** Puntuación de 7.5/10 → 8.75/10

---

## 📋 IMPLEMENTACIÓN

### PARTE A: MEJORAS UX (6-8h)

#### 1. ALERTA DE STOCK BAJO EN SIDEBAR (2h)
**Archivo:** `src/features/production/execution/components/ProductionSidebar.tsx`

**Cambios:**
- Añadir función `checkBomStock` que verifica disponibilidad
- Mostrar badge visual (🔴 crítico, 🟡 bajo, ✅ ok)
- Tooltip con detalle de faltantes

#### 2. TOOLTIPS EXPLICATIVOS (2-3h)
**Archivos:** 
- `src/app/(app)/production/dashboard/page.tsx`
- `src/app/(app)/production/bom/page.tsx`

**Tooltips a añadir:**
- "Complejidad media" → explicar cálculo
- "OEE" → explicar componentes
- "Lotes liberados" → explicar criterio
- "BOMs activos" → explicar filtro

#### 3. INDICADOR DE PROGRESO (3-4h)
**Archivos:**
- `src/features/production/execution/components/ProductionSidebar.tsx`
- `src/app/(app)/production/dashboard/page.tsx` (tabla de órdenes)

**Cambios:**
- Función `calculateProgress` basada en estado
- Barra visual con gradiente
- Porcentaje numérico
- Color según estado

### PARTE B: TESTS BÁSICOS (8-10h)

#### 1. Tests de Helpers (2-3h)
**Archivo:** `src/features/production/execution/helpers.test.ts`

Tests a crear:
- `canEditPlan`, `canStart`, `canPause`, `canResume`, `canFinish`
- `isClosedLike`
- `picksToRealLines` (agregación)

#### 2. Tests de BOM Service (3-4h)
**Archivo:** `src/server/production/bom.service.test.ts`

Tests a crear:
- `explodeBOM` con casos normales
- `explodeBOM` con BOM inexistente
- Cálculo correcto de cantidades
- Respeto de UOMs canónicos

#### 3. Tests de Validaciones (2-3h)
**Archivo:** `src/features/production/validation.test.ts`

Tests a crear:
- Validación de balance en BOMs
- Validación de campos requeridos
- Validación de transiciones de estado

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

### DÍA 1: UX (6-8h)
1. ✅ Indicador de progreso (4h)
2. ✅ Alerta de stock bajo (2h)
3. ✅ Tooltips básicos (2h)

### DÍA 2: TESTS (8-10h)
4. ✅ Tests de helpers (3h)
5. ✅ Tests de BOM service (4h)
6. ✅ Tests de validaciones (3h)

**Resultado:** Puntuación 8.75/10

---

## COMENZAMOS CON...

La mejora MÁS VISIBLE y de MAYOR IMPACTO:

**INDICADOR DE PROGRESO EN ÓRDENES** 🎯
