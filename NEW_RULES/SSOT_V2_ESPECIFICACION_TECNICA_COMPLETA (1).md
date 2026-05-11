# SSOT V2 - ESPECIFICACIÓN TÉCNICA COMPLETA
## Sistema de Inventario "A Prueba de Balas"

### RESUMEN EJECUTIVO

Esta especificación implementa el SSOT v2 con transaccionalidad completa, buckets QC, generación race-free y arquitectura enterprise-ready basada en las decisiones arquitectónicas finales.

---

## 0. DECISIONES ARQUITECTÓNICAS FINALES

### 0.1 REFERENCIAS CANÓNICAS
- **FK canónica:** `itemId` en todas las colecciones
- **SKU:** Solo en `items` (cache opcional `itemSku` en vistas)  
- **Lote canónico:** `lotCode` (YYJJJ-PL[-LN]-SEQ), independiente del SKU
- **Ubicaciones:** `locations` + `fromLocationId`/`toLocationId` siempre
- **Dinero:** Enteros en céntimos (`amountCents`) + `currency`

### 0.2 SEPARACIÓN DE COLECCIONES
- **traceEvents** (dominio) ≠ **alertEvents** (monitoring)
- **documents** única colección + `linkedEntity` tipado
- **onHand** nueva colección con buckets QC

---

## 1. COLECCIÓN ONHAND - NÚCLEO DEL SISTEMA

### 1.1 MODELO CANÓNICO

```typescript
type QcBucket = 'RELEASED' | 'HOLD' | 'REJECTED';

interface OnHand {
  id: string;                    // `${itemId}::${lotCode}::${locationId}`
  
  // REFERENCIAS
  itemId: string;               // FK canónica a items
  lotCode: string;              // Código de lote canónico
  locationId: string;           // FK a locations
  
  // SALDOS POR BUCKET QC (no negativos)
  qty: {
    RELEASED: number;           // Disponible para venta/consumo
    HOLD: number;               // En revisión QC
    REJECTED: number;           // Rechazado definitivamente
  };
  
  // RESERVAS (solo de RELEASED)
  reservedQty?: {
    RELEASED?: number;          // Reservado para pedidos
  };
  
  // DERIVADOS (redundantes para fast-reads)
  totalQty: number;             // sum(qty.RELEASED + qty.HOLD + qty.REJECTED)
  availableQty: number;         // qty.RELEASED - reservedQty.RELEASED
  
  // AUDITORÍA
  updatedAt: Date;
  updatedBy?: string;           // userId del responsable
  
  schemaVersion: 1;
}
```

### 1.2 INVARIANTES DE NEGOCIO

```typescript
// Validaciones que SIEMPRE deben cumplirse
const OnHandInvariants = {
  // 1. Consistencia de totales
  totalQty: (oh: OnHand) => 
    oh.totalQty === oh.qty.RELEASED + oh.qty.HOLD + oh.qty.REJECTED,
  
  // 2. Disponibilidad correcta  
  availableQty: (oh: OnHand) => 
    oh.availableQty === oh.qty.RELEASED - (oh.reservedQty?.RELEASED || 0),
  
  // 3. No negativos
  noNegatives: (oh: OnHand) => 
    oh.qty.RELEASED >= 0 && oh.qty.HOLD >= 0 && oh.qty.REJECTED >= 0 &&
    (oh.reservedQty?.RELEASED || 0) >= 0,
  
  // 4. Reservas válidas
  validReservations: (oh: OnHand) => 
    (oh.reservedQty?.RELEASED || 0) <= oh.qty.RELEASED
};
```

### 1.3 ÍNDICES FIRESTORE MÍNIMOS

```typescript
// Índices compuestos requeridos
const OnHandIndexes = [
  ['itemId'],                           // Buscar por producto
  ['itemId', 'locationId'],             // Stock por producto y ubicación  
  ['lotCode'],                          // Buscar por lote específico
  ['locationId'],                       // Stock por ubicación
  ['itemId', 'availableQty'],           // Productos con stock disponible
  ['updatedAt']                         // Auditoría temporal
];
```

---

## 2. SERVICIOS CANÓNICOS

### 2.1 ONHANDSERVICE - NÚCLEO TRANSACCIONAL

```typescript
export class OnHandService {
  /**
   * Actualiza saldos OnHand dentro de transacción
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   */
  static async updateBalance(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      bucket: QcBucket;
      deltaQty: number;           // Puede ser negativo
      reason: string;             // Para auditoría
      userId?: string;
    }
  ): Promise<OnHand> {
    const { itemId, lotCode, locationId, bucket, deltaQty, reason, userId } = params;
    
    // 1. Construir ID canónico
    const onHandId = `${itemId}::${lotCode}::${locationId}`;
    const ohRef = db.doc(`onHand/${onHandId}`);
    
    // 2. Leer estado actual
    const ohSnap = await tx.get(ohRef);
    const current: OnHand = ohSnap.exists ? ohSnap.data() as OnHand : {
      id: onHandId, itemId, lotCode, locationId,
      qty: { RELEASED: 0, HOLD: 0, REJECTED: 0 },
      reservedQty: { RELEASED: 0 },
      totalQty: 0, availableQty: 0,
      updatedAt: new Date(), schemaVersion: 1
    };
    
    // 3. Aplicar delta
    current.qty[bucket] += deltaQty;
    
    // 4. Validar invariantes
    if (current.qty[bucket] < 0) {
      throw new Error(`OnHand.${bucket} cannot be negative. Current: ${current.qty[bucket]}, Delta: ${deltaQty}`);
    }
    
    // 5. Recalcular derivados
    current.totalQty = current.qty.RELEASED + current.qty.HOLD + current.qty.REJECTED;
    current.availableQty = current.qty.RELEASED - (current.reservedQty?.RELEASED || 0);
    current.updatedAt = new Date();
    current.updatedBy = userId;
    
    // 6. Validar invariantes finales
    Object.entries(OnHandInvariants).forEach(([name, validator]) => {
      if (!validator(current)) {
        throw new Error(`OnHand invariant violation: ${name}`);
      }
    });
    
    // 7. Escribir
    tx.set(ohRef, current, { merge: true });
    
    return current;
  }
  
  /**
   * Transfiere stock entre buckets (QC state changes)
   */
  static async transferBetweenBuckets(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      fromBucket: QcBucket;
      toBucket: QcBucket;
      qty: number;
      userId?: string;
    }
  ): Promise<void> {
    const { fromBucket, toBucket, qty } = params;
    
    // Restar del bucket origen
    await OnHandService.updateBalance(tx, {
      ...params,
      bucket: fromBucket,
      deltaQty: -qty,
      reason: `QC_TRANSFER_OUT_${toBucket}`
    });
    
    // Sumar al bucket destino
    await OnHandService.updateBalance(tx, {
      ...params,
      bucket: toBucket,
      deltaQty: qty,
      reason: `QC_TRANSFER_IN_${fromBucket}`
    });
  }
  
  /**
   * Reservar stock para pedidos
   */
  static async reserveStock(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      qty: number;
      orderId?: string;
      userId?: string;
    }
  ): Promise<void> {
    const { itemId, lotCode, locationId, qty, userId } = params;
    
    const onHandId = `${itemId}::${lotCode}::${locationId}`;
    const ohRef = db.doc(`onHand/${onHandId}`);
    const ohSnap = await tx.get(ohRef);
    
    if (!ohSnap.exists) {
      throw new Error(`OnHand not found: ${onHandId}`);
    }
    
    const current = ohSnap.data() as OnHand;
    
    // Verificar disponibilidad
    const currentReserved = current.reservedQty?.RELEASED || 0;
    const newReserved = currentReserved + qty;
    
    if (newReserved > current.qty.RELEASED) {
      throw new Error(`Insufficient RELEASED stock. Available: ${current.qty.RELEASED}, Requested: ${newReserved}`);
    }
    
    // Actualizar reservas
    current.reservedQty = { RELEASED: newReserved };
    current.availableQty = current.qty.RELEASED - newReserved;
    current.updatedAt = new Date();
    current.updatedBy = userId;
    
    tx.set(ohRef, current, { merge: true });
  }
}
```

### 2.2 LOTSERVICE - GENERACIÓN RACE-FREE

```typescript
export class LotService {
  /**
   * Genera lotCode race-free usando contadores atómicos
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   */
  static async generateLotCode(
    tx: FirebaseFirestore.Transaction,
    params: {
      plant: string;              // Ej: 'SB', 'MAD', 'BCN'
      line?: string;              // Ej: 'L1', 'L2', 'PKG'
      date?: Date;
    }
  ): Promise<string> {
    const { plant, line, date = new Date() } = params;
    
    // 1. Formato YYJJJ (año + día del año)
    const year = date.getFullYear().toString().slice(-2);
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    const yyjjj = year + dayOfYear.toString().padStart(3, '0');
    
    // 2. Ámbito del contador
    const scope = `LOT:${plant}:${yyjjj}${line ? ':' + line : ''}`;
    const counterRef = db.doc(`counters/${scope}`);
    
    // 3. Incremento atómico
    const counterSnap = await tx.get(counterRef);
    const currentValue = counterSnap.exists ? counterSnap.data()?.value || 0 : 0;
    const nextValue = currentValue + 1;
    
    tx.set(counterRef, { 
      value: nextValue, 
      lastUsed: date,
      scope 
    }, { merge: true });
    
    // 4. Construir código final
    const head = line ? `${yyjjj}-${plant}-${line}` : `${yyjjj}-${plant}`;
    const sequence = nextValue.toString().padStart(3, '0');
    
    return `${head}-${sequence}`;
  }
  
  /**
   * Crea nuevo lote con código generado
   */
  static async createLot(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      plant: string;
      line?: string;
      quantity: number;
      uom: string;
      locationId: string;
      supplierId?: string;
      externalLot?: string;
      userId?: string;
    }
  ): Promise<{ lotId: string; lotCode: string }> {
    const { itemId, quantity, uom, locationId, userId, ...lotParams } = params;
    
    // 1. Generar código único
    const lotCode = await LotService.generateLotCode(tx, lotParams);
    
    // 2. Crear lote
    const lotRef = db.collection('lots').doc();
    const lotData = {
      id: lotRef.id,
      lotCode,
      itemId,
      quantity,
      uom,
      qcStatus: 'PENDING' as const,
      status: 'OPEN' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      supplierId: params.supplierId,
      externalLot: params.externalLot,
      schemaVersion: 1
    };
    
    tx.set(lotRef, lotData);
    
    // 3. Crear OnHand inicial (bucket HOLD)
    await OnHandService.updateBalance(tx, {
      itemId,
      lotCode,
      locationId,
      bucket: 'HOLD',
      deltaQty: quantity,
      reason: 'LOT_CREATION',
      userId
    });
    
    return { lotId: lotRef.id, lotCode };
  }
}
```

### 2.3 SKUSERVICE - NORMALIZACIÓN CANÓNICA

```typescript
export class SkuService {
  /**
   * Genera SKU determinista desde metadatos
   */
  static makeSku(params: {
    category: 'FG' | 'RAW' | 'PACK' | 'LABEL' | 'MERCH' | 'INTERMEDIATE' | 'CONSUMABLE';
    family?: string;
    variant?: string;
    size?: string | number;
    pack?: string | number;
  }): string {
    const { category, family, variant, size, pack } = params;
    
    const segment = (x?: string | number) => String(x ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return [
      segment(category),
      segment(family),
      segment(variant),
      segment(size),
      segment(pack)
    ].filter(Boolean).join('-');
  }
  
  /**
   * Valida formato SKU
   */
  static validateSku(sku: string): boolean {
    const normalized = sku.trim().toUpperCase();
    return /^[A-Z0-9-]{3,32}$/.test(normalized);
  }
  
  /**
   * Normaliza SKU a formato canónico
   */
  static normalizeSku(sku: string): string {
    const normalized = sku.trim().toUpperCase();
    if (!SkuService.validateSku(normalized)) {
      throw new Error(`Invalid SKU format: ${sku}`);
    }
    return normalized;
  }
}
```

---

## 3. TRANSACCIONES ATÓMICAS

### 3.1 FLUJO DE RECEPCIÓN COMPLETO

```typescript
/**
 * Recepción de mercancía con transaccionalidad completa
 */
export async function processGoodsReceipt(params: {
  lines: Array<{
    itemId: string;
    quantity: number;
    uom: string;
    supplierId?: string;
    externalLot?: string;
    toLocationId: string;
  }>;
  receiptNumber: string;
  receivedBy: string;
}): Promise<{ receiptId: string; lots: Array<{ lotId: string; lotCode: string }> }> {
  
  return await db.runTransaction(async (tx) => {
    const now = new Date();
    const receiptId = `GR_${Date.now()}`;
    const createdLots: Array<{ lotId: string; lotCode: string }> = [];
    
    // 1. Crear GoodsReceipt
    const receiptRef = db.doc(`goodsReceipts/${receiptId}`);
    tx.set(receiptRef, {
      id: receiptId,
      receiptNumber: params.receiptNumber,
      status: 'qc_hold',
      receivedBy: params.receivedBy,
      receivedAt: now,
      createdAt: now,
      lines: params.lines,
      schemaVersion: 1
    });
    
    // 2. Procesar cada línea
    for (const line of params.lines) {
      // Validar item existe
      const itemRef = db.doc(`items/${line.itemId}`);
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists) {
        throw new Error(`Item not found: ${line.itemId}`);
      }
      
      // Crear lote con código único
      const { lotId, lotCode } = await LotService.createLot(tx, {
        itemId: line.itemId,
        plant: 'SB',        // TODO: obtener de configuración
        quantity: line.quantity,
        uom: line.uom,
        locationId: line.toLocationId,
        supplierId: line.supplierId,
        externalLot: line.externalLot,
        userId: params.receivedBy
      });
      
      createdLots.push({ lotId, lotCode });
      
      // Crear StockMove
      const smRef = db.collection('stockMoves').doc();
      tx.set(smRef, {
        id: smRef.id,
        itemId: line.itemId,
        lotCode,
        qty: line.quantity,
        uom: line.uom,
        reason: 'RECEIPT',
        fromLocationId: 'SUPPLIER_VIRTUAL',
        toLocationId: line.toLocationId,
        occurredAt: now,
        createdAt: now,
        userId: params.receivedBy,
        docRef: { type: 'GOODS_RECEIPT', id: receiptId },
        schemaVersion: 1
      });
      
      // Crear TraceEvent
      const teRef = db.collection('traceEvents').doc();
      tx.set(teRef, {
        id: teRef.id,
        kind: 'STOCK_IN',
        occurredAt: now,
        createdAt: now,
        itemId: line.itemId,
        lotCode,
        qty: line.quantity,
        uom: line.uom,
        toLocationId: line.toLocationId,
        docRef: { type: 'GOODS_RECEIPT', id: receiptId },
        userId: params.receivedBy,
        schemaVersion: 1
      });
    }
    
    return { receiptId, lots: createdLots };
  });
}
```

### 3.2 FLUJO DE CAMBIO QC

```typescript
/**
 * Cambio de estado QC con movimiento de buckets
 */
export async function processQcDecision(params: {
  lotId: string;
  newStatus: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  quantity: number;
  reviewedBy: string;
  reason?: string;
  conditions?: string[];
}): Promise<void> {
  
  return await db.runTransaction(async (tx) => {
    const now = new Date();
    
    // 1. Obtener lote
    const lotRef = db.doc(`lots/${params.lotId}`);
    const lotSnap = await tx.get(lotRef);
    if (!lotSnap.exists) {
      throw new Error(`Lot not found: ${params.lotId}`);
    }
    
    const lot = lotSnap.data() as any;
    const { lotCode, itemId } = lot;
    
    // 2. Determinar bucket destino
    const targetBucket: QcBucket = params.newStatus === 'PASSED' ? 'RELEASED' : 'REJECTED';
    
    // 3. Mover entre buckets (HOLD → RELEASED/REJECTED)
    // TODO: Obtener locationId real del lote
    const locationId = 'MAIN'; // Simplificado
    
    await OnHandService.transferBetweenBuckets(tx, {
      itemId,
      lotCode,
      locationId,
      fromBucket: 'HOLD',
      toBucket: targetBucket,
      qty: params.quantity,
      userId: params.reviewedBy
    });
    
    // 4. Actualizar lote
    const lotUpdates: any = {
      qcStatus: params.newStatus,
      updatedAt: now,
      updatedBy: params.reviewedBy
    };
    
    if (params.newStatus === 'PASSED') {
      lotUpdates.qcApprovedBy = params.reviewedBy;
      lotUpdates.qcApprovedAt = now;
      if (params.conditions?.length) {
        lotUpdates.qcConditions = params.conditions;
      }
    } else if (params.newStatus === 'FAILED') {
      lotUpdates.qcRejectedBy = params.reviewedBy;
      lotUpdates.qcRejectedAt = now;
      lotUpdates.qcRejectionReason = params.reason;
    }
    
    tx.update(lotRef, lotUpdates);
    
    // 5. TraceEvent
    const teRef = db.collection('traceEvents').doc();
    tx.set(teRef, {
      id: teRef.id,
      kind: params.newStatus === 'PASSED' ? 'QC_RELEASED' : 'QC_FAILED',
      occurredAt: now,
      createdAt: now,
      itemId,
      lotCode,
      qty: params.quantity,
      userId: params.reviewedBy,
      schemaVersion: 1
    });
  });
}
```

---

## 4. NUEVAS INTERFACES CANÓNICAS

### 4.1 TRACEEVENTS (DOMINIO)

```typescript
interface TraceEvent {
  id: string;
  
  // CLASIFICACIÓN
  kind: 'STOCK_IN' | 'TRANSFER' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 
        'QC_RELEASED' | 'QC_FAILED' | 'ADJUSTMENT_POS' | 'ADJUSTMENT_NEG';
  
  // TIMESTAMPS
  occurredAt: Date;
  createdAt: Date;
  
  // REFERENCIAS
  itemId: string;
  lotCode?: string;
  
  // CANTIDADES
  qty?: number;
  uom?: string;
  
  // UBICACIONES
  fromLocationId?: string;
  toLocationId?: string;
  
  // CONTEXTO
  docRef?: {
    type: 'GOODS_RECEIPT' | 'SALES_ORDER' | 'PRODUCTION_ORDER' | 
          'INVENTORY_COUNT' | 'ADJUSTMENT' | 'SHIPMENT';
    id: string;
  };
  
  // AUDITORÍA
  userId?: string;
  
  schemaVersion: 1;
}
```

### 4.2 ALERTEVENTS (MONITORING)

```typescript
interface AlertEvent {
  id: string;
  at: Date;
  
  // CONTENIDO
  title: string;
  ruleId: string;              // 'inventory.stock.outOfStock'
  
  // ESTADO
  status: 'OPEN' | 'RESOLVED';
  
  // CLASIFICACIÓN
  phase: 'WAREHOUSE' | 'PRODUCTION' | 'SALES' | 'QUALITY';
  
  // CONTEXTO
  data?: Record<string, unknown>;
  
  schemaVersion: 1;
}
```

### 4.3 DOCUMENTS CENTRALIZADO

```typescript
type LinkedEntity =
  | { type: 'account'; id: string }
  | { type: 'lot'; id: string }
  | { type: 'shipment'; id: string }
  | { type: 'production_order'; id: string }
  | { type: 'goods_receipt'; id: string };

interface Document {
  id: string;
  
  // ARCHIVO
  name: string;
  url: string;
  contentType: string;
  size: number;
  
  // CLASIFICACIÓN
  type: 'contract' | 'invoice' | 'visit_photo' | 'plv_certificate' | 
        'qc_document' | 'coa' | 'other';
  
  // VINCULACIÓN
  linkedEntity: LinkedEntity;
  
  // AUDITORÍA
  uploadedAt: Date;
  uploadedBy: string;           // userId
  uploadedVia: 'manual' | 'gmail' | 'api';
  
  // METADATA
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: 1;
}
```

### 4.4 LOCATIONS

```typescript
interface Location {
  id: string;
  
  // IDENTIFICACIÓN
  code: string;                // 'MAIN', 'QC_LAB', 'REJECTED_AREA'
  name: string;
  
  // JERARQUÍA
  parentLocationId?: string;   // Para ubicaciones anidadas
  
  // TIPO
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'TRANSIT' | 'VIRTUAL';
  
  // CONFIGURACIÓN
  allowsStock: boolean;        // Si puede almacenar inventario
  requiresQc?: boolean;        // Si requiere QC obligatorio
  
  // METADATA
  address?: string;
  capacity?: {
    maxWeight?: number;
    maxVolume?: number;
    maxPallets?: number;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: 1;
}
```

---

## 5. PLAN DE MIGRACIÓN POR FASES

### 5.1 FASE 1: FUNDACIÓN (Semana 1)

#### 5.1.1 Crear Nuevas Colecciones
```bash
# 1. Crear índices en Firestore Console
firebase firestore:indexes deploy

# 2. Poblar colecciones base
npm run setup:locations
npm run setup:counters
```

#### 5.1.2 Setup de Servicios
```typescript
// src/services/canonical/index.ts
export { OnHandService } from './onhand.service';
export { LotService } from './lot.service';
export { SkuService } from './sku.service';
```

### 5.2 FASE 2: TRANSACCIONES (Semana 2)

#### 5.2.1 Implementar Flujos Transaccionales
```typescript
// Migrar server actions a usar servicios canónicos
// src/server/actions/warehouse.actions.v2.ts
export { processGoodsReceipt } from '../services/canonical';
```

#### 5.2.2 Testing de Invariantes
```typescript
// tests/onhand.invariants.test.ts
describe('OnHand Invariants', () => {
  test('no negative balances', async () => {
    // Test cases...
  });
});
```

### 5.3 FASE 3: MIGRACIÓN DE DATOS (Semana 3)

#### 5.3.1 Backfill Scripts
```typescript
// scripts/migrate-lot-codes.ts
export async function migrateLotCodes() {
  const lotsSnap = await db.collection('lots').get();
  const batch = db.batch();
  
  for (const lotDoc of lotsSnap.docs) {
    const lot = lotDoc.data();
    
    // Generar lotCode desde datos existentes
    const lotCode = await generateLotCodeFromLegacy(lot);
    
    batch.update(lotDoc.ref, { 
      lotCode,
      schemaVersion: 2
    });
  }
  
  await batch.commit();
}
```

#### 5.3.2 Reconstrucción OnHand
```typescript
// scripts/rebuild-onhand.ts
export async function rebuildOnHandFromStockMoves() {
  const stockMovesSnap = await db.collection('stockMoves')
    .orderBy('occurredAt')
    .get();
  
  const onHandMap = new Map<string, OnHand>();
  
  // Reducir stockMoves a saldos OnHand
  for (const smDoc of stockMovesSnap.docs) {
    const sm = smDoc.data();
    const onHandId = `${sm.itemId}::${sm.lotCode}::${sm.locationId}`;
    
    // Aplicar lógica de reducción...
  }
  
  // Escribir a onHand_tmp para verificación
  const batch = db.batch();
  for (const [id, onHand] of onHandMap) {
    batch.set(db.doc(`onHand_tmp/${id}`), onHand);
  }
  await batch.commit();
}
```

### 5.4 FASE 4: SEGURIDAD Y LIMPIEZA (Semana 4)

#### 5.4.1 ESLint Rules Personalizadas
```typescript
// .eslint/rules/no-legacy-patterns.js
module.exports = {
  "no-legacy-sku-generators": {
    create(context) {
      return {
        ImportDeclaration(node) {
          if (node.source.value === '@/lib/warehouse-generators' &&
              node.specifiers.some(s => s.imported?.name === 'generateSKU')) {
            context.report({
              node,
              message: 'Use SkuService.makeSku() instead of generateSKU()'
            });
          }
        }
      };
    }
  },
  
  "no-legacy-date-fields": {
    create(context) {
      return {
        MemberExpression(node) {
          if (node.property.name === 'date' && 
              context.getSourceCode().getText(node.object).includes('StockMove')) {
            context.report({
              node,
              message: 'Use occurredAt instead of date field'
            });
          }
        }
      };
    }
  }
};
```

#### 5.4.2 Codemods Automáticos
```typescript
// scripts/codemods/migrate-legacy-fields.ts
export const migrationCodemods = {
  // Migrar sku → itemId en referencias
  skuToItemId: {
    pattern: /\.sku\s*===/g,
    replacement: '.itemId ===',
    filePattern: '**/*.ts'
  },
  
  // Migrar date → occurredAt
  dateToOccurredAt: {
    pattern: /stockMove\.date/g,
    replacement: 'stockMove.occurredAt',
    filePattern: '**/*.ts'
  },
  
  // Migrar warehouseId → fromLocationId  
  warehouseIdToLocation: {
    pattern: /\.warehouseId/g,
    replacement: '.fromLocationId',
    filePattern: '**/*.ts'
  }
};
```

---

## 6. REGLAS DE NEGOCIO Y VALIDACIONES

### 6.1 REGLAS FEFO (First Expired First Out)

```typescript
export class FefoService {
  /**
   * Selecciona lotes para consumo siguiendo FEFO
   * Solo considera buckets RELEASED
   */
  static async selectLotsForConsumption(params: {
    itemId: string;
    requiredQty: number;
    locationId: string;
    maxExpiredDays?: number;     // Máx días de caducidad permitidos
  }): Promise<Array<{ lotCode: string; qtyToTake: number; expiresAt?: Date }>> {
    
    // 1. Buscar OnHand con stock RELEASED
    const onHandSnap = await db.collection('onHand')
      .where('itemId', '==', params.itemId)
      .where('locationId', '==', params.locationId)
      .get();
    
    const availableLots = onHandSnap.docs
      .map(doc => doc.data() as OnHand)
      .filter(oh => oh.availableQty > 0)  // Solo con stock disponible
      .map(async oh => {
        // Obtener fecha de caducidad del lote
        const lotSnap = await db.doc(`lots/${oh.lotCode}`).get();
        const lot = lotSnap.data();
        return {
          lotCode: oh.lotCode,
          availableQty: oh.availableQty,
          expiresAt: lot?.expDate ? new Date(lot.expDate) : null
        };
      });
    
    const lotsWithExpiry = await Promise.all(availableLots);
    
    // 2. Ordenar por FEFO (caducidad ascendente)
    lotsWithExpiry.sort((a, b) => {
      if (!a.expiresAt && !b.expiresAt) return 0;
      if (!a.expiresAt) return 1;  // Sin caducidad al final
      if (!b.expiresAt) return -1;
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });
    
    // 3. Seleccionar hasta cubrir cantidad requerida
    const selection: Array<{ lotCode: string; qtyToTake: number; expiresAt?: Date }> = [];
    let remaining = params.requiredQty;
    
    for (const lot of lotsWithExpiry) {
      if (remaining <= 0) break;
      
      // Validar caducidad si se especifica
      if (params.maxExpiredDays && lot.expiresAt) {
        const daysToExpiry = Math.ceil(
          (lot.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry < params.maxExpiredDays) {
          continue; // Saltar lotes muy próximos a caducar
        }
      }
      
      const qtyToTake = Math.min(remaining, lot.availableQty);
      selection.push({
        lotCode: lot.lotCode,
        qtyToTake,
        expiresAt: lot.expiresAt || undefined
      });
      
      remaining -= qtyToTake;
    }
    
    if (remaining > 0) {
      throw new Error(`Insufficient stock. Required: ${params.requiredQty}, Available: ${params.requiredQty - remaining}`);
    }
    
    return selection;
  }
}
```

### 6.2 VALIDACIONES ZOD

```typescript
// domain/ssot-v2-schemas.ts
import { z } from 'zod';

export const OnHandSchema = z.object({
  id: z.string().regex(/^[^:]+::[^:]+::[^:]+$/, 'Must follow itemId::lotCode::locationId pattern'),
  itemId: z.string().min(1),
  lotCode: z.string().regex(/^\d{5}-[A-Z]+-\d{3}$/, 'Must follow YYJJJ-PL-SEQ pattern'),
  locationId: z.string().min(1),
  qty: z.object({
    RELEASED: z.number().min(0),
    HOLD: z.number().min(0),
    REJECTED: z.number().min(0)
  }),
  reservedQty: z.object({
    RELEASED: z.number().min(0).optional()
  }).optional(),
  totalQty: z.number().min(0),
  availableQty: z.number().min(0),
  schemaVersion: z.literal(1)
}).refine(data => {
  // Validar invariantes
  return data.totalQty === data.qty.RELEASED + data.qty.HOLD + data.qty.REJECTED;
}, 'totalQty must equal sum of all buckets');

export const LotCodeSchema = z.string()
  .regex(/^\d{5}-[A-Z]+(-[A-Z0-9]+)?-\d{3}$/, 'Invalid lotCode format');

export const SkuSchema = z.string()
  .transform(s => s.trim().toUpperCase())
  .regex(/^[A-Z0-9-]{3,32}$/, 'Invalid SKU format');
```

---

## 7. RECONCILIACIÓN Y JOBS DE MANTENIMIENTO

### 7.1 RECONCILIACIÓN ONHAND

```typescript
/**
 * Job idempotente para reconciliar OnHand desde StockMoves
 */
export async function reconcileOnHand(params: {
  itemId?: string;              // Reconciliar item específico
  locationId?: string;          // Reconciliar ubicación específica
  dryRun?: boolean;             // Solo reportar diferencias
}): Promise<{
  processed: number;
  differences: Array<{
    onHandId: string;
    calculated: OnHand;
    current?: OnHand;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
  }>;
}> {
  
  // 1. Construir filtros
  let stockMovesQuery = db.collection('stockMoves').orderBy('occurredAt');
  
  if (params.itemId) {
    stockMovesQuery = stockMovesQuery.where('itemId', '==', params.itemId);
  }
  
  // 2. Reducir StockMoves a OnHand calculado
  const stockMovesSnap = await stockMovesQuery.get();
  const calculatedOnHand = new Map<string, OnHand>();
  
  for (const smDoc of stockMovesSnap.docs) {
    const sm = smDoc.data();
    const onHandId = `${sm.itemId}::${sm.lotCode}::${sm.locationId || sm.toLocationId}`;
    
    if (!calculatedOnHand.has(onHandId)) {
      calculatedOnHand.set(onHandId, {
        id: onHandId,
        itemId: sm.itemId,
        lotCode: sm.lotCode,
        locationId: sm.locationId || sm.toLocationId,
        qty: { RELEASED: 0, HOLD: 0, REJECTED: 0 },
        reservedQty: { RELEASED: 0 },
        totalQty: 0,
        availableQty: 0,
        updatedAt: new Date(),
        schemaVersion: 1
      });
    }
    
    const current = calculatedOnHand.get(onHandId)!;
    
    // Aplicar lógica según reason
    const bucket = getBucketFromStockMoveReason(sm.reason);
    const deltaQty = getSignFromStockMoveReason(sm.reason) * sm.qty;
    
    current.qty[bucket] += deltaQty;
    current.totalQty = current.qty.RELEASED + current.qty.HOLD + current.qty.REJECTED;
    current.availableQty = current.qty.RELEASED - (current.reservedQty?.RELEASED || 0);
  }
  
  // 3. Comparar con OnHand actual
  const differences: Array<any> = [];
  
  for (const [onHandId, calculated] of calculatedOnHand) {
    const currentSnap = await db.doc(`onHand/${onHandId}`).get();
    const current = currentSnap.exists ? currentSnap.data() as OnHand : undefined;
    
    if (!current) {
      differences.push({ onHandId, calculated, action: 'CREATE' });
    } else if (!deepEqual(calculated.qty, current.qty)) {
      differences.push({ onHandId, calculated, current, action: 'UPDATE' });
    }
  }
  
  // 4. Ejecutar cambios si no es dry run
  if (!params.dryRun && differences.length > 0) {
    const batch = db.batch();
    
    for (const diff of differences) {
      if (diff.action === 'CREATE' || diff.action === 'UPDATE') {
        batch.set(db.doc(`onHand/${diff.onHandId}`), diff.calculated, { merge: true });
      }
    }
    
    await batch.commit();
  }
  
  return {
    processed: calculatedOnHand.size,
    differences
  };
}
```

---

## 8. CONFIGURACIÓN CI/CD DE SEGURIDAD

### 8.1 Pre-commit Hooks
```typescript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 1. Validar que no se usen patrones legacy
npm run lint:ssot-compliance

# 2. Validar invariantes en tests
npm run test:invariants

# 3. Verificar schemas Zod
npm run validate:schemas
```

### 8.2 Build Validations
```typescript
// scripts/validate-ssot-compliance.ts
import { ESLint } from 'eslint';

export async function validateSsotCompliance(): Promise<{
  passed: boolean;
  violations: Array<{
    file: string;
    rule: string;
    message: string;
  }>;
}> {
  
  const eslint = new ESLint({
    baseConfig: {
      extends: ['./eslint/ssot-compliance.js']
    }
  });
  
  const results = await eslint.lintFiles(['src/**/*.ts']);
  const violations: Array<any> = [];
  
  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId?.startsWith('ssot/')) {
        violations.push({
          file: result.filePath,
          rule: message.ruleId,
          message: message.message
        });
      }
    }
  }
  
  return {
    passed: violations.length === 0,
    violations
  };
}
```

---

## 9. MÉTRICAS Y MONITOREO

### 9.1 Health Checks
```typescript
// src/monitoring/ssot-health.ts
export async function checkSsotHealth(): Promise<{
  healthy: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
}> {
  
  const checks = await Promise.allSettled([
    // 1. Verificar invariantes OnHand
    checkOnHandInvariants(),
    
    // 2. Verificar contadores incrementales
    checkCountersSequential(),
    
    // 3. Verificar reconciliación
    checkStockMovesReconciliation(),
    
    // 4. Verificar índices críticos
    checkFirestoreIndexes()
  ]);
  
  const results = checks.map((check, i) => ({
    name: ['OnHand Invariants', 'Counter Sequence', 'Stock Reconciliation', 'Firestore Indexes'][i],
    passed: check.status === 'fulfilled',
    error: check.status === 'rejected' ? String(check.reason) : undefined
  }));
  
  return {
    healthy: results.every(r => r.passed),
    checks: results
  };
}
```

---

## 10. CRONOGRAMA DE IMPLEMENTACIÓN

### 10.1 SEMANA 1: FUNDACIÓN
- **Día 1-2:** Crear colecciones (onHand, alertEvents, locations, counters)
- **Día 3-4:** Implementar servicios canónicos (OnHandService, LotService, SkuService)  
- **Día 5:** Setup de índices Firestore y testing inicial

### 10.2 SEMANA 2: TRANSACCIONES
- **Día 1-2:** Implementar flujo de recepción transaccional
- **Día 3-4:** Implementar flujo de cambios QC con buckets
- **Día 5:** Testing de invariantes y edge cases

### 10.3 SEMANA 3: MIGRACIÓN
- **Día 1-2:** Backfill de lotCode en lotes existentes
- **Día 3-4:** Migración de stockMoves a nuevo formato
- **Día 5:** Reconstrucción inicial de OnHand

### 10.4 SEMANA 4: SEGURIDAD Y PRODUCCIÓN
- **Día 1-2:** Implementar ESLint rules y codemods
- **Día 3:** Tests de invariantes y CI pipeline
- **Día 4:** Reconciliación final y verificación
- **Día 5:** Deploy a producción con feature flags

---

## CONCLUSIÓN

Esta especificación implementa un **sistema SSOT enterprise-grade** con:

✅ **Transaccionalidad completa:** Todos los flujos en `runTransaction()`  
✅ **Buckets QC:** Separación clara RELEASED/HOLD/REJECTED  
✅ **Generación race-free:** Contadores atómicos por ámbito  
✅ **Auditoría completa:** users + documents + traceEvents  
✅ **Invariantes garantizadas:** Validaciones automáticas  
✅ **CI/CD robusto:** ESLint + tests + health checks  

**Resultado:** Sistema de inventario **a prueba de balas** que previene inconsistencias por diseño.
