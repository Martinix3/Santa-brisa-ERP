# TypeScript Error Analysis Report - Santa Brisa ERP
**Fecha**: 18/01/2025 08:56 AM
**Errores Totales**: 144
**Reducción desde inicio**: -90.0% (desde 1440 errores)

---

## 📊 Resumen Ejecutivo

### Progreso de Reducción
```
Inicio (post itemId→sku):  1440 errores
Parches #1-9:                197 errores (-86.3%)
Parches #10-18:              167 errores (-88.4%)
Patch #19 (status.ts):       144 errores (-90.0%) ✅ ACTUAL
```

### Distribución por Código de Error

| Código | Cantidad | % Total | Categoría |
|--------|----------|---------|-----------|
| TS2339 | 26 | 18.1% | Property does not exist |
| TS2322 | 25 | 17.4% | Type not assignable |
| TS18048 | 20 | 13.9% | Possibly undefined |
| TS2367 | 20 | 13.9% | Type comparison issues |
| TS2304 | 11 | 7.6% | Cannot find name |
| TS2345 | 11 | 7.6% | Argument type mismatch |
| TS7006 | 10 | 6.9% | Implicit any parameters |
| TS2741 | 9 | 6.3% | Missing properties |
| TS2307 | 6 | 4.2% | Cannot find module |
| TS2305 | 2 | 1.4% | No exported member |
| Otros | 4 | 2.8% | Diversos |

---

## 🔥 Top 20 Archivos con Más Errores

| # | Errores | Archivo |
|---|---------|---------|
| 1 | 12 | `src/app/(app)/*` (varios pages) |
| 2 | 10 | `src/lib/sb-core.ts` |
| 3 | 10 | `src/features/orders/components/OrdersDashboard.tsx` |
| 4 | 9 | `src/features/accounts/components/BusinessAlertsCard.tsx` |
| 5 | 7 | `src/server/gemini/analyzers/quality-analyzer.ts` |
| 6 | 7 | `src/components/admin/UserTerritoryTab.tsx` |
| 7 | 6 | `src/server/actions/quality-plans.ts` |
| 8 | 6 | `src/server/actions/accounts-data.ts` |
| 9 | 5 | `src/features/personal/PersonalPipelineBoard.tsx` |
| 10 | 5 | `scripts/test-holded-orders.ts` |
| 11 | 4 | `src/features/production/execution/helpers.ts` |
| 12 | 3 | `src/lib/finance-helpers.ts` |
| 13 | 3 | `src/features/production/execution/components/StockCheckPanel.tsx` |
| 14 | 3 | `src/components/layout/Sidebar.tsx` |
| 15 | 3 | `src/app/api/shipment/[shipmentId]/picking-slip/route.ts` |
| 16 | 2 | `src/server/actions/warehouse.actions.ts` |
| 17 | 2 | `src/lib/santa-brain/gemini-client.ts` |
| 18 | 2 | `src/lib/dataprovider/reads.ts` |
| 19 | 2 | `src/features/sales/pipeline/components/StageColumn.tsx` |
| 20 | 2 | `src/features/sales/pipeline/components/PipelineColumn.tsx` |

---

## 🔍 Análisis por Categoría

### 1. TS2339: Property Does Not Exist (26 errores - 18.1%)

**Causa Principal**: Uso de propiedades deprecated o renombradas.

**Ejemplos**:
```typescript
// ❌ ERROR: data.accounts no existe (es data.contacts ahora)
const accounts = data.accounts;

// ❌ ERROR: data.orders no existe (es data.ordersSellOut)
const orders = data.orders;

// ❌ ERROR: order.total no existe (es order.totalAmount)
const total = order.total;

// ❌ ERROR: item.itemId en código que recibe solo sku
const id = move.itemId; // pero move solo tiene 'sku'
```

**Archivos Afectados**:
- `OrdersDashboard.tsx` (uso de `data.orders`)
- `BusinessAlertsCard.tsx` (acceso a propiedades undefined)
- Varios helpers y analyzers

**Solución Prioritaria**:
1. Buscar y reemplazar `data.orders` → `data.ordersSellOut`
2. Buscar y reemplazar `.total` → `.totalAmount`
3. Usar pattern dual: `item.sku ?? item.itemId`

---

### 2. TS2322: Type Not Assignable (25 errores - 17.4%)

**Causa Principal**: Asignación de valores incompatibles con tipos estrictos.

**Ejemplos**:
```typescript
// ❌ ERROR: string | undefined no es string
function process(id: string) { ... }
process(shipment.trackingCode); // string | undefined

// ❌ ERROR: tipo Item usado donde se espera BomLine
const items: Item[] = bom.items; // bom.items es BomLine[]
```

**Archivos Afectados**:
- `picking-slip/route.ts` (parámetros opcionales)
- `TimePicker.tsx` (setState types)
- Varios componentes de formularios

**Solución**:
```typescript
// ✅ Usar nullish coalescing
process(shipment.trackingCode ?? '');

// ✅ Type guards
if (shipment.trackingCode) {
  process(shipment.trackingCode);
}
```

---

### 3. TS18048: Possibly Undefined (20 errores - 13.9%)

**Causa Principal**: Acceso a propiedades opcionales sin null checks.

**Ejemplos**:
```typescript
// ❌ ERROR en UserTerritoryTab.tsx
territory.regions.length // regions es opcional
territory.provinces.length // provinces es opcional

// ❌ ERROR en data-import/actions.ts
data.accounts.filter(...) // accounts es opcional

// ❌ ERROR en BusinessAlertsCard.tsx
styles.borderColor // styles puede ser undefined
```

**Solución**:
```typescript
// ✅ Optional chaining
territory.regions?.length ?? 0
territory.provinces?.length ?? 0

// ✅ Null check explícito
if (data.accounts) {
  const filtered = data.accounts.filter(...);
}

// ✅ Default value
const color = styles?.borderColor ?? 'gray';
```

---

### 4. TS2304: Cannot Find Name (11 errores - 7.6%)

**Causa Principal**: Referencias a tipos no importados o renombrados.

**Ejemplos**:
```typescript
// ❌ ERROR: 'Item' not found
function getItem(): Item { ... } // falta import

// ❌ ERROR en production/bom/actions.ts
const item: Item = ... // Item no importado desde SSOT
```

**Archivos Afectados**:
- `Sidebar.tsx` (3 referencias a Item)
- `DynamicHeader.tsx` (2 referencias a Item)
- `Header.tsx` (1 referencia a Item)
- `bom/actions.ts` (1 referencia a Item)

**Solución**:
```typescript
// ✅ Añadir import
import type { Item } from '@/domain/ssot';
```

---

### 5. TS2741: Missing Properties (9 errores - 6.3%)

**Causa Principal**: Objetos que no cumplen interface completa.

**Ejemplos**:
```typescript
// ❌ ERROR en users/page.spec.tsx (6 ocurrencias)
const user = {
  id: '1',
  displayName: 'Test',
  email: 'test@test.com',
  role: 'admin',
  active: true
}; // Falta 'name' property requerida

// ❌ ERROR en user-roles.ts
const roleConfig: Record<UserRole, PermissionConfig> = {
  owner: {...},
  admin: {...},
  comercial: {...}
  // Falta 'marketing' key
};
```

**Solución**:
```typescript
// ✅ Añadir propiedades faltantes
const user = {
  id: '1',
  name: 'Test User', // ✅ añadido
  displayName: 'Test',
  email: 'test@test.com',
  role: 'admin',
  active: true
};

// ✅ Añadir key faltante
const roleConfig = {
  owner: {...},
  admin: {...},
  comercial: {...},
  marketing: {...} // ✅ añadido
};
```

---

### 6. TS7006: Implicit Any (10 errores - 6.9%)

**Causa Principal**: Parámetros sin tipo explícito.

**Ejemplos**:
```typescript
// ❌ ERROR en test-holded-orders.ts (5 ocurrencias)
orders.map(order => ...) // order: any
totals.reduce((sum, o) => ...) // sum: any, o: any

// ❌ ERROR en ContactDrawer.tsx
amounts.reduce((sum, a) => ...) // sum: any
```

**Solución**:
```typescript
// ✅ Type annotations
orders.map((order: OrderSellOut) => ...)
totals.reduce((sum: number, o: OrderSellOut) => ...)
amounts.reduce((sum: number, a: number) => ...)
```

---

### 7. TS2307: Cannot Find Module (6 errores - 4.2%)

**Causa Principal**: Imports de módulos movidos o eliminados.

**Ejemplos**:
```typescript
// ❌ ERROR
import { useTasks } from '@/features/agenda/hooks/useTasks';
// Module no encontrado

// ❌ ERROR
import { helpers } from '@/features/agenda/helpers';
// Module no encontrado

// ❌ ERROR
import { actions } from '@/app/(app)/accounts/[id]/actions';
// Path incorrecto
```

**Solución**: Verificar paths y mover/crear módulos faltantes.

---

## 🎯 Plan de Acción Priorizado

### Fase 1: Quick Wins (Impacto: -40 errores, Esfuerzo: 1h)

#### A. Missing Imports (11 TS2304)
```bash
# Buscar archivos sin import de Item
rg "Item\b" --type tsx --type ts | rg -v "import.*Item"
```
**Acción**: Añadir `import type { Item } from '@/domain/ssot';`

#### B. Implicit Any Parameters (10 TS7006)
```bash
# Revisar callbacks sin tipos
rg "\.map\(|\.filter\(|\.reduce\(" scripts/
```
**Acción**: Añadir type annotations a parámetros.

#### C. Property Renames (15 TS2339 fáciles)
```bash
# Buscar usos deprecated
rg "data\.orders\b" src/
rg "\.total\b" src/features/orders/
```
**Acción**: 
- `data.orders` → `data.ordersSellOut`
- `order.total` → `order.totalAmount`

---

### Fase 2: Null Safety (Impacto: -30 errores, Esfuerzo: 2h)

#### A. Optional Chaining (20 TS18048)
**Archivos prioritarios**:
1. `UserTerritoryTab.tsx` (7 errores)
2. `data-import/actions.ts` (3 errores)
3. `BusinessAlertsCard.tsx` (4 errores)

**Template de fix**:
```typescript
// Buscar pattern: obj.prop.method()
// Reemplazar: obj.prop?.method() ?? default
```

#### B. String Coalescing (11 TS2322/2345)
**Template de fix**:
```typescript
// Buscar: function
