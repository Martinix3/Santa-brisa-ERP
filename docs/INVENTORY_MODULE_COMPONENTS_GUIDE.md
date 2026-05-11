# 📦 Guía de Componentes del Módulo de Inventario

> **Índice completo de componentes, servicios y documentación del sistema de inventario**  
> Santa Brisa ERP - Módulo Warehouse/Inventory

---

## 📍 Navegación rápida

- [Componentes UI](#componentes-ui)
- [Servicios Canónicos](#servicios-canónicos)
- [Hooks y Lógica](#hooks-y-lógica)
- [Server Actions](#server-actions)
- [Configuración](#configuración)
- [Documentación](#documentación)

---

## 🎨 Componentes UI

### Página Principal
**Ubicación:** `src/app/(app)/warehouse/inventory/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `InventoryClient.tsx` | Orquestador principal del módulo | ✅ Refactorizado |
| `page.tsx` | Server component que carga datos | ✅ Activo |

### Drawers y Modales

| Archivo | Propósito | Props principales |
|---------|-----------|-------------------|
| `NewOnHandDialog.tsx` | Formulario completo recepciones/ajustes | `items`, `locations`, `suppliers` |
| `NewItemDrawer.tsx` | Creación rápida productos (expandido) | `onSuccess(item)` |
| `SupplierDrawer.tsx` | Alta express de proveedores | `onSuccess(supplier)` |
| `ItemDetailDrawer.tsx` | Edición precios/logística con glassmorphism | `item`, `recentReceipts`, `onSuccess` |
| `ManualAdjustmentDrawer.tsx` | Ajustes manuales (no usado actualmente) | `items`, `locations` |

**Ubicación:** `src/app/(app)/warehouse/inventory/components/`

### Componentes de Vista

| Archivo | Propósito | Características |
|---------|-----------|-----------------|
| `SkuAccordionRow.tsx` | Fila expandible por SKU | Maneja buckets SSOT V2, muestra lotes |
| `LotRows.tsx` | Vista plana de lotes | Usa `lotCode` canónico |
| `LotDetailPanel.tsx` | Panel lateral detalle de lote | Historial de movimientos |
| `InventoryFiltersBar.tsx` | Barra de filtros compacta | Búsqueda, ubicación, QC, stock |

**Ubicación:** `src/app/(app)/warehouse/inventory/components/` y `src/features/warehouse/inventory/components/`

### Dashboard

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `InventoryDashboard.tsx` | `src/features/warehouse/components/` | KPIs y resumen de inventario |

---

## ⚙️ Servicios Canónicos

**Ubicación:** `src/services/canonical/`

### OnHandService
**Archivo:** `onhand.service.ts`

**Responsabilidad:** Gestión de saldos de inventario con buckets QC

**Métodos principales:**
```typescript
// Actualizar saldo en bucket específico
static async updateBalance(tx, params: {
  itemId, lotCode, locationId, bucket, deltaQty, reason, userId
}): Promise<OnHand>

// Transferir entre buckets (ej: HOLD → RELEASED)
static async transferBetweenBuckets(tx, params: {
  itemId, lotCode, locationId, fromBucket, toBucket, qty
}): Promise<void>

// Reservar stock
static async reserveStock(tx, params): Promise<OnHand>

// Construir ID canónico
static buildOnHandId(itemId, lotCode, locationId): string
```

**Invariantes garantizadas:**
- `totalQty` = suma de todos los buckets
- `availableQty` = RELEASED - reservado
- No negativos en ningún bucket
- Reservas ≤ stock RELEASED

---

### LotService
**Archivo:** `lot.service.ts`

**Responsabilidad:** Generación race-free de lotes y creación transaccional

**Métodos principales:**
```typescript
// Generar código único (YYJJJ-PL-SEQ)
static async generateLotCode(tx, params: {
  plant, line?, date?
}): Promise<string>

// Crear lote completo (lot + onHand inicial)
static async createLot(tx, params: {
  itemId, plant, line?, quantity, uom, locationId,
  supplierId?, externalLot?, expiryDate?, userId?
}): Promise<{ lotId, lotCode }>

// Validar formato de lotCode
static validateLotCode(lotCode): boolean

// Parsear información del lotCode
static parseLotCode(lotCode): { year, dayOfYear, plant, line?, sequence, date }
```

**Patrón lotCode:**
- `25001-SB-001` (año 25, día 001, planta SB, secuencia 001)
- `25293-SB-L1-004` (con línea de producción L1)

---

### SkuService
**Archivo:** `sku.service.ts`

**Responsabilidad:** Normalización y generación de SKUs

**Métodos:**
```typescript
static makeSku(params: { category, family?, variant?, size?, pack? }): string
static validateSku(sku): boolean
static normalizeSku(sku): string
```

---

## 🪝 Hooks y Lógica

**Ubicación:** `src/features/warehouse/inventory/hooks/`

### useInventoryData
**Archivo:** `useInventoryData.ts`

**Propósito:** Transformar y preparar datos de inventario

**Returns:**
```typescript
{
  summaries: Record<string, SkuStockSummary>,
  skusWithLots: SkuWithLots[],
  lotRows: LotRowData[],
  uomIncidentCount: number,
  locations: string[],
  itemsById: Map<string, Item>,  // ✅ Canónico SSOT V2
  itemsBySku: Map<string, Item>  // Legacy (deprecated)
}
```

**Características:**
- Maneja buckets SSOT V2 (`qty.RELEASED`, `qty.HOLD`, `qty.REJECTED`)
- Compatible con datos legacy
- Enriquece con `lotMaster` desde colección `lots`

---

### useInventoryFilters
**Archivo:** `useInventoryFilters.ts`

**Propósito:** Gestionar filtros de inventario

**Filtros disponibles:**
- `globalSearch` - Búsqueda en SKU, nombre, lotCode
- `locationId` - Filtro por ubicación
- `qcStatus` - Estado QC (PASSED/PENDING/FAILED)
- `onlyWithStock` - Solo con stock disponible

**Returns:**
```typescript
{
  filters: InventoryFilters,
  setGlobalSearch(search),
  setLocationFilter(locationId),
  setQcFilter(qcStatus),
  setOnlyWithStock(only),
  resetFilters(),
  filteredOnHand: OnHandView[],
  totalRecords: number,
  filteredRecords: number,
  isSearching: boolean
}
```

**Características:**
- Debounce en búsqueda (300ms)
- Maneja buckets SSOT V2 para filtro de stock
- Búsqueda en múltiples campos (SKU, itemId, lotCode, nombre)

---

## 🔧 Server Actions

**Ubicación:** `src/server/actions/`

### inventory.actions.ts

**Funciones:**

```typescript
// Crear ajuste manual con generación automática de lote
async function createManualOnHand(
  payload: {
    itemId, qty, uom, locationId, occurredAt?,
    note?, supplier?, invoiceRef?, amount?, currency?
  },
  userId: string
): Promise<{ ok, value: { stockMoveId, lotCode, lotId } }>

// Reconstruir saldos OnHand
async function rebuildOnHand(): Promise<{ ok, count?, error? }>

// Snapshot completo del inventario
async function getInventorySnapshot(): Promise<{
  onHand, items, stockMoves, lots, alerts
}>
```

**Flujo createManualOnHand:**
1. Validación Zod del payload
2. Transacción Firestore:
   - READ: Verificar item existe
   - WRITE: Crear lote con `LotService.createLot()`
   - WRITE: Crear StockMove
   - WRITE: Crear TraceEvent
3. Return lotCode generado

---

### goods-receipt.actions.ts

**Funciones:**

```typescript
// Crear proveedor
async function createSupplier(payload: {
  name, taxId?
}): Promise<{ id, name }>

// Crear producto (expandido con todos los detalles)
async function createItem(payload: {
  name, sku?, uom, category?, stdCost?,
  eanCode?, packagingType?, priceBase?,
  logistics?: {
    unitsPerCase?, casesPerPallet?,
    weightPerUnit?, volumePerUnit?, bottleMl?
  }
}): Promise<Item>

// Crear recepción de mercancía
async function createGoodsReceipt(payload): Promise<{
  id, receiptId, receiptNumber, supplierId
}>
```

---

## 📐 Configuración

### Ubicaciones Canónicas
**Archivo:** `src/config/locations.ts`

```typescript
export const CANONICAL_LOCATIONS = {
  ALMACEN_PRINCIPAL: 'ALMACEN_PRINCIPAL',
  VIRTUAL_MANUAL: 'VIRTUAL_MANUAL',
  VIRTUAL_PRODUCTION: 'VIRTUAL_PRODUCTION',
} as const;

export const DEFAULT_WAREHOUSE_LOCATIONS = [
  'ALMACEN_PRINCIPAL',
];
```

### Inventario
**Archivo:** `src/config/inventory.ts`

```typescript
export const INVENTORY_ALERT_CONFIG = {
  nearExpiryDays: 30,
  // ... otras configuraciones
};

export const DEFAULT_WAREHOUSE_LOCATIONS = [
  'ALMACEN_PRINCIPAL',
  'PRODUCCION',
];
```

---

## 📚 Documentación

### Guías de Implementación

| Documento | Ubicación | Contenido |
|-----------|-----------|-----------|
| `WAREHOUSE_INVENTORY_UX_REFACTOR_COMPLETE.md` | Raíz | Refactor UX/UI completo, arquitectura SRP |
| `SSOT_V2_ESPECIFICACION_TECNICA_COMPLETA.md` | Raíz | Especificación SSOT V2, servicios, transacciones |
| `design_SYSTEM_GIDE2.md` | `docs/` | Design System v2.0, tokens, componentes |
| `SETUP_LOCATIONS_MANUAL.md` | Raíz | Setup de ubicaciones canónicas |

### Reportes y Auditorías

| Documento | Propósito |
|-----------|-----------|
| `WAREHOUSE_INVENTORY_SSOT_V2_VALIDATION_REPORT.md` | Validación compliance SSOT V2 |
| `WAREHOUSE_INVENTORY_AUDIT_REPORT.md` | Auditoría general del módulo |
| `INVENTORY_COSTUNIT_ARCHITECTURE_DECISION.md` | Decisiones arquitectónicas |

---

## 🚀 Flujos de Trabajo

### 1. Crear Nuevo Producto

**UI:** Botón "Nuevo item" → `NewItemDrawer`

**Flujo:**
```
Usuario rellena formulario (nombre, SKU, categoría, UOM, EAN, precios, logística)
  ↓
NewItemDrawer.onSubmit()
  ↓
createItem(payload)
  ↓
Firestore: items/{id}
  ↓
onSuccess(newItem)
```

**Campos guardados:**
- Básicos: `name`, `sku`, `category`, `uom`, `stdCost`
- Identificación: `eanCode`, `packagingType`
- Precios: `priceBase`
- Logística: `unitsPerCase`, `casesPerPallet`, `weightPerUnit`, `volumePerUnit`, `bottleMl`

---

### 2. Crear Recepción Manual

**UI:** Botón "Nueva recepción" → `NewOnHandDialog`

**Flujo:**
```
Usuario selecciona producto o crea nuevo
  ↓
Usuario ingresa cantidad, ubicación, proveedor, etc.
  ↓
NewOnHandDialog.onSubmit()
  ↓
createManualOnHand(payload, userId)
  ↓
Transacción Firestore:
  1. Validar item existe
  2. LotService.createLot() → genera lotCode único
  3. Crear StockMove con fromLocationId contextual
  4. Crear TraceEvent
  ↓
onSuccess({ stockMoveId, lotCode })
```

**Datos generados:**
- `Lot` con código `YYJJJ-PL-SEQ`
- `OnHand` en bucket `HOLD
