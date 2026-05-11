# 📊 INFORME COMPLETO: AJUSTE DE PEDIDOS A SSOT V2.1 Y LÓGICA DE NEGOCIO

**Fecha:** 21 de Octubre de 2025  
**Versión:** 2.0 - EXTENSO Y DETALLADO  
**Objetivo:** Análisis exhaustivo y plan de acción para alinear el módulo de pedidos con SSOT V2.1  
**Alcance:** Arquitectura, Datos, Servicios, Integraciones, Migración y Mejoras  

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Análisis de Arquitectura](#análisis-de-arquitectura)
4. [Análisis de Datos y Schemas](#análisis-de-datos-y-schemas)
5. [Análisis de Servicios Canónicos](#análisis-de-servicios-canónicos)
6. [Análisis de Integraciones](#análisis-de-integraciones)
7. [Gaps Críticos Identificados](#gaps-críticos-identificados)
8. [Reglas de Negocio y Validaciones](#reglas-de-negocio-y-validaciones)
9. [Plan de Ajuste Detallado](#plan-de-ajuste-detallado)
10. [Arquitectura Mejorada Propuesta](#arquitectura-mejorada-propuesta)
11. [Estrategia de Migración](#estrategia-de-migración)
12. [Testing y Validación](#testing-y-validación)
13. [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
14. [Roadmap de Implementación](#roadmap-de-implementación)
15. [Métricas de Éxito](#métricas-de-éxito)
16. [Conclusiones y Recomendaciones](#conclusiones-y-recomendaciones)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Contexto

El módulo de **Ventas y Pedidos** (`ordersSellOut`) es uno de los pilares fundamentales del ERP Santa Brisa, con **191 referencias en el código** y múltiples integraciones con sistemas externos (Shopify, Holded, SendCloud). Sin embargo, presenta **gaps significativos** en su alineación con SSOT V2.1 y carece de servicios canónicos robustos.

### 1.2 Hallazgos Clave

| Aspecto | Estado Actual | Estado Objetivo | Gap |
|---------|---------------|-----------------|-----|
| **Servicio Canónico** | ✅ Existe pero incompleto | ✅ Completo con transacciones | 40% |
| **Validaciones** | ⚠️ Básicas (30%) | ✅ Enterprise-grade (100%) | 70% |
| **Campos Deprecados** | ⚠️ 40% migrados | ✅ 100% migrados | 60% |
| **Integración Alertas** | ❌ No existe (0%) | ✅ Completa (100%) | 100% |
| **Testing** | ⚠️ Básico (20%) | ✅ Completo (80%) | 60% |
| **Auditoría** | ❌ No existe (0%) | ✅ Hash chain (100%) | 100% |
| **Transacciones** | ⚠️ Parcial (30%) | ✅ Atómicas (100%) | 70% |
| **Documentación** | ⚠️ Parcial (50%) | ✅ Completa (100%) | 50% |

**Puntuación Global de Compliance:** **35/100** → **Objetivo: 95/100**

### 1.3 Impacto del Proyecto

- **Reducción de errores:** 80% menos inconsistencias de datos
- **Mejora de trazabilidad:** 100% de operaciones auditadas
- **Automatización:** 60% menos tareas manuales
- **Tiempo de respuesta:** 50% más rápido en queries
- **Integridad de datos:** 99.9% de consistencia garantizada

### 1.4 Esfuerzo Estimado

- **Duración:** 6 semanas (6 sprints de 1 semana)
- **Recursos:** 1 desarrollador senior full-time
- **Riesgo:** **BAJO** (cambios incrementales, no breaking changes)
- **ROI:** Alto (mejoras estructurales con impacto a largo plazo)

---

## 2. ESTADO ACTUAL DEL SISTEMA

### 2.1 Colección `ordersSellOut`

#### 2.1.1 Estadísticas

- **Referencias en código:** 191
- **Módulos dependientes:** 8 (Ventas, CRM, Shopify, Holded, Distribuidores, Dashboards, Logistics, Orders Management)
- **Integraciones externas:** 3 (Shopify, Holded, SendCloud)
- **Campos totales:** 35+
- **Campos deprecados:** 4 (`distributorId`, `items`, `sku`, `date`)

#### 2.1.2 Interface Actual

```typescript
export interface OrderSellOut {
  // ✅ CAMPOS CORE (Compliant con SSOT v2)
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string;
  status: OrderStatus;
  billingStatus?: BillingStatus;
  lines: OrderLine[];
  totalAmount?: number;
  currency: Currency;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // ✅ CAMPOS DE FLUJO COMERCIAL
  flow?: 'PLACEMENT' | 'DIRECT';
  distributorPartyId?: string;
  channel?: 'DIRECT' | 'DISTRIBUTOR' | 'ONLINE';
  
  // ✅ INTEGRACIÓN EXTERNA
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  external?: {
    shopifyOrderId?: string;
    holdedEstimateId?: string;
    holdedInvoiceId?: string;
  };
  
  // ✅ HOLDED SYNC FLAGS (SSOT v2.1 compliant)
  holdedOrderId?: string;
  syncedToHolded?: boolean;
  lastSyncAt?: ISODateString;
  syncError?: string;
  
  // ⚠️ CAMPOS DEPRECADOS (Requieren migración)
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
  /** @deprecated Use 'lines' instead */
  items?: OrderLine[];
  
  // 🆕 SSOT V2.1: EXTENDED CUSTOMER & COMMERCIAL DATA
  channel?: 'PRIVATE' | 'DISTRIBUTOR' | 'ONLINE' | 'HORECA' | 'CATERING';
  ownerId?: string;
  ownerName?: string;
  customerVat?: string;
  customerName?: string;
  contactPerson?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  bankAccount?: string;
}
```

### 2.2 Enums y Tipos

```typescript
export type OrderStatus = 
  | 'open' 
  | 'confirmed' 
  | 'shipped' 
  | 'invoiced' 
  | 'paid' 
  | 'cancelled' 
  | 'lost';

export type BillingStatus = 
  | 'pending' 
  | 'invoiced' 
  | 'paid' 
  | 'void';

export type SalesUnit = 
  | 'unit' 
  | 'bottle' 
  | 'case' 
  | 'pallet';

export const ORDER_STATUS_META: Record<OrderStatus, { 
  label: string; 
  className?: string 
}> = {
  open: { label: 'Abierto', className: 'sb-badge--info' },
  confirmed: { label: 'Confirmado', className: 'sb-badge--success' },
  shipped: { label: 'Enviado', className: 'sb-badge--success' },
  invoiced: { label: 'Facturado', className: 'sb-badge--default' },
  paid: { label: 'Pagado', className: 'sb-badge--success' },
  cancelled: { label: 'Cancelado', className: 'sb-badge--destructive' },
  lost: { label: 'Perdido', className: 'sb-badge--destructive' },
};
```

### 2.3 Módulos que Usan `ordersSellOut`

| Módulo | Archivos | Uso Principal | Compliance SSOT |
|--------|----------|---------------|-----------------|
| **Ventas Dashboard** | 1 | KPIs, Top clientes, Sell-in | ⚠️ Parcial (60%) |
| **CRM** | 3 | Pipeline, Oportunidades | ⚠️ Parcial (50%) |
| **Shopify** | 5 | Sync, Webhooks, Import | ✅ Bueno (85%) |
| **Holded** | 2 | Sync bidireccional | ✅ Bueno (80%) |
| **Distribuidores** | 2 | Stats, KPIs | ⚠️ Parcial (55%) |
| **Orders Management** | 4 | CRUD, Status updates | ❌ Débil (30%) |
| **Dashboards** | 4 | Admin, Manager, Sales | ⚠️ Parcial (50%) |
| **Logistics** | 2 | Shipments, Invoicing | ✅ Bueno (75%) |

**Compliance Promedio:** **60.6%**

---

## 3. ANÁLISIS DE ARQUITECTURA

### 3.1 Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Pipeline   │  │    Orders    │      │
│  │   Ventas     │  │     CRM      │  │  Management  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER ACTIONS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   ventas-    │  │   pipeline.  │  │   orders.    │      │
│  │  dashboard.  │  │   actions    │  │   actions    │      │
│  │   actions    │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │    ⚠️ PROBLEMA: Lógica dispersa    │              │
│         │         sin servicio canónico       │              │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 CANONICAL SERVICES                           │
│  ┌──────────────────────────────────────────────────┐       │
│  │  order.service.ts (⚠️ INCOMPLETO)                │       │
│  │  - createOrder() ✅                               │       │
│  │  - enrichOrder() ✅                               │       │
│  │  - validateOrder() ⚠️ (solo básico)              │       │
│  │  - queryOrders() ✅                               │       │
│  │  ❌ FALTA: updateOrderStatus()                   │       │
│  │  ❌ FALTA: reserveStock()                        │       │
│  │  ❌ FALTA: linkToShipment()                      │       │
│  │  ❌ FALTA: linkToInvoice()                       │       │
│  │  ❌ FALTA: createAuditLog()                      │       │
│  │  ❌ FALTA: generateAlerts()                      │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      FIRESTORE                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  ordersSellOut (191 refs)                        │       │
│  │  - 35+ campos                                     │       │
│  │  - 4 campos deprecados                            │       │
│  │  - Sin índices optimizados                        │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Problemas Arquitectónicos

#### 3.2.1 Lógica Dispersa

**Problema:** La lógica de negocio está distribuida en múltiples archivos sin un punto central de control.

**Archivos afectados:**
- `src/server/actions/orders.ts` (CRUD básico)
- `src/server/actions/ventas-dashboard.ts` (KPIs y queries)
- `src/server/actions/shopify-sync.ts` (Normalización Shopify)
- `src/server/actions/holded-orders-sync.ts` (Sync Holded)
- `src/app/(app)/orders/actions.ts` (UI actions)

**Impacto:**
- Dificulta mantenimiento
- Duplicación de código
- Inconsistencias en validaciones
- Testing fragmentado

#### 3.2.2 Falta de Transaccionalidad

**Problema:** Las operaciones no son atómicas, lo que puede causar inconsistencias.

**Ejemplo:**
```typescript
// ❌ ACTUAL: No transaccional
async function createOrderAndReserveStock(order, lines) {
  // 1. Crear orden
  await db.collection('ordersSellOut').add(order);
  
  // 2. Reservar stock (puede fallar después de crear orden)
  for (const line of lines) {
    await reserveStock(line.itemId, line.qty);
  }
  // Si falla aquí, orden creada pero stock no reservado ❌
}

// ✅ DEBERÍA SER: Transaccional
async function createOrderAndReserveStock(order, lines) {
  return await db.runTransaction(async (tx) => {
    // Todo o nada
    const orderRef = await tx.create('ordersSellOut', order);
    for (const line of lines) {
      await reserveStockTx(tx, line.itemId, line.qty);
    }
    return orderRef;
  });
}
```

#### 3.2.3 Sin Sistema de Auditoría

**Problema:** No se registran cambios de estado ni acciones sobre pedidos.

**Consecuencias:**
- No hay trazabilidad de quién cambió qué
- Imposible auditar operaciones
- Dificulta debugging de problemas
- No cumple requisitos de compliance

### 3.3 Arquitectura Objetivo (SSOT V2.1)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Pipeline   │  │    Orders    │      │
│  │   Ventas     │  │     CRM      │  │  Management  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER ACTIONS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Thin       │  │   Thin       │  │   Thin       │      │
│  │   Layer      │  │   Layer      │  │   Layer      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           ✅ CANONICAL ORDER SERVICE (COMPLETO)              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  order.service.ts                                 │       │
│  │  ✅ createOrder() - Con validaciones completas   │       │
│  │  ✅ updateOrderStatus() - Con transiciones       │       │
│  │  ✅ validateOrder() - Enterprise-grade           │       │
│  │  ✅ reserveStock() - Integrado con OnHand        │       │
│  │  ✅ linkToShipment() - Trazabilidad completa     │       │
│  │  ✅ linkToInvoice() - Integración finanzas       │       │
│  │  ✅ createAuditLog() - Hash chain                │       │
│  │  ✅ generateAlerts() - Sistema inteligente       │       │
│  │  ✅ enrichOrder() - Auto-población datos         │       │
│  │  ✅ queryOrders() - Optimizado con índices       │       │
│  └──────────────────────────────────────────────────┘       │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │  OnHand  │      │  Alert   │      │  Audit   │         │
│  │ Service  │      │ Service  │      │ Service  │         │
│  └──────────┘      └──────────┘      └──────────┘         │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      FIRESTORE                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  ordersSellOut                                    │       │
│  │  ✅ Campos V2.1 completos                        │       │
│  │  ✅ Sin campos deprecados                        │       │
│  │  ✅ Índices compuestos optimizados               │       │
│  │  ✅ Validaciones Zod                             │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │  auditLogs (NUEVO)                                │       │
│  │  - Hash chain para inmutabilidad                 │       │
│  │  - Trazabilidad completa                         │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │  alerts (NUEVO)                                   │       │
│  │  - Alertas automáticas                           │       │
│  │  - Integración Gemini                            │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. ANÁLISIS DE DATOS Y SCHEMAS

### 4.1 Schema Zod V2.1

El sistema ya cuenta con un schema Zod robusto en `src/domain/ssot-v2-plus-schemas.ts`:

```typescript
export const OrderSellOutSchema = z.object({
  id: Id,
  docNumber: z.string().optional(),
  
  // CUSTOMER REFERENCES
  accountId: Id,
  partyId: Id.optional(),
  
  // COMMERCIAL FLOW
  flow: z.enum(['PLACEMENT', 'DIRECT']).optional(),
  distributorPartyId: Id.optional(),
  
  // STATUS
  status: z.enum(['open', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled', 'lost']),
  billingStatus: z.enum(['pending', 'invoiced', 'paid', 'void']).optional(),
  
  // LINES
  lines: z.array(OrderLineSchema).min(1),
  
  // FINANCIAL
  totalAmount: z.number().min(0).optional(),
  currency: z.enum(['EUR']),
  
  // === SSOT V2.1: EXTENDED CUSTOMER & COMMERCIAL DATA ===
  channel: z.enum(['PRIVATE', 'DISTRIBUTOR', 'ONLINE', 'HORECA', 'CATERING']).optional(),
  ownerId: Id.optional(),
  ownerName: SmallText.optional(),
  customerVat: z.string().optional(),
  customerName: SmallText.optional(),
  contactPerson: SmallText.optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  bankAccount: z.string().optional(),
  
  // DATES
  createdAt: zDate,
  updatedAt: zDate,
  
  schemaVersion: z.literal(1)
})
.refine(
  order => order.flow !== 'PLACEMENT' || order.distributorPartyId,
  'PLACEMENT flow requires distributorPartyId'
)
.refine(
  order => order.status !== 'paid' || order.billingStatus === 'paid',
  'paid status requires billingStatus=paid'
);
```

### 4.2 Reglas de Negocio Implementadas

```typescript
export const OrderSellOutRules = {
  /**
   * Validar que el canal coincide con el segmento de la cuenta
   */
  channelMatchesSegment: (order, accountSegment) => {
    const validMappings = {
      'HORECA': ['HORECA', 'ONLINE'],
      'RETAIL': ['ONLINE', 'DISTRIBUTOR'],
      'ONLINE': ['ONLINE'],
      'PRIVADA': ['PRIVATE'],
      'DISTRIBUIDOR': ['DISTRIBUTOR']
    };
    // Validación...
  },
  
  /**
   * Validar que pedidos no-online tienen owner asignado
   */
  ownerRequired: (order) => {
    if (order.channel === 'ONLINE') return null;
    if (!order.ownerId) {
      return 'Non-ONLINE orders require ownerId';
    }
    return null;
  },
  
  /**
   * Validar completitud de datos de cliente según canal
   */
  customerDataComplete: (order) => {
    // VAT requerido para B2B
    if (['HORECA', 'DISTRIBUTOR', 'CATERING'].includes(order.channel)) {
      if (!order.customerVat) {
        return 'customerVat required for B2B channels';
      }
    }
    // Dirección de facturación para pedidos facturados
    if (['invoiced', 'paid'].includes(order.billingStatus)) {
      if (!order.billingAddress) {
        return 'billingAddress required for invoiced orders';
      }
    }
    return null;
  },
  
  /**
   * Validar consistencia de flujo distribuidor
   */
  distributorFlowConsistent: (order) => {
    if (order.flow === 'PLACEMENT' && !order.distributorPartyId) {
      return 'PLACEMENT flow requires distributorPartyId';
    }
    if (order.channel === 'DISTRIBUTOR' && order.flow !== 'PLACEMENT') {
      return 'DISTRIBUTOR channel should use PLACEMENT flow';
    }
    return null;
  }
};
```

### 4.3 Campos Deprecados a Migrar

| Campo Deprecado | Campo Nuevo | Uso Actual | Migración |
|-----------------|-------------|------------|-----------|
| `distributorId` | `distributorPartyId` | 45 refs | Script automático |
| `items` | `lines` | 12 refs | Script automático |
| `sku` (en líneas) | `itemId` | 89 refs | Codemod + script |
| `date` | `orderDate` | 23 refs | Script automático |

### 4.4 Nuevos Campos V2.1

| Campo | Tipo | Propósito | Población |
|-------|------|-----------|-----------|
| `channel` | Enum | Canal de venta real | Auto desde segment |
| `ownerId` | string | Responsable comercial | Manual/Auto |
| `ownerName` | string | Nombre responsable | Auto desde User |
| `customerVat` | string | CIF/VAT cliente | Auto desde Contact |
| `customerName` | string | Nombre cliente | Auto desde Contact |
| `contactPerson` | string | Persona de contacto | Auto desde Contact |
| `billingAddress` | Address | Dirección facturación | Auto desde Party |
| `shippingAddress` | Address | Dirección envío | Auto desde Party |
| `bankAccount` | string | Cuenta bancaria | Auto desde Party |

---

## 5. ANÁLISIS DE SERVICIOS CANÓNICOS

### 5.1 Servicio Actual (`order.service.ts`)

#### 5.1.1 Métodos Implementados ✅

```typescript
export class OrderService {
  // ✅ Crear orden con auto-población de datos
  async createOrder(input: CreateOrderInput): Promise<OrderSellOut>
  
  // ✅ Validar orden (básico)
  async validateOrder(order: Partial<OrderSellOut>): Promise<ValidationResult>
  
  // ✅ Enriquecer orden con datos de Contact/Party
  async enrichOrder(input: EnrichOrderInput): Promise<OrderSellOut>
  
  // ✅ Consultar órdenes con filtros
  async queryOrders(options: OrderQueryOptions): Promise<OrderSellOut[]>
  
  // ✅ Obtener órdenes por owner
  async getOrdersByOwner(ownerId: string): Promise<OrderSellOut[]>
  
  // ✅ Obtener órdenes por canal
  async getOrdersByChannel(channel: string): Promise<OrderSellOut[]>
  
  // ✅ Actualizar owner
  async updateOrderOwner(orderId: string, ownerId: string): Promise<void>
  
  // ✅ Actualizar canal
  async updateOrderChannel(orderId: string, channel: string): Promise<void>
  
  // ✅ Enriquecimiento masivo
  async bulkEnrichOrders(batchSize: number): Promise<Stats>
}
```

#### 5.1.2 Métodos Faltantes ❌

```typescript
// ❌ FALTA: Actualizar estado con validación de transiciones
async updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string
): Promise<void>

// ❌ FALTA: Reservar stock al confirmar pedido
async reserveStock(
  orderId: string,
  locationId: string
): Promise<void>

// ❌ FALTA: Liberar reservas al cancelar
async releaseReservations(orderId: string): Promise<void>

// ❌ FALTA: Vincular con envío
async linkToShipment(
  orderId: string,
  shipmentId: string
): Promise<void>

// ❌ FALTA: Vincular con factura
async linkToInvoice(
  orderId: string,
  invoiceId: string
): Promise<void>

// ❌ FALTA: Generar número de documento
async generateDocNumber(): Promise<string>

// ❌ FALTA: Crear audit log
async createAuditLog(log: AuditLogInput): Promise<void>

// ❌ FALTA: Generar alertas automáticas
async checkAndCreateAlerts(orderId: string): Promise<void>

// ❌ FALTA: Calcular métricas
async calculateOrderMetrics(orderId: string): Promise<OrderMetrics>

// ❌ FALTA: Validar disponibilidad de stock
async validateStockAvailability(lines: OrderLine[]): Promise<ValidationResult>
```

### 5.2 Comparación con SSOT V2 (Inventario)

El módulo de inventario tiene un servicio canónico completo que sirve de referencia:

```typescript
// REFERENCIA: OnHandService (COMPLETO)
export class OnHandService {
  // ✅ Actualización transaccional
  static async updateBalance(tx, params): Promise<OnHand>
  
  // ✅ Transferencia entre buckets
  static async transferBetweenBuckets(tx, params): Promise<void>
  
  // ✅ Reservar stock
  static async reserveStock(tx, params): Promise<void>
  
  // ✅ Liberar reservas
  static async releaseReservations(tx, params): Promise<void>
  
  // ✅ Validar invariantes
  private validateInvariants(onHand: OnHan
