# Sistema de Trazabilidad - Implementación Actual

## Resumen Ejecutivo

El sistema de trazabilidad de Santa Brisa ERP utiliza la colección `traceEvents` de Firestore para registrar todos los movimientos y cambios de estado de los lotes a lo largo de su ciclo de vida. Actualmente, **los traceEvents se CREAN pero NO se LEEN** en la UI.

## Estado Actual

### ✅ Creación de TraceEvents (IMPLEMENTADO)

Los traceEvents se crean automáticamente en múltiples puntos del sistema:

#### 1. **Recepción de Mercancía** (`goods-receipt.actions.ts`)
```typescript
// Crear TraceEvent en recepción
const teRef = db.collection('traceEvents').doc();
tx.set(teRef, {
  id: teRef.id,
  kind: 'STOCK_IN',
  occurredAt: receiptTimestamp,
  createdAt: new Date(),
  itemId: itemId,
  lotCode: lotCode,
  qty: line.qty,
  uom: normalizeUom(currentItem.uom),
  toLocationId: locationId,
  docRef: { type: 'GOODS_RECEIPT', id: receiptRef.id },
  userId: userId,
  schemaVersion: 1,
});
```

**Cuándo:** Al recibir mercancía de un proveedor
**Tipo:** `STOCK_IN`
**Información:** itemId, lotCode, cantidad, ubicación destino, referencia al albarán

#### 2. **Decisiones de QC** (`warehouse.v2.actions.ts`)
```typescript
// Crear TraceEvent para decisión QC
const teRef = db.collection('traceEvents').doc();
const traceEventData: Omit<TraceEventV2, 'id'> = {
  kind: 'QC_RELEASED', // o 'QC_FAILED'
  occurredAt: new Date(),
  createdAt: new Date(),
  itemId: lot.itemId,
  lotCode: lot.lotCode,
  qty: decision.quantity,
  uom: lot.uom,
  userId: decision.reviewedBy,
  schemaVersion: 1,
};
tx.set(teRef, { id: teRef.id, ...traceEventData });
```

**Cuándo:** Al aprobar, rechazar o liberar condicionalmente un lote
**Tipos:** `QC_RELEASED`, `QC_FAILED`
**Información:** Decisión QC, revisor, cantidad afectada

#### 3. **Transferencias de Ubicación** (`warehouse.v2.actions.ts`)
```typescript
// Crear TraceEvent para transferencia
const teRef = db.collection('traceEvents').doc();
const traceEventData: Omit<TraceEventV2, 'id'> = {
  kind: 'TRANSFER',
  occurredAt: new Date(),
  createdAt: new Date(),
  itemId: itemId,
  lotCode: lotCode,
  qty: qty,
  uom: uom,
  fromLocationId: fromLocationId,
  toLocationId: toLocationId,
  userId: userId,
  schemaVersion: 1,
};
tx.set(teRef, { id: teRef.id, ...traceEventData });
```

**Cuándo:** Al mover stock entre ubicaciones
**Tipo:** `TRANSFER`
**Información:** Ubicación origen, ubicación destino, cantidad

#### 4. **Ajustes de Inventario** (`inventory.actions.ts`)
```typescript
// Crear TraceEvent para ajuste
const teRef = db.collection('traceEvents').doc();
tx.set(teRef, {
  id: teRef.id,
  kind: qty > 0 ? 'ADJUSTMENT_POS' : 'ADJUSTMENT_NEG',
  occurredAt: new Date(),
  createdAt: new Date(),
  itemId: itemId,
  lotCode: lotCode,
  qty: Math.abs(qty),
  uom: uom,
  toLocationId: locationId,
  userId: userId,
  docRef: { type: 'ADJUSTMENT', id: adjustmentId },
  schemaVersion: 1,
});
```

**Cuándo:** Al realizar ajustes manuales de inventario
**Tipos:** `ADJUSTMENT_POS`, `ADJUSTMENT_NEG`
**Información:** Cantidad ajustada, razón del ajuste

#### 5. **Producción** (`quality.service.ts`)
```typescript
// Crear TraceEvent para producción
const teRef = db.collection('traceEvents').doc();
tx.set(teRef, {
  id: teRef.id,
  kind: 'PRODUCTION_IN', // o 'PRODUCTION_OUT'
  occurredAt: new Date(),
  createdAt: new Date(),
  itemId: itemId,
  lotCode: lotCode,
  qty: qty,
  uom: uom,
  docRef: { type: 'PRODUCTION_ORDER', id: orderId },
  userId: userId,
  schemaVersion: 1,
});
```

**Cuándo:** Al consumir ingredientes o producir productos terminados
**Tipos:** `PRODUCTION_IN`, `PRODUCTION_OUT`
**Información:** Orden de producción, consumos, outputs

### ❌ Lectura de TraceEvents (NO IMPLEMENTADO)

#### Panel de Trazabilidad (`LotTraceabilityPanel.tsx`)

**Estado actual:** Componente con UI completa pero sin backend
```typescript
// TODO: Replace with real action getTraceEventsForLot(lotCode)
// This would query stockMoves, lots, productionExecutions, and sales orders
const fakeEvents: TraceEvent[] = [];
```

**Lo que muestra:** Mensaje "No hay eventos de trazabilidad registrados"

**Lo que debería mostrar:**
- Timeline completo del lote desde recepción hasta expedición
- Upstream: proveedores y albaranes
- Consumos en producción con referencias a órdenes
- Downstream: expediciones y clientes finales

## Schema TraceEvent V2

```typescript
export const TraceEventSchema = z.object({
  id: z.string(),
  
  // CLASIFICACIÓN
  kind: z.enum([
    'STOCK_IN',           // Recepción de mercancía
    'TRANSFER',           // Transferencia entre ubicaciones
    'PRODUCTION_IN',      // Entrada a producción (consumo)
    'PRODUCTION_OUT',     // Salida de producción (output)
    'QC_RELEASED',        // Lote liberado por QC
    'QC_FAILED',          // Lote rechazado por QC
    'ADJUSTMENT_POS',     // Ajuste positivo
    'ADJUSTMENT_NEG'      // Ajuste negativo
  ]),
  
  // TIMESTAMPS
  occurredAt: z.date(),   // Cuándo ocurrió el evento
  createdAt: z.date(),    // Cuándo se registró
  
  // REFERENCIAS
  itemId: z.string().min(1),
  lotCode: LotCodeSchema.optional(),
  
  // CANTIDADES
  qty: z.number().positive().optional(),
  uom: z.string().optional(),
  
  // UBICACIONES
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  
  // CONTEXTO
  docRef: z.object({
    type: z.enum([
      'GOODS_RECEIPT',
      'SALES_ORDER',
      'PRODUCTION_ORDER',
      'INVENTORY_COUNT',
      'ADJUSTMENT',
      'SHIPMENT'
    ]),
    id: z.string()
  }).optional(),
  
  // AUDITORÍA
  userId: z.string().optional(),
  
  schemaVersion: z.literal(1)
});
```

## Cómo Leer TraceEvents (Implementación Pendiente)

### Opción 1: Query Directo por LotCode

```typescript
// Server Action propuesta
export async function getTraceEventsForLot(lotCode: string) {
  const eventsSnap = await db.collection('traceEvents')
    .where('lotCode', '==', lotCode)
    .orderBy('occurredAt', 'desc')
    .get();
  
  const events = eventsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Enriquecer con información adicional
  return enrichTraceEvents(events);
}
```

### Opción 2: Query por ItemId (Trazabilidad de SKU)

```typescript
// Para ver todos los movimientos de un SKU
export async function getTraceEventsForItem(itemId: string) {
  const eventsSnap = await db.collection('traceEvents')
    .where('itemId', '==', itemId)
    .orderBy('occurredAt', 'desc')
    .limit(100)
    .get();
  
  return eventsSnap.docs.map(doc => doc.data());
}
```

### Opción 3: Query por Documento de Referencia

```typescript
// Para ver todos los eventos de una recepción
export async function getTraceEventsForDocument(
  docType: 'GOODS_RECEIPT' | 'PRODUCTION_ORDER' | 'SALES_ORDER',
  docId: string
) {
  const eventsSnap = await db.collection('traceEvents')
    .where('docRef.type', '==', docType)
    .where('docRef.id', '==', docId)
    .orderBy('occurredAt', 'desc')
    .get();
  
  return eventsSnap.docs.map(doc => doc.data());
}
```

### Opción 4: Query por Rango de Fechas

```typescript
// Para auditorías o reportes
export async function getTraceEventsByDateRange(
  startDate: Date,
  endDate: Date,
  kind?: TraceEventKind
) {
  let query = db.collection('traceEvents')
    .where('occurredAt', '>=', startDate)
    .where('occurredAt', '<=', endDate);
  
  if (kind) {
    query = query.where('kind', '==', kind);
  }
  
  const eventsSnap = await query
    .orderBy('occurredAt', 'desc')
    .get();
  
  return eventsSnap.docs.map(doc => doc.data());
}
```

## Enriquecimiento de Datos

Los traceEvents almacenan solo IDs. Para mostrarlos en la UI, necesitan enriquecerse:

```typescript
async function enrichTraceEvents(events: TraceEventV2[]) {
  // 1. Obtener SKUs únicos
  const itemIds = [...new Set(events.map(e => e.itemId))];
  const skusSnap = await db.collection('skus')
    .where('__name__', 'in', itemIds.slice(0, 30))
    .get();
  const skuMap = new Map(
    skusSnap.docs.map(d => [d.id, d.data().name])
  );
  
  // 2. Obtener usuarios únicos
  const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))];
  const usersSnap = await db.collection('users')
    .where('__name__', 'in', userIds.slice(0, 30))
    .get();
  const userMap = new Map(
    usersSnap.docs.map(d => [d.id, d.data().displayName])
  );
  
  // 3. Obtener ubicaciones únicas
  const locationIds = [
    ...new Set([
      ...events.map(e => e.fromLocationId),
      ...events.map(e => e.toLocationId)
    ].filter(Boolean))
  ];
  const locationsSnap = await db.collection('locations')
    .where('__name__', 'in', locationIds.slice(0, 30))
    .get();
  const locationMap = new Map(
    locationsSnap.docs.map(d => [d.id, d.data().name])
  );
  
  // 4. Enriquecer eventos
  return events.map(event => ({
    ...event,
    itemName: skuMap.get(event.itemId) || event.itemId,
    userName: event.userId ? userMap.get(event.userId) : undefined,
    fromLocationName: event.fromLocationId 
      ? locationMap.get(event.fromLocationId) 
      : undefined,
    toLocationName: event.toLocationId 
      ? locationMap.get(event.toLocationId) 
      : undefined,
  }));
}
```

## Índices Firestore Requeridos

Para queries eficientes, se necesitan estos índices compuestos:

```json
{
  "indexes": [
    {
      "collectionGroup": "traceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lotCode", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "traceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "itemId", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "traceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "docRef.type", "order": "ASCENDING" },
        { "fieldPath": "docRef.id", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "traceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "occurredAt", "order": "ASCENDING" },
        { "fieldPath": "kind", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Casos de Uso

### 1. Trazabilidad Hacia Atrás (Upstream)
**Pregunta:** ¿De dónde vino este lote?
```typescript
// Query: STOCK_IN events para el lotCode
// Resultado: Proveedor, albarán, fecha de recepción
```

### 2. Trazabilidad Hacia Adelante (Downstream)
**Pregunta:** ¿Dónde se usó este lote?
```typescript
// Query: PRODUCTION_OUT, TRANSFER, SHIPMENT events
// Resultado: Órdenes de producción, transferencias, expediciones
```

### 3. Auditoría de Cambios de Estado
**Pregunta:** ¿Cuándo y quién liberó este lote?
```typescript
// Query: QC_RELEASED events para el lotCode
// Resultado: Usuario, fecha, condiciones
```

### 4. Análisis de Movimientos
**Pregunta:** ¿Cuántas veces se movió este lote?
```typescript
// Query: TRANSFER events para el lotCode
// Resultado: Historial completo de ubicaciones
```

## Próximos Pasos

### Fase 1: Implementación Básica
1. ✅ Crear server action `getTraceEventsForLot(lotCode)`
2. ✅ Enriquecer eventos con nombres legibles
3. ✅ Conectar con `LotTraceabilityPanel.tsx`
4. ✅ Añadir índices Firestore necesarios

### Fase 2: Trazabilidad Completa
1. ⬜ Implementar genealogía de lotes (parent/child)
2. ⬜ Agregar trazabilidad de producción (BOM)
3. ⬜ Conectar con expediciones y clientes
4. ⬜ Implementar búsqueda por rango de fechas

### Fase 3: Visualización Avanzada
1. ⬜ Timeline interactivo con filtros
2. ⬜ Gráfico de flujo de materiales
3. ⬜ Exportación a PDF para auditorías
4. ⬜ Alertas de trazabilidad incompleta

## Conclusión

El sistema de trazabilidad está **parcialmente implementado**:
- ✅ **Escritura:** Los traceEvents se crean correctamente en todos los puntos críticos
- ❌ **Lectura:** No hay queries implementadas para leer y mostrar los eventos
- ⚠️ **UI:** El componente existe pero muestra datos vacíos

**Recomendación:** Implementar la Fase 1 para activar la funcionalidad básica de trazabilidad, que ya tiene toda la infraestructura de datos necesaria.
