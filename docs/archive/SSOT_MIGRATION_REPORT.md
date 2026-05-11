# INFORME DE MIGRACIÓN SSOT v6-old → ssot.ts

**Fecha:** 12/10/2025
**Ejecutado por:** Cline AI Assistant
**Estado:** ✅ COMPLETADO PARCIALMENTE (con errores pendientes de corrección)

---

## 📋 RESUMEN EJECUTIVO

Se ha realizado una migración selectiva de entidades desde `src/domain/ssot.v6-old.ts` hacia `src/domain/ssot.ts` para consolidar el modelo de datos del ERP.

### Entidades Migradas:
- ✅ **30+ entidades nuevas** añadidas
- ✅ **15+ tipos/enums** adicionales
- ✅ **5+ helpers** de utilidad
- ❌ **SystemConfig** y **DEFAULT_BUSINESS_RULES** EXCLUIDOS por petición del usuario

---

## 🔧 CAMBIOS REALIZADOS

### 1. TIPOS Y ENUMS AÑADIDOS

```typescript
// Nuevos tipos básicos
export type ISODateString = string;
export type ISO = string;
export type Timestamp = string;
export type LotNumber = string;
export type Uom = 'kg' | 'g' | 'L' | 'mL' | 'unit' | 'bottle' | 'case' | 'pallet';
export type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type ItemCategory = 'fg' | 'raw' | 'pack' | 'label' | 'intermediate' | 'consumable' | 'merch';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
```

### 2. ENTIDADES DE CALIDAD (QC)

```typescript
✅ ParameterBySku
✅ Protocol
✅ ProtocolLog
✅ QcPlanBySku
✅ QcTest
```

**Antes:** Definidos localmente en `/app/(app)/quality/parametros/schemas.ts`
**Ahora:** Centralizados en `ssot.ts`

### 3. ENTIDADES DE INVENTARIO Y ALMACÉN

```typescript
✅ Item
✅ Lot
✅ OnHandView
✅ StockMove
✅ GoodsReceipt
✅ Shipment
✅ DeliveryNote
✅ LotGenealogyEdge
✅ ReservationView
```

**Antes:** 
- `OnHandView` en `src/lib/onhand_view.ts` (separado)
- `GoodsReceipt`, `DeliveryNote` NO existían
- Resto dispersos o incompletos

**Ahora:** Todos centralizados en `ssot.ts`

### 4. ENTIDADES DE PRODUCCIÓN

```typescript
✅ BillOfMaterial
✅ ProductionOrder
```

**Mejoras:**
- `ProductionOrder` ahora incluye: `journal`, `costing`, `execution`, `pauseLog`
- `BillOfMaterial` con campo `stage` y `role` para items

### 5. ENTIDADES DE MARKETING DIGITAL

```typescript
✅ SocialMetrics (NUEVA)
✅ WebAnalytics (NUEVA)
✅ Activation (EXTENDIDA)
✅ MarketingEvent
✅ OnlineCampaign (EXTENDIDA)
✅ InfluencerCollab (EXTENDIDA)
✅ PosCostCatalogEntry
```

**Impacto:**
- Ahora es posible trackear métricas de redes sociales
- Analytics web integrado (GA, Shopify)
- Activaciones con ROI/uplift tracking

### 6. ENTIDADES DE TRAZABILIDAD

```typescript
✅ TraceEvent
✅ LotGenealogyEdge
```

**Antes:** NO existían
**Ahora:** Sistema completo de trazabilidad de lotes

### 7. ENTIDADES DE FINANZAS

```typescript
✅ MaterialCost
✅ FinanceLink
✅ PaymentLink
✅ Expense
```

**Antes:** Interfaces vacías
**Ahora:** Implementaciones completas con enlaces a Holded

### 8. ENTIDADES ADICIONALES

```typescript
✅ User (alias de TeamMember)
✅ OrderSellOut
✅ Payload (union type para ops)
```

### 9. HELPERS Y UTILIDADES

```typescript
✅ qcToBucket() - Convierte QcStatus a LotBucket
✅ normalizeName() - Ya existía, mantenido
✅ buildNameNorm() - Ya existía, mantenido
```

---

## 📊 INTERFACE SantaData ACTUALIZADA

### Antes (8 colecciones):
```typescript
{
  contacts, users, orders, interactions, 
  events, plvMaterial, priceLists, accountPriceOverrides
}
```

### Después (36 colecciones):
```typescript
{
  // Core
  contacts, users,
  
  // Ventas
  orders, interactions, events,
  
  // Precios y PLV
  plvMaterial, priceLists, accountPriceOverrides,
  
  // Calidad (5 nuevas)
  qcParameters, qcProtocols, qcPlans, qcTests, protocolLogs,
  
  // Inventario (9 nuevas)
  items, lots, onHand, stockMoves, goodsReceipts, 
  shipments, deliveryNotes, lotGenealogy, reservations,
  
  // Producción (2 nuevas)
  billOfMaterials, productionOrders,
  
  // Marketing (7 nuevas)
  socialMetrics, webAnalytics, activations, marketingEvents,
  onlineCampaigns, influencerCollabs, posCostCatalog,
  
  // Trazabilidad (1 nueva)
  traceEvents,
  
  // Finanzas (4 nuevas)
  materialCosts, financeLinks, paymentLinks, expenses
}
```

**Incremento:** +28 colecciones (350% más)

---

## ⚠️ ERRORES DE COMPILACIÓN DETECTADOS

Al ejecutar `npm run typecheck` se detectaron **44 errores**. Los principales son:

### 1. **Colección "accounts" faltante** (crítico)
```
error TS2339: Property 'accounts' does not exist on type 'SantaData'
```

**Archivos afectados:**
- `src/app/(app)/admin/data-import/actions.ts`

**Causa:** El código espera `data.accounts[]` pero solo existe `data.contacts[]`

**Solución requerida:** Decidir si:
- Añadir `accounts?: Account[]` a SantaData (alias de contacts)
- Actualizar código para usar `contacts` en lugar de `accounts`

### 2. **Estructura de QcPlanBySku incompatible**
```
error TS2345: Type '{ parameterId: string; required: boolean }[]' 
is not assignable to type '{ id: string; parameterId: string; point: string; ... }'
```

**Archivo afectado:**
- `src/app/(app)/quality/parametros/page.tsx`

**Causa:** La definición migrada de `QcPlanBySku.specs` no coincide con la esperada por el código

**Estructura actual (migrada):**
```typescript
specs: Array<{
  parameterId: string;
  required: boolean;
  frequency?: string;
}>
```

**Estructura esperada por código:**
```typescript
specs: Array<{
  id: string;
  parameterId: string;
  point: string;
  unit?: string;
  method?: string;
  target?: number;
  tolerance?: number;
  range?: { min?: number; max?: number };
}>
```

**Solución requerida:** Actualizar definición de `QcPlanBySku` o ajustar código

### 3. **Tipos de InteractionStatus incompatibles**
```
error TS2322: Type '"open"' is not assignable to type 'InteractionStatus'
```

**Archivo afectado:**
- `src/app/(app)/ops/actions.ts`

**Causa:** El código usa `"open"` pero `InteractionStatus` solo permite `"PROGRAMADA" | "COMPLETADA" | "CANCELADA"`

**Solución requerida:** Alinear valores de enum o actualizar código

### 4. **Campos faltantes en ProductionOrder**
```
error TS2339: Property 'outputSku' does not exist on type 'ProductionOrder'
error TS2339: Property 'outputQty' does not exist on type 'ProductionOrder'
```

**Archivo afectado:**
- `src/app/(app)/production/execution/page.tsx`

**Causa:** La definición migrada usa `outputItemId` + `targetQuantity` pero el código espera `outputSku` + `outputQty`

**Solución requerida:** Actualizar código o añadir campos legacy

### 5. **Meta faltante: DEPT_META**
```
error TS2305: Module '"@/domain/ssot"' has no exported member 'DEPT_META'
```

**Archivo afectado:**
- `src/app/(app)/quality/parametros/page.tsx`

**Causa:** El metadata `DEPT_META` no fue migrado desde v6-old

**Solución requerida:** Añadir metadatos faltantes (ver sección siguiente)

---

## 🚨 ACCIONES PENDIENTES

### PRIORIDAD ALTA:

1. **Añadir metadatos faltantes** (sin SystemConfig):
   ```typescript
   - DEPT_META
   - ORDER_STATUS_META
   - SHIPMENT_STATUS_META
   - LOT_QC_META
   - ITEM_CATEGORY_META
   - SB_COLORS (extendido)
   - SB_THEME
   ```

2. **Cor
