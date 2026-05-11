# TypeScript Errors by Type - Santa Brisa ERP
**Fecha**: 18/01/2025 09:01 AM
**Total**: 144 errores
**Reducción**: -90.0% desde 1440 errores iniciales

---

## 📊 Resumen por Código

| Código | Cantidad | % | Descripción |
|--------|----------|---|-------------|
| TS2339 | 26 | 18.1% | Property does not exist on type |
| TS2322 | 25 | 17.4% | Type is not assignable |
| TS18048 | 20 | 13.9% | Possibly 'undefined' |
| TS2367 | 20 | 13.9% | Type comparison |
| TS2304 | 11 | 7.6% | Cannot find name |
| TS2345 | 11 | 7.6% | Argument type mismatch |
| TS7006 | 10 | 6.9% | Implicit 'any' type |
| TS2741 | 9 | 6.3% | Missing properties |
| TS2307 | 6 | 4.2% | Cannot find module |
| Otros | 6 | 4.2% | Diversos |

---

## 🔴 TS2339: Property Does Not Exist (26 errores)

### 1. data.orders → data.ordersSellOut (1 error)
```
src/features/orders/components/OrdersDashboard.tsx(52,27):
  Property 'orders' does not exist on type 'SantaData'
```
**Fix**: `data.orders` → `data.ordersSellOut`

---

### 2. order.total → order.totalAmount (1 error)
```
src/features/orders/components/OrdersDashboard.tsx(266,45):
  Property 'total' does not exist on type 'OrderSellOut'
```
**Fix**: `order.total` → `order.totalAmount` o calcular desde lines

---

### 3. itemId en objetos con solo sku (11 errores)
```
src/features/production/execution/components/RealConsumptionPanel.tsx(32,29):
  Property 'itemId' does not exist on type 'RealConsumptionLine'

src/features/production/execution/helpers.ts(16,20):
src/features/production/execution/helpers.ts(17,43):
src/features/production/execution/helpers.ts(17,86):
src/features/production/execution/helpers.ts(17,106):
  Property 'itemId' does not exist on type '{ sku: string; lotNumber: string; ... }'

src/lib/dataprovider/reads.ts(134,47):
src/lib/dataprovider/reads.ts(139,14):
  Property 'itemId' does not exist on type '{ qty: number; sku: string; ... }'

src/server/actions/quality-helpers.ts(112,60):
  Property 'sku' does not exist on type '{ lotNumber: string; itemId: string; ... }'
```
**Fix**: Usar `sku` en lugar de `itemId` o pattern dual `(sku ?? itemId)`

---

### 4. account.accountType → account.segment (2 errores)
```
src/lib/santa-brain/gemini-client.ts(70,21):
src/lib/santa-brain/gemini-client.ts(70,42):
  Property 'accountType' does not exist on type '{ id: string; name: string; segment?: string; ... }'
```
**Fix**: `account.accountType` → `account.segment`

---

### 5. Propiedades deprecated en Account (5 errores)
```
src/server/actions/accounts-data.ts(368,17):
  Property 'vat' does not exist on type 'Account'

src/server/actions/accounts-data.ts(369,17):
  Property 'email' does not exist on type 'Account'

src/server/actions/accounts-data.ts(370,17):
  Property 'phone' does not exist on type 'Account'

src/server/actions/accounts-data.ts(374,17):
  Property 'customerType' does not exist on type 'Account'

src/server/actions/accounts-data.ts(377,21):
  Property 'address' does not exist on type 'Account'
```
**Fix**: Account fue simplificado, usar Contact para estos campos

---

### 6. Propiedades en tipos incorrectos (6 errores)
```
src/lib/sb-core.ts(19,78):
  Property 'unitPrice' does not exist on type 'OrderLine'

src/lib/sb-core.ts(67,34):
  Property 'kind' does not exist on type 'Item'

src/lib/sb-core.ts(164,39):
  Property 'summary' does not exist on type 'Interaction'

src/features/personal/PersonalPipelineBoard.tsx(107,40):
  Property 'accountId' does not exist on type 'number'

src/server/gemini/analyzers/quality-analyzer.ts(840,23):
  Property 'priority' does not exist on type 'number'

src/server/gemini/analyzers/quality-analyzer.ts(841,21):
  Property 'recommendation' does not exist on type 'number'

src/server/gemini/analyzers/quality-analyzer.ts(842,40):
  Property 'type' does not exist on type 'number'

src/server/gemini/analyzers/quality-analyzer.ts(842,51):
  Property 'metrics' does not exist on type 'number'

src/server/gemini/analyzers/quality-analyzer.ts(842,91):
  Property 'metrics' does not exist on type 'number'
```
**Fix**: Revisar tipos, posibles type guards faltantes

---

## 🟡 TS2322: Type Not Assignable (25 errores)

### 1. Props mismatch (1 error)
```
src/features/sales/pipeline/components/PipelineColumn.tsx(33,61):
  Type '{ key: any; account: PipelineAccount; onProgram: (accountId: string) => void; }'
  is not assignable to type 'IntrinsicAttributes & AccountCardProps'
```
**Fix**: Cambiar `onProgram` → `onProgramClick` en AccountCard props

---

### 2. Enum value mismatch (1 error)
```
src/features/tasks/components/TaskDrawer.tsx(80,9):
  Type 'TaskKind' is not assignable to type '"MARKETING" | "GENERICA" | "VISITA" | "COBRO" | "PEDIDO"'
```
**Fix**: Actualizar TaskKind enum o el tipo esperado

---

### 3. Union type issues (1 error)
```
src/lib/sb-core.ts(246,66):
  Type '"PENDING" | QcTest' is not assignable to type 'QcTest'
```
**Fix**: Remover literal "PENDING" o ajustar tipo de retorno

---

### 4. Array type mismatch (1 error)
```
src/server/actions/quality-plans.ts(548,11):
  Type '{ id: string; name: string; active: boolean; version: number | undefined; ... }[]'
  is not assignable to type 'QcPlanTableRow[]'
```
**Fix**: Mapear objetos al tipo QcPlanTableRow exacto

---

### 5. Enum literal mismatch (1 error)
```
src/server/integrations/holded/mappers.ts(215,9):
  Type '"SUPPLIER" | "HORECA" | "RETAIL" | "OTRO"' is not assignable to type 'AccountType'
```
**Fix**: Usar valores canónicos de AccountType

---

### 6. UOM literal mismatch (1 error)
```
src/server/production/bom.service.ts(36,11):
  Type '"L" | "UNIT"' is not assignable to type 'Uom'
```
**Fix**: `"L"` → `"L"` (lowercase), `"UNIT"` → `"unit"`

---

### 7. Otros TS2322 (19 errores no mostrados)
Ver listado completo con: `npx tsc --noEmit 2>&1 | grep "error TS2322"`

---

## 🟠 TS18048: Possibly 'undefined' (20 errores)

### 1. data.accounts opcional (3 errores)
```
src/app/(app)/admin/data-import/actions.ts(72,27):
src/app/(app)/admin/data-import/actions.ts(73,29):
src/app/(app)/admin/data-import/actions.ts(74,29):
  'data.accounts' is possibly 'undefined'
```
**Fix**: 
```typescript
if (data.accounts) {
  // usar data.accounts
}
// o
const accounts = data.accounts ?? [];
```

---

### 2. territory properties opcionales (7 errores)
```
src/components/admin/UserTerritoryTab.tsx(80,18):
  'territory.regions.length' is possibly 'undefined'

src/components/admin/UserTerritoryTab.tsx(81,37):
  'territory.regions' is possibly 'undefined'

src/components/admin/UserTerritoryTab.tsx(83,18):
  'territory.provinces.length' is possibly 'undefined'

src/components/admin/UserTerritoryTab.tsx(84,39):
  'territory.provinces' is possibly 'undefined'

src/components/admin/UserTerritoryTab.tsx(86,18):
  'territory.postalCodes.length' is possibly 'undefined'

src/components/admin/UserTerritoryTab.tsx(87,31):
src/components/admin/UserTerritoryTab.tsx(87,77):
  'territory.postalCodes' is possibly 'undefined'
```
**Fix**:
```typescript
territory.regions?.length ?? 0
territory.provinces?.length ?? 0
territory.postalCodes?.length ?? 0
```

---

### 3. styles opcional (8 errores)
```
src/features/accounts/components/BusinessAlertsCard.tsx(53,24):
src/features/accounts/components/BusinessAlertsCard.tsx(59,37):
src/features/accounts/components/BusinessAlertsCard.tsx(59,54):
src/features/accounts/components/BusinessAlertsCard.tsx(65,46):
src/features/accounts/components/BusinessAlertsCard.tsx(67,60):
src/features/accounts/components/BusinessAlertsCard.tsx(82,30):
src/features/accounts/components/BusinessAlertsCard.tsx(82,47):
src/features/accounts/components/BusinessAlertsCard.tsx(82,60):
  'styles' is possibly 'undefined'
```
**Fix**:
```typescript
const borderColor = styles?.borderColor ?? 'gray';
const bgColor = styles?.bgColor ?? 'white';
```

---

### 4. plan properties opcionales (2 errores)
```
src/server/actions/quality-plans.ts(217,16):
  'existingPlan.version' is possibly 'undefined'

src/server/actions/quality-plans.ts(559,26):
  'plan.parameters' is possibly 'undefined'
```
**Fix**:
```typescript
const version = existingPlan.version ?? 1;
const parameters = plan.parameters ?? [];
```

---

## 🔵 TS2304: Cannot Find Name (11 errores)

### 1. Item no importado (7 errores)
```
src/app/(app)/production/bom/actions.ts(64,32):
src/components/layout/DynamicHeader.tsx(47,56):
src/components/layout/DynamicHeader.tsx(182,46):
src/components/layout/Header.tsx(40,48):
src/components/layout/Sidebar.tsx(270,42):
src/components/layout/Sidebar.tsx(322,47):
src/components/layout/Sidebar.tsx(393,52):
  Cannot find name 'Item'
```
**Fix**: Añadir en cada archivo:
```typescript
import type { Item } from '@/domain/ssot';
```

---

### 2. Account no importado (2 errores)
```
src/features/personal/PersonalPipelineBoard.tsx(75,31):
src/features/personal/PersonalPipelineBoard.tsx(105,48):
  Cannot find name 'Account'
```
**Fix**:
```typescript
import type { Contact } from '@/domain/ssot';
// Account fue reemplazado por Contact
```

---

### 3. Variables no definidas (2 errores)
```
src/server/actions/item-pricing.actions.ts(40,38):
  Cannot find name 'itemId'

src/server/actions/orders-data.ts(280,44):
  Cannot find name 'Order'
```
**Fix**: Revisar scope de variables

---

## 🎯 Plan de Corrección Rápida

### Fase 1: Imports Faltantes (7 errores, 5 min)
```bash
# Añadir imports de Item
for file in \
  src/app/(app)/production/bom/actions.ts \
  src/components/layout/DynamicHeader.tsx \
  src/components/layout/Header.tsx \
  src/components/layout/Sidebar.tsx; do
  echo "import type { Item } from '@/domain
