# SSOT INVENTARIO - AUDITORÍA BASADA EN DATOS REALES

## RESUMEN EJECUTIVO

Esta auditoría está basada en **análisis de código real** y **patrones de datos en producción**, no en definiciones teóricas. Revela estructuras de datos significativamente más complejas que las documentadas en el SSOT teórico.

## 1. ENTIDADES CANÓNICAS - ESTRUCTURA REAL

### 1.1 WAREHOUSESUPPLIERS (17 referencias)
**Estado:** ✅ BUENO - Estructura simple y clara

**Campos Reales:**
```typescript
interface WarehouseSupplier {
  id: string;                    // Patrón: SUP_${timestamp}
  name: string;
  contactInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Generación de IDs:** `SUP_${Date.now()}`
**Relaciones:** Usado en items, lots, goodsReceipts

### 1.2 DOCUMENTS (Colección de documentos)
**Estado:** ✅ BUENO - Sistema de gestión documental integrado

**Campos Reales:**
```typescript
interface Document {
  id: string;
  name: string;                  // Nombre del archivo
  url: string;                   // URL de Storage
  type: 'contract' | 'invoice' | 'visit_photo' | 'plv_certificate' | 'qc_document' | 'coa' | 'other';
  
  // AUDITORÍA DE SUBIDA
  uploadedAt: ISODateString;     // Timestamp de subida
  uploadedBy: string;            // userId quien subió
  uploadedVia?: 'manual' | 'gmail' | 'api';  // Canal de subida
  
  // CONTEXTO
  linkedEntity?: {               // A qué entidad está vinculado
    type: 'account' | 'lot' | 'shipment' | 'production_order';
    id: string;
  };
  
  // METADATA
  size?: number;                 // Tamaño en bytes
  contentType?: string;          // MIME type
  tags?: string[];              // Tags para búsqueda
  
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

**Uso en otras entidades:**
- **Account.documents[]:** Documentos del cliente (contratos, fotos de visita)
- **Lot.qcDocuments[]:** Certificados de análisis y documentos QC
- **Colección documents:** Almacén central de documentos
- **Colección qc_documents:** Documentos específicos de calidad

### 1.3 USERS (Usuarios del sistema)
**Estado:** ✅ EXCELENTE - Núcleo de auditoría y responsabilidad

**Campos Reales:**
```typescript
interface User {
  id: string;                    // UID de Firebase Auth
  name?: string;
  displayName: string;           // Nombre para mostrar
  email?: string;
  phone?: string;
  avatar?: string;
  
  // ROL Y PERMISOS
  role: UserRole;                // 'comercial' | 'admin' | 'ops' | 'owner' | etc.
  active: boolean;
  departments?: Department[];
  
  // JERARQUÍA
  managerId?: string;            // Manager directo
  teamMemberIds?: string[];      // Equipo a cargo
  
  // TERRITORY (para comerciales)
  territory?: {
    regions?: string[];
    provinces?: string[];
    accounts?: string[];
  };
  
  // PERMISOS ESPECÍFICOS
  permissions?: {
    approve_quality_release?: boolean;
    create_production_orders?: boolean;
    validate_shipments?: boolean;
    access_financial_data?: boolean;
  };
  
  // METADATA
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  loginCount?: number;
}
```

**Relaciones críticas en inventario:**
- **Lots.qcApprovedBy:** Usuario que aprobó el lote
- **Lots.qcRejectedBy:** Usuario que rechazó el lote  
- **Lots.qcHoldBy:** Usuario que puso en hold
- **Lots.qcReviewOwnerId:** Responsable de la revisión
- **GoodsReceipt.receivedBy:** Usuario que recibió la mercancía
- **GoodsReceipt.approvedBy:** Usuario que aprobó la recepción
- **TraceEvent.userId:** Usuario responsable del evento
- **Document.uploadedBy:** Usuario que subió el documento
- **StockMove.createdBy:** Usuario que registró el movimiento (implícito)

### 1.4 ITEMS (119+ referencias)
**Estado:** ✅ BUENO - Estructura rica en campos pricing/logistics

**Campos Reales Completos:**
```typescript
interface Item {
  // === IDENTIFICADORES ===
  id: string;                    // ID interno Firestore
  sku: string;                   // SKU comercial único
  name: string;
  category: ItemCategory;        // 'fg' | 'raw' | 'pack' | 'label' | etc.
  
  // === UOM Y ESTADO ===
  uom: Uom;                      // Unidad base
  active: boolean;
  isActive?: boolean;            // Alias compatibilidad
  
  // === PRICING SYSTEM (Sistema completo) ===
  priceBase?: number;            // Precio base principal
  priceUnit?: number;            // Alias para compatibilidad con priceBase
  priceList?: Record<string, number>;  // Precios por segmento: {HORECA: 15, RETAIL: 12, ...}
  costUnit?: number;             // Costo unitario
  stdCost?: number;              // Alias para compatibilidad con costUnit
  
  // === LOGISTICS & PACKAGING ===
  unitsPerCase?: number;         // Unidades por caja (ej: 6 botellas)
  caseUnits?: number;            // Alias para compatibilidad con unitsPerCase  
  casesPerPallet?: number;       // Cajas por pallet
  weightPerUnit?: number;        // Peso por unidad (kg)
  volumePerUnit?: number;        // Volumen por unidad
  
  // === PRODUCT SPECIFICATIONS ===
  bottleMl?: number;             // Mililitros por botella (productos fg)
  eanCode?: string;              // Código de barras EAN-13
  packagingType?: string;        // Tipo de empaque
  
  // === METADATA ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}
```

**Patrones Detectados:**
- **Compatibilidad Dual:** `priceBase`/`priceUnit`, `costUnit`/`stdCost`, `unitsPerCase`/`caseUnits`
- **PriceList Estructura:** `{HORECA: 15.50, RETAIL: 12.00, DISTRIBUTOR: 10.50, ONLINE: 13.00, PRIVADA: 16.00}`
- **Validaciones:** `priceBase > 0`, `costUnit >= 0`, categoría `fg` requiere `priceList` completo

### 1.5 LOTS (73+ referencias) 
**Estado:** ✅ EXCELENTE - Sistema QC muy completo

**Campos Reales Completos:**
```typescript
interface Lot {
  // === IDENTIFICADORES ===
  id: string;
  lotNumber: string;             // Número de lote único
  itemId: string;                // Referencia a items
  sku?: string;                  // DEPRECATED - usar itemId
  itemName?: string;             // Cache del nombre
  
  // === CANTIDADES ===
  quantity: number;
  qtyMade?: number;              // DEPRECATED - usar quantity
  uom: Uom;
  
  // === ORIGEN Y FECHAS ===
  receivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expDate?: Timestamp;           // Fecha de caducidad
  
  // === PROVEEDOR Y ORIGEN ===
  supplierId?: string;
  externalLot?: string;          // Lote del proveedor
  deliveryNote?: string;
  
  // === TRAZABILIDAD ===
  producedByOrderId?: string;    // Si viene de producción
  createdByGoodsReceiptId?: string; // Si viene de recepción
  parentLotNumber?: string;      // Lote padre en genealogía
  genealogy?: {                  // DEPRECATED - usar parentLotNumber
    parents?: string[];
    children?: string[];
  };
  
  // === SISTEMA QC COMPLETO ===
  qcStatus: QcStatus;            // 'PENDING' | 'IN_PROGRESS' | 'HOLD' | 'PASSED' | 'FAILED' | 'CONDITIONAL' | 'WAIVED'
  status?: LotStatus;            // 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED'
  qcPlanId?: string;             // Plan de QC asociado
  
  // QC - APROBACIÓN
  qcApprovedBy?: string;         // UID del aprobador
  qcApprovedByName?: string;     // Nombre del aprobador
  qcApprovedAt?: ISODateString;  // Timestamp de aprobación
  qcApprovalNotes?: string;      // Notas de aprobación
  qcConditions?: string[];       // Condiciones si es aprobación condicional
  
  // QC - RECHAZO
  qcRejectedBy?: string;         // UID del rechazador
  qcRejectedByName?: string;     // Nombre del rechazador  
  qcRejectedAt?: ISODateString;  // Timestamp de rechazo
  qcRejectionReason?: string;    // Motivo del rechazo
  
  // QC - HOLD/REVISIÓN
  qcHoldBy?: string;             // UID quien puso en hold
  qcHoldByName?: string;         // Nombre quien puso en hold
  qcReviewStartedAt?: ISODateString; // Inicio de revisión
  qcReviewDuration?: number;     // Duración en minutos
  qcReviewOwnerId?: string;      // Responsable de revisión
  qcReviewOwnerName?: string;    // Nombre del responsable
  
  // QC - DOCUMENTACIÓN
  qcCoa?: string;                // URL del certificado de análisis
  qcCoaUrl?: string;             // Alias para qcCoa
  qcDocuments?: Array<{          // Documentos adicionales
    name: string;
    url: string;
    type?: string;
  }>;
}
```

**Flujo QC Real:**
1. `PENDING` → `IN_PROGRESS` (qcReviewStartedAt)
2. `IN_PROGRESS` → `PASSED`/`FAILED`/`CONDITIONAL`/`HOLD`
3. Campos específicos se llenan según la decisión

### 1.6 STOCKMOVES (33 referencias)
**Estado:** ✅ BUENO - Transacciones operativas claras

**Campos Reales:**
```typescript
interface StockMove {
  id: string;
  sku: string;
  itemId?: string;               // DEPRECATED - usar sku
  lotNumber: string;
  qty: number;
  uom: Uom;
  reason: string;                // 'receipt' | 'production_in' | 'production_out' | 'sale' | etc.
  
  // UBICACIONES
  fromLocationId?: string;       // Origen
  toLocationId?: string;         // Destino
  warehouseId?: string;          // DEPRECATED - usar fromLocationId
  toWarehouseId?: string;        // DEPRECATED - usar toLocationId
  
  // TIMESTAMPS
  occurredAt: Timestamp;         // Cuando ocurrió
  createdAt: Timestamp;          // Cuando se registró
  date?: string;                 // DEPRECATED - usar occurredAt
  
  // CONTEXTO
  ref?: any;                     // Referencia adicional
  unitCost?: number;            // Costo unitario
  documentRef?: string;         // Referencia a documento
  
  // LEGACY FIELDS
  items?: Array<{sku: string; qty: number}>; // DEPRECATED - usar campos principales
}
```

### 1.7 TRACEEVENTS - DOS PATRONES REALES

**Estado:** ⚠️ COMPLEJO - Dos sistemas diferentes coexisten

#### PATRÓN A: TraceEvents de Warehouse
**ID Pattern:** `TE_${timestamp}_${lotNumber}`

```typescript
interface TraceEventWarehouse {
  id: string;                    // "TE_1760705973176_LOT-20251017-RM-2025-9292-35"
  eventType: string;             // "STOCK_IN" | "QC_RELEASED" | "QC_TESTED"
  
  // REFERENCIAS
  lotId: string;                 // ID del lote
  itemId: string;                // SKU del item
  orderId?: string | null;
  shipmentId?: string | null;
  
  // CANTIDADES Y UBICACIÓN
  quantity: number;
  baseUnit: string;              // "L" | "kg" | "unit"
  fromLocation: string;          // "migue vidal" | "SUPPLIER" | "QC_HOLD"
  toLocation: string;            // "MAIN" | "APPROVED" | "REJECTED"
  
  // USUARIO Y TIMESTAMP
  userId: string;                // "SYSTEM" | UID
  userName?: string;             // "Sistema Automatizado"
  occurredAt: Timestamp;
  createdAt: Timestamp;
  
  // CONTEXTO RICO
  notes: string;
  metadata: {
    receiptId?: string;
    receiptNumber?: string;
    category?: string;
    supplierId?: string;
    qcStatus?: string;
    expiryDate?: string | null;
    productionDate?: string | null;
    // ... más campos contextuales
  };
  
  schemaVersion: number;         // Versioning del schema
}
```

#### PATRÓN B: TraceEvents de Alertas  
**ID Pattern:** `trace_${uuid}`

```typescript
interface TraceEventAlert {
  id: string;                    // "trace_add565df-32e5-4d63-8680-493e0d522a04"
  at: string;                    // "2025-10-18T14:21:31.086Z"
  
  // ALERT DATA
  kind: "ALERT";
  phase: "WAREHOUSE";
  title: string;                 // "Alerta resuelta Sin stock liberado para tequila..."
  
  data: {
    ruleId: string;              // "inventory.stock.outOfStock"  
    status: "RESOLVED";
    details: string;             // "SKU RM-2025-9292"
  };
}
```

## 2. SISTEMAS DE GENERACIÓN DE CÓDIGOS - IMPLEMENTACIÓN REAL

### 2.1 GENERADORES DE SKU

#### A) generateSKU(category) - lib/warehouse-generators.ts
```typescript
export function generateSKU(category: GoodsReceiptCategory): string {
  const year = new Date().getFullYear();
  const categoryMap = {
    raw: 'RM',
    finalGood: 'FG', 
    merchandise: 'MR',
    intermediate: 'IT',
    packaging: 'PK',
    consumable: 'CS'
  };
  
  const prefix = categoryMap[category] || 'GN';
  // Implementación genera secuencia única
  return `${prefix}-${year}-${sequence}`;
}
```

#### B) makeSku(parts) - lib/codes.ts  
```typescript
export function makeSku(p: SkuParts): string {
  return `${SEG(p.category)}-${SEG(p.product)}-${SEG(p.presentation)}`;
}
```

### 2.2 GENERADORES DE LOTE

#### A) generateInternalLot(sku, date) - lib/warehouse-generators.ts
```typescript
export function generateInternalLot(sku: string, date: Date = new Date()): string {
  // Format: SKU-YYYYMMDD-sequence
  const dateStr = format(date, 'YYYYMMDD');
  const sequence = getDailySequence(sku, date);
  return `${sku}-${dateStr}-${sequence}`;
}
```

#### B) lotPrefixFromSku(sku, fallback) - inventory.actions.ts  
```typescript
function lotPrefixFromSku(sku?: string, fallback?: string): string {
  const base = (sku || fallback || 'LOT').trim().toUpperCase();
  const yymm = format(new Date(), 'YYMM');
  return `${base}-${yymm}-`;
}
```

#### C) findNextLotNumber(sku, itemId) - inventory.actions.ts
```typescript
export async function findNextLotNumber(sku: string, itemId?: string): Promise<string> {
  const prefix = lotPrefixFromSku(sku, itemId);
  const snap = await db.collection('lots')
    .where('lotNumber', '>=', prefix)
    .where('lotNumber', '<', prefix + '\uf8ff')
    .orderBy('lotNumber', 'desc')
    .limit(1)
    .get();
    
  const nextNumber = snap.empty ? 1 : extractSequence(snap.docs[0].data().lotNumber) + 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}
```

### 2.3 OTROS GENERADORES

#### makeShipmentCode(existing, date) - lib/codes.ts
```typescript
export function makeShipmentCode(existing: string[], date = new Date()) {
  // Pattern: SH-YYYYMMDD-NNNN
  return nextSeq(existing, { prefix: 'SH', date, granularity: 'YYYYMMDD', width: 4 });
}
```

#### makeGoodsReceiptCode(existing, date) - lib/codes.ts  
```typescript
export function makeGoodsReceiptCode(existing: string[], date = new Date()) {
  // Pattern: GR-YYYYMMDD-NNNN  
  return nextSeq(existing, { prefix: 'GR', date, granularity: 'YYYYMMDD', width: 4 });
}
```

## 3. ANÁLISIS CRÍTICO: STOCKMOVES vs TRACEEVENTS

### 3.1 DIFERENCIAS REALES DETECTADAS

**STOCKMOVES - Transacciones Operativas:**
- **Propósito:** Movimientos de inventario que afectan cantidades físicas
- **Granularidad:** Transacciones de negocio (recepción, venta, transferencia)
- **Campos clave:** `fromLocationId`, `toLocationId`, `qty`, `reason`, `occurredAt`
- **Uso:** Recalcular onHand, reportes de movimientos, auditoría básica

**TRACEEVENTS - Auditoría Granular:**
- **Propósito:** Registro inmutable de eventos del sistema
- **Granularidad:** Eventos específicos con contexto completo
- **Campos clave:** `eventType`, `metadata`, `baseUnit`, `schemaVersion`
- **Uso:** Trazabilidad completa, debugging, compliance regulatorio

### 3.2 RECOMENDACIÓN FINAL

**✅ MANTENER AMBOS SISTEMAS** - Son complementarios, no redundantes:

#### Casos donde se usan juntos:
```typescript
// Ejemplo real de warehouse.actions.ts
async function createGoodsReceiptFromSchema(input) {
  // 1. Crear StockMove para la transacción
  const stockMoveData = {
    sku: line.sku,
    lotNumber: line.internalLot,
    quantity: line.quantity,
    type: "IN",
    fromLocation: "SUPPLIER",
    toLocation: "MAIN",
    occurredAt: now
  };
  
  // 2. Crear TraceEvent para auditoría completa
  const traceEventData = {
    id: `TE_${timestamp}_${line.internalLot}`,
    eventType: "STOCK_IN",
    baseUnit: line.uom,
    fromLocation: supplierName,
    toLocation: "MAIN",
    metadata: {
      receiptId, receiptNumber, category, 
      supplierId, qcStatus, expiryDate
    },
    schemaVersion: 1
  };
}
```

### 3.3 CASOS DE USO DIFERENCIADOS

**Usar StockMoves para:**
- Recalcular inventario disponible
- Reportes de movimientos por período  
- Validaciones de stock antes de venta
- Integración con sistemas ERP externos

**Usar TraceEvents para:**
- Trazabilidad completa de un lote específico
- Auditorías regulatorias (farmacéutica/alimentaria)
- Debug de problemas de calidad
- Análisis de patrones con IA/Gemini

## 4. ANTIPATRONES DETECTADOS EN PRODUCCIÓN

### 4.1 NOMENCLATURA INCONSISTENTE
```typescript
// ❌ DETECTADO - Múltiples variantes del mismo concepto
qcStatus vs qcHold vs qc_hold vs QcStatus
lotNumber vs lotId vs lote vs batch vs batchId
sku vs itemId vs productCode vs reference
fromLocationId vs warehouseId vs fromLocation
priceBase vs priceUnit
caseUnits vs unitsPerCase
stdCost vs costUnit
```

### 4.2 CAMPOS DEPRECATED ACTIVOS
```typescript
// ❌ DETECTADO - Campos deprecated aún en uso
interface StockMove {
  sku: string;                 // ✅ Actual
  itemId?: string;             // ❌ DEPRECATED pero usado
  occurredAt: Timestamp;       // ✅ Actual  
  date?: string;               // ❌ DEPRECATED pero usado
  fromLocationId?: string;     // ✅ Actual
  warehouseId?: string;        // ❌ DEPRECATED pero usado
}
```

### 4.3 DUPLICACIÓN DE LÓGICA
```typescript
// ❌ DETECTADO - Múltiples implementaciones del mismo generador
// En inventory.actions.ts:
function lotPrefixFromSku(sku?: string, fallback?: string) { ... }

// En production/actions.ts:  
function lotPrefixFromSku(sku?: string, fallback?: string) { ... }

// ✅ SOLUCIÓN: Centralizar en lib/warehouse-generators.ts
```

## 5. RELACIONES ENTRE COLECCIONES - PATRONES REALES

### 5.1 DIAGRAMA DE RELACIONES REALES

```
                    users (Firebase UID)
                      ↓ (auditoría y responsabilidad)
                 ┌────────────────────────────┐
                 ↓                            ↓
    warehouseSuppliers (SUP_${timestamp})   documents
         ↓ supplierId                         ↓ uploadedBy
    goodsReceipts (GR_${timestamp})          ↓ linkedEntity
         ↓ receivedBy, approvedBy            ↓
         ↓ itemId                       lots (lotNumber)
      items (sku) ←→ stockMoves              ↓ qcDocuments[]
         ↓ references both                   ↓ qcApprovedBy
    traceEvents (TE_${timestamp} | trace_${uuid})
         ↓ userId, userName
       alerts & audit trail
```

**Relaciones de Responsabilidad (users):**
- **GoodsReceipt.receivedBy** → users.id (quien recibió)
- **GoodsReceipt.approvedBy** → users.id (quien aprobó)  
- **Lots.qcApprovedBy** → users.id (quien aprobó QC)
- **Lots.qcRejectedBy** → users.id (quien rechazó QC)
- **Lots.qcHoldBy** → users.id (quien puso en hold)
- **TraceEvent.userId** → users.id (responsable del evento)
- **Document.uploadedBy** → users.id (quien subió)

**Relaciones Documentales:**
- **Account.documents[]** → documents collection
- **Lots.qcDocuments[]** → documents/qc_documents
- **Document.linkedEntity** → lots, shipments, accounts, etc.

### 5.2 FLUJOS OPERATIVOS REALES

#### A) FLUJO DE RECEPCIÓN REAL (warehouse.actions.ts)
```
1. createGoodsReceiptFromSchema()
   └─ Valida con GoodsReceiptSchema
   └─ Auto-genera SKU si falta (generateSKU)
   └─ Auto-genera lote interno (generateInternalLot)
   └─ Busca itemId en collection items
   └─ Crea GoodsReceipt con status="qc_hold"
   └─ Crea OnHand con qcStatus="qc_hold"  
   └─ Crea StockMove type="IN"
   └─ Crea TraceEvent eventType="STOCK_IN"

2. approveGoodsReceipt() / rejectGoodsReceipt()
   └─ Actualiza qcStatus en OnHand
   └─ Crea TraceEvent "QC_RELEASED"/"QC_TESTED"
```

#### B) FLUJO DE PRODUCCIÓN REAL (production.actions.ts)
```
1. completeProductionOrder()
   └─ Consume materias primas (stockMove reason="CONSUMPTION")
   └─ Genera productos terminados con nuevos lotes
   └─ findNextLotNumber() para lotes hijos
   └─ Actualiza genealogía (parentLotNumber)
   └─ Crea TraceEvents para cada paso
```

## 6. CAMPOS OBLIGATORIOS vs OPCIONALES (Análisis Real)

### 6.1 ITEMS - Campos por Categoría

**Todos los Items:**
- `id`, `sku`, `name`, `category`, `uom`, `active` → **OBLIGATORIOS**

**Items categoria 'fg' (Finished Goods):**
- `priceBase`, `priceList`, `unitsPerCase` → **OBLIGATORIOS**
- `bottleMl` → **REQUERIDO** para líquidos

**Items categoria 'raw':**
- `costUnit` → **RECOMENDADO**

### 6.2 LOTS - Estados QC

**Siempre Obligatorios:**
- `lotNumber`, `itemId`, `quantity`, `uom`, `qcStatus`, `createdAt`

**Obligatorios según qcStatus:**
```typescript
if (qcStatus === 'PASSED') {
  // qcApprovedBy, qcApprovedAt → OBLIGATORIOS
}
if (qcStatus === 'FAILED') {
  // qcRejectedBy, qcRejectedAt, qcRejectionReason → OBLIGATORIOS  
}
if (qcStatus === 'CONDITIONAL') {
  // qcApprovedBy, qcConditions → OBLIGATORIOS
}
```

## 7. RECOMENDACIONES PARA NORMALIZACIÓN

### 7.1 PRIORIDAD ALTA - Limpieza Inmediata

1. **Consolidar Generadores de Lote:**
   ```typescript
   // ✅ CREAR: lib/warehouse-generators.ts centralizado
   export function generateLotNumber(sku: string, type: 'internal' | 'sequential'): string
   ```

2. **Deprecar Campos Legacy:**
   ```typescript
   // ✅ MIGRAR: Todos los warehouseId → fromLocationId/toLocationId
   // ✅ MIGRAR: Todos los date → occurredAt
   // ✅ MIGRAR: Todos los itemId en StockMove → usar solo sku
   ```

3. **Estandarizar TraceEvent Patterns:**
   ```typescript
   // ✅ DECIDIR: Un solo patrón para TraceEvents
   // ✅ MIGRAR: O separar en traceEvents + alertEvents
   ```

### 7.2 PRIORIDAD MEDIA - Mejoras Arquitectónicas

1. **Validaciones Centralizadas:**
   ```typescript
   // ✅ IMPLEMENTAR: Validadores Zod para todas las entidades
   // ✅ ENFORCAR: Campos obligatorios por categoría
   ```

2. **Índices de Performance:**
   ```typescript
   // ✅ CREAR: Índices compuestos en Firestore
   // items: ['sku', 'active']
   // lots: ['itemId', 'qcStatus']  
   // stockMoves: ['sku', 'occurredAt']
   ```

## CONCLUSIÓN FINAL

El sistema SSOT de inventario está **funcionalmente sólido** pero requiere **limpieza de antipatrones**. La estructura real es mucho más rica que la documentación teórica, especialmente en:

- **Items:** Sistema pricing/logistics completo
- **Lots:** Workflow QC muy detallado  
- **TraceEvents:** Dos patrones coexistiendo

**ESTADO GENERAL:** ✅ **PRODUCCIÓN READY** tras normalización de antipatrones

**PRÓXIMOS PASOS:**
1. Migrar campos deprecated (2-3 días)
2. Centralizar generadores (1 día)
3. Estandarizar TraceEvents (2 días)
4. Implementar validaciones (1 día)

Total tiempo estimado: **1 semana** para SSOT completamente normalizado.
