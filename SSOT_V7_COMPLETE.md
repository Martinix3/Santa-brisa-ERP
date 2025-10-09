# SSOT v7 — Santa Brisa ERP (Completo y Extensible)

**Versión:** 7.0  
**Fecha:** 9 de octubre, 2025  
**Basado en:** Integración Holded + Modelo extendido Santa Brisa

---

## 📖 ÍNDICE

1. [Principios de Diseño](#1-principios-de-diseño)
2. [Arquitectura General](#2-arquitectura-general)
3. [Entidades Core](#3-entidades-core)
4. [Entidades de Ventas](#4-entidades-de-ventas)
5. [Entidades de Marketing](#5-entidades-de-marketing)
6. [Entidades de Operaciones](#6-entidades-de-operaciones)
7. [Entidades de Producción](#7-entidades-de-producción)
8. [Entidades de RRHH](#8-entidades-de-rrhh)
9. [Integraciones](#9-integraciones)
10. [Enums Canónicos](#10-enums-canónicos)
11. [Mapeo con Holded](#11-mapeo-con-holded)
12. [Índices y Performance](#12-índices-y-performance)
13. [Flujos de Datos](#13-flujos-de-datos)
14. [Plan de Migración](#14-plan-de-migración)

---

## 1) PRINCIPIOS DE DISEÑO

### **1.1 Fuente Única de Verdad**
- Todos los datos maestros residen en Firestore
- Colecciones en plural (ej: `accounts`, `items`, `orders`)
- IDs autogenerados o semánticos según necesidad

### **1.2 Integración con Holded**
- **Holded SSOT para:** Facturas, Pagos, Contabilidad
- **CRM SSOT para:** Producción, Stock, Trazabilidad, Marketing
- **Bidireccional:** Contactos, Presupuestos, Pedidos
- Espejos (`*_mirror`) para datos de Holded

### **1.3 Auditoría y Trazabilidad**
- Todas las entidades incluyen: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Soft-delete: `deletedAt?` en lugar de borrado físico
- `auditLogs` captura todos los cambios significativos

### **1.4 Extensibilidad**
- `custom?: Record<string, any>` en entidades principales
- `tags?: string[]` para clasificación flexible
- Jobs de enriquecimiento automático (Google Places, scraping)

---

## 2) ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│                     FIRESTORE (SSOT)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CORE:           accounts, contacts, teams, items           │
│  VENTAS:         orders, orderSellOut, interactions         │
│  MARKETING:      events, plv, activations, campaigns        │
│  OPERACIONES:    warehouses, onHand, stockMoves, shipments  │
│  PRODUCCIÓN:     productionOrders, lots, qcTests            │
│  RRHH:           employees, timeOff, commissions            │
│  FINANZAS:       payments_mirror (desde Holded)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              ↕ Sync                    ↕ Sync
┌──────────────────────┐    ┌──────────────────────┐
│   HOLDED (API)       │    │   SHOPIFY (API)      │
│   - Invoices         │    │   - Online Orders    │
│   - Contacts         │    │   - Customers        │
│   - Payments         │    │   - Products         │
│   - Documents        │    │   - Inventory        │
└──────────────────────┘    └──────────────────────┘
```

---

## 3) ENTIDADES CORE

### 3.1 `accounts` (Cuentas/Clientes)

```typescript
{
  id: string;
  name: string;
  legalName?: string;
  cif?: string;  // España
  vat?: string;  // Internacional
  
  // Clasificación
  segment: 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'PRIVADA' | 'ONLINE';
  stage: 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA' | 'CERRADA' | 'BAJA';
  
  // Jerarquía
  parentAccountId?: string;      // Para grupos empresariales
  distributorId?: string;        // Si es cuenta de colocación
  
  // Comercial
  salesRepId?: string;
  channels: Array<'ONLINE' | 'PRIVADA' | 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR'>;
  commercialFlow: 'DIRECTA' | 'COLOCACION' | 'AMBOS';
  
  // Contacto
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  
  // Direcciones
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Financiero (de Holded)
  paymentMethodDefault?: string;
  paymentDaysDefault?: number;
  discountDefaultPct?: number;
  iban?: string;
  
  // Enriquecimiento
  enrichment?: {
    source?: 'GOOGLE_PLACES' | 'SCRAPE' | 'MANUAL';
    placeId?: string;
    website?: string;
    instagram?: string;
    rating?: number;
    openingHours?: string[];
    photos?: string[];
    lastCheckedAt?: string;
  };
  
  // Metadata
  tags?: string[];
  custom?: Record<string, any>;
  
  // Holded sync
  holdedContactId?: string;
  holdedUpdatedAt?: string;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}
```

**Ejemplo:**
```json
{
  "id": "acc_001",
  "name": "Bar Pepito",
  "segment": "HORECA",
  "stage": "ACTIVA",
  "commercialFlow": "DIRECTA",
  "salesRepId": "user_patxi",
  "billingAddress": {
    "street": "Calle Mayor 123",
    "city": "Madrid",
    "postalCode": "28001",
    "country": "España"
  },
  "enrichment": {
    "source": "GOOGLE_PLACES",
    "placeId": "ChIJ...",
    "rating": 4.5,
    "website": "https://barpepito.es"
  }
}
```

---

### 3.2 `contacts` (Personas)

```typescript
{
  id: string;
  accountId: string;
  name: string;
  role?: string;         // Gerente, Comprador, etc.
  email?: string;
  phone?: string;
  isPrimary?: boolean;   // Contacto principal
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

---

### 3.3 `teams` (Usuarios/Equipo)

```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'MKT' | 'OPS' | 'FIN' | 'HR' | 'PRODUCCION';
  active: boolean;
  
  // Jerarquía
  managerId?: string;
  
  // Permisos
  permissions?: string[];
  
  // Comercial
  commissionPct?: number;
  targets?: {
    period: 'MONTH' | 'QUARTER' | 'YEAR';
    revenueTarget?: number;
    newAccountsTarget?: number;
    visitsTarget?: number;
  };
  
  // Holded sync
  holdedUserId?: string;
  
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}
```

---

### 3.4 `items` (Productos/SKUs)

```typescript
{
  id: string;
  name: string;
  sku: string;
  gtin?: string[];       // EAN-13, EAN-14, EAN-128
  
  // Tipo
  kind: 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'RAW' | 'PACKAGING';
  category?: string;
  
  // Unidad de medida
  uom: 'UNIT' | 'L' | 'KG' | 'BOX' | 'CASE' | 'PALLET';
  
  // Empaquetado
  pack?: {
    unitsPerCase?: number;
    casesPerPallet?: number;
    taraKg?: number;
  };
  
  // Logística
  trackStock: boolean;
  trackBatches?: boolean;
  trackSerials?: boolean;
  dimensions?: { w?: number; h?: number; l?: number; unit?: 'cm' | 'm' };
  weightKg?: number;
  volumeL?: number;
  
  // Precios
  defaultTaxPct?: number;
  msrp?: number;        // Precio recomendado
  cost?: number;        // Coste
  price?: number;       // Precio base
  
  // Proveedores
  suppliers?: Array<{
    accountId: string;
    supplierSku?: string;
    cost?: number;
    leadTimeDays?: number;
  }>;
  
  // Marketing
  longDesc?: string;
  marketingFlags?: string[];  // ['NEW', 'PROMO', 'BESTSELLER']
  images?: string[];
  
  // Metadata
  tags?: string[];
  custom?: Record<string, any>;
  
  // Holded sync
  holdedProductId?: string;
  holdedUpdatedAt?: string;
  
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

---

## 4) ENTIDADES DE VENTAS

### 4.1 `orders` (Pedidos/Documentos Comerciales)

```typescript
{
  id: string;
  orderNumber?: string;
  
  // Cliente
  accountId: string;
  distributorId?: string;    // Si es colocación
  
  // Tipo de venta
  channel: 'DIRECTA' | 'COLOCACION';
  source?: 'Holded' | 'Shopify' | 'Manual' | 'DistributorPortal' | 'B2B';
  
  // Tipo de documento
  documentType: 'ESTIMATE' | 'SALESORDER' | 'INVOICE' | 'DELIVERYNOTE' | 'INTERNAL';
  
  // Fechas
  date: string;
  dueDate?: string;
  deliveryDate?: string;
  
  // Estado
  status: 'BORRADOR' | 'ABIERTO' | 'EN_PROCESO' | 'SERVIDO' | 'FACTURADO' | 'PAGADO' | 'CANCELADO';
  
  // Importes
  currency: 'EUR';
  subtotal?: number;
  discountTotal?: number;
  taxBase?: number;
  tax?: number;
  total: number;
  
  // Líneas
  items: Array<{
    sku: string;
    name?: string;
    qty: number;
    uom: string;
    unitPrice: number;
    discountPct?: number;
    taxPct?: number;
    subtotal?: number;
    total?: number;
    linkedPromotionIds?: string[];
  }>;
  
  // Referencias
  linkedPromotions?: string[];
  shipmentId?: string;
  warehouseId?: string;
  
  // Holded integration
  holded?: {
    documentId?: string;
    type?: 'estimate' | 'salesorder' | 'invoice' | 'deliverynote';
    number?: string;
    updatedAt?: string;
  };
  
  notes?: string;
  custom?: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}
```

---

### 4.2 `orderSellOut` (Reportes de Sell-Out de Distribuidores)

```typescript
{
  id: string;
  distributorId: string;
  accountId?: string;        // Cuenta final (si conocida)
  
  // Periodo
  period: {
    from: string;
    to: string;
  };
  
  // Líneas vendidas
  lines: Array<{
    sku: string;
    qty: number;
    unitPrice?: number;
    total?: number;
  }>;
  
  // Origen
  source?: 'CSV' | 'API' | 'EMAIL' | 'PORTAL';
  
  // Estado
  status: 'RECEIVED' | 'VALIDATED' | 'REJECTED';
  
  notes?: string;
  attachments?: string[];
  
  createdAt: string;
  updatedAt: string;
  validatedBy?: string;
  validatedAt?: string;
}
```

---

### 4.3 `interactions` (Interacciones con clientes)

```typescript
{
  id: string;
  accountId: string;
  
  // Departamento
  dept: 'VENTAS' | 'MARKETING' | 'OPS' | 'FIN' | 'HR' | 'OTRO';
  
  // Tipo
  kind: 'LLAMADA' | 'VISITA' | 'EMAIL' | 'WHATSAPP' | 'REUNION' | 'OTRO';
  
  // Cuándo
  when: string;
  duration?: number;         // minutos
  
  // Estado
  status: 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_CONTACTO';
  
  // Resultado
  result?: 'VISITA_OK' | 'VISITA_FALLIDA' | 'SIN_CONTACTO' | 'PEDIDO' | 'PENDIENTE' | 'OTRO';
  summary?: string;
  nextAt?: string;          // Próxima acción
  
  // Referencias
  linkedOrderId?: string;
  linkedEventId?: string;
  
  // Attachments
  attachments?: string[];   // URLs fotos/docs
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### 4.4 `tasks` (Tareas/Seguimientos)

```typescript
{
  id: string;
  title: string;
  accountId?: string;
  assignedToId?: string;
  
  // Clasificación
  dept?: 'VENTAS' | 'MARKETING' | 'OPS' | 'FIN' | 'HR';
  kind?: 'FOLLOWUP' | 'COBRO' | 'MKT' | 'OPS' | 'OTRO';
  
  // Timing
  dueAt: string;
  status: 'OPEN' | 'DONE' | 'CANCELLED';
  
  // Referencias
  linkedId?: string;
  linkedKind?: 'order' | 'event' | 'activation' | 'plv' | 'shipment';
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

---

## 5) ENTIDADES DE MARKETING

### 5.1 `events` (Eventos Marketing/Comerciales)

```typescript
{
  id: string;
  accountId?: string;
  
  // Tipo
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'POS' | 'ONLINE' | 'OTRO';
  
  // Info básica
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  
  // Presupuesto y KPIs
  budget?: number;
  spend?: number;
  goal?: string;
  kpis?: Record<string, number>;  // visitors, leads, sales, etc.
  
  // Estado
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  notes?: string;
  links?: string[];
  attachments?: string[];
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

---

### 5.2 `plv_material` (Material PLV)

```typescript
{
  id: string;
  
  // Tipo
  kind: 'SHELF_TALKER' | 'STANDEE' | 'FRIDGE_STICKER' | 'HANGING' | 'GONDOLA' | 'OTHER';
  description?: string;
  
  // Coste y amortización
  purchaseCost?: number;
  purchaseDate?: string;
  expectedLifespanMonths?: number;
  expectedUses?: number;
  usesCount?: number;           // Veces usado
  
  // Estado actual
  status: 'IN_STOCK' | 'INSTALLED' | 'DAMAGED' | 'RETIRED';
  accountId?: string;           // Donde está instalado
  installedAt?: string;
  
  // Evidencia
  photoUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 5.3 `activations` (Activaciones POS)

```typescript
{
  id: string;
  accountId: string;
  materialId?: string;          // PLV usado
  
  // Descripción
  description?: string;
  
  // Timing
  startDate: string;
  endDate?: string;
  
  // Estado
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  // KPIs
  kpis?: {
    visitors?: number;
    samples?: number;
    salesAttributed?: number;
    upliftPct?: number;
  };
  
  // Owner
  ownerId: string;
  
  notes?: string;
  photos?: string[];
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 5.4 `posTactics` (Tácticas POS con ROI)

```typescript
{
  id: string;
  accountId: string;
  
  // Referencias
  eventId?: string;
  interactionId?: string;
  orderId?: string;
  
  // Táctica
  tacticCode?: string;          // Del catálogo
  description?: string;
  appliesToSkuIds?: string[];
  
  // Ítems de coste
  items: Array<{
    id: string;
    catalogCode?: string;
    description: string;
    qty?: number;
    unitCost?: number;
    actualCost: number;
    uom?: string;
    vendor?: string;
    assetId?: string;
    attachments?: string[];
  }>;
  
  // Costes
  plannedCost?: number;
  actualCost: number;
  
  // Ejecución
  executionScore: number;       // 0-100
  
  // Estado
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  // Resultados
  result?: {
    roi?: number;
    liftPct?: number;
    upliftUnits?: number;
    revenueAttributed?: number;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}
```

---

### 5.5 `posCostCatalog` (Catálogo de Costes POS)

```typescript
{
  id: string;
  code: string;
  label: string;
  
  // Coste
  defaultUnitCost?: number;
  uom: 'UNIT' | 'HOUR' | 'BATCH' | 'KG' | 'M2';
  
  // Proveedor
  vendor?: string;
  
  // Estado
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 5.6 `onlineCampaigns` (Campañas Online)

```typescript
{
  id: string;
  name: string;
  
  // Canal
  channel: 'META' | 'GOOGLE' | 'TIKTOK' | 'EMAIL' | 'OTHER';
  
  // Timing
  startAt: string;
  endAt?: string;
  
  // Presupuesto
  budget: number;
  spend?: number;
  
  // Métricas
  metrics?: {
    impressions?: number;
    clicks?: number;
    ctr?: number;
    cpc?: number;
    conversions?: number;
    revenue?: number;
    roas?: number;
  };
  
  // Estado
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  // Tracking
  tracking?: {
    utmCampaign?: string;
    couponCode?: string;
    landingUrl?: string;
  };
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

---

### 5.7 `collabs` (Colaboraciones/Influencers)

```typescript
{
  id: string;
  name: string;
  handle?: string;
  platform?: 'Instagram' | 'TikTok' | 'YouTube' | 'Blog' | 'Other';
  
  // Coste
  cost: number;
  
  // Deliverables
  deliverables?: string[];      // ['2 posts', '1 reel', '1 story']
  
  // Métricas
  metrics?: {
    reach?: number;
    engagement?: number;
    leads?: number;
    conversions?: number;
    roas?: number;
  };
  
  // Estado
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 6) ENTIDADES DE OPERACIONES

### 6.1 `warehouses` (Almacenes)

```typescript
{
  id: string;
  name: string;
  code?: string;
  active: boolean;
  
  // Ubicación
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
  };
  
  // Tipo
  kind?: 'OWN' | '3PL' | 'CONSIGNA';
  
  // Consigna
  consignment?: {
    ownerAccountId?: string;    // Distribuidor/Cliente propietario
    terms?: string;
    returnPolicy?: string;
  };
  
  // Default
  default?: boolean;
  
  // Holded sync
  holdedWarehouseId?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 6.2 `onHand` (Inventario Disponible - Vista Materializada)

```typescript
{
  id: string;
  warehouseId: string;
  sku: string;
  
  // Cantidades
  qty: number;
  reserved?: number;
  available?: number;           // qty - reserved
  
  // Lotes (sumario)
  lotNumbers?: Record<string, number>;  // { 'LOT-001': 50, 'LOT-002': 30 }
  
  updatedAt: string;
}
```

---

### 6.3 `stockMoves` (Movimientos de Stock)

```typescript
{
  id: string;
  date: string;
  
  // Tipo
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  reason?: 'PURCHASE' | 'SALE' | 'RETURN' | 'PRODUCTION' | 'CONSUMPTION' | 'LOSS' | 'OTHER';
  
  // Almacenes
  warehouseId: string;
  toWarehouseId?: string;       // Para transfers
  
  // Items
  items: Array<{
    sku: string;
    quantity: number;
    cost?: number;
    lotNumber?: string;
    serial?: string;
    location?: string;          // Ubicación física
  }>;
  
  // Referencia al documento origen
  documentRef?: {
    kind: 'order' | 'invoice' | 'deliverynote' | 'goodsReceipt' | 'productionOrder' | 'adjustment';
    id: string;
  };
  
  notes?: string;
  
  createdAt: string;
  createdBy: string;
}
```

---

### 6.4 `shipments` (Envíos)

```typescript
{
  id: string;
  shipmentNumber?: string;
  orderId: string;
  
  // Líneas
  lines: Array<{
    sku: string;
    name?: string;
    qty: number;
    lotNumber?: string;
  }>;
  
  // Estado
  status: 'DRAFT' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  
  // Logística
  fromWarehouseId: string;
  carrier?: string;
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  
  // Dirección
  toAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  
  // Coste
  cost?: number;
  
  // Holded
  holdedDeliverynoteId?: string;
  
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}
```

---

## 7) ENTIDADES DE PRODUCCIÓN

### 7.1 `productionOrders` (Órdenes de Producción)

```typescript
{
  id: string;
  code?: string;
  
  // Estado
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  
  // Receta
  recipeId?: string;
  
  // Output
  outputSku: string;
  outputQty: number;
  uom: string;
  
  // BOM (snapshot)
  bom: Array<{
    sku: string;
    qty: number;
    uom: string;
  }>;
  
  // Timing
  plannedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

---

### 7.2 `lots` (Lotes de Producción)

```typescript
{
  id: string;
  lotNumber: string;
  sku: string;
  
  // Cantidad
  qtyMade: number;
  uom: string;
  
  // Fechas
  mfgDate: string;
  expDate?: string;
  bestBeforeMonths?: number;
  
  // QC
  qcStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
  
  // Ubicación inicial
  warehouseId?: string;
  
  // Trazabilidad
  eanBatchCode?: string;
  genealogy?: {
    parents?: string[];         // Lotes input
    children?: string[];        // Lotes derivados
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 7.3 `qcTests` (Tests de Calidad)

```typescript
{
  id: string;
  lotNumber: string;
  sku: string;
  
  // Tipo de test
  kind: 'MICRO' | 'PH' | 'BRIX' | 'ORGANOLEPTIC' | 'LABELING' | 'OTHER';
  
  // Resultado
  result: 'PASS' | 'FAIL' | 'NA';
  value?: number | string;
  units?: string;
  
  // Cuándo
  takenAt: string;
  byUserId: string;
  
  notes?: string;
  
  createdAt: string;
}
```

---

### 7.4 `qcBatchResults` (Resultados Finales QC)

```typescript
{
  id: string;
  lotNumber: string;
  
  // Decisión final
  final: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
  
  decidedAt?: string;
  decidedBy?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 8) ENTIDADES DE RRHH

### 8.1 `hr/employees` (Empleados)

```typescript
{
  id: string;
  userId?: string;              // Link a teams
  
  // Datos personales
  fullName: string;
  email?: string;
  phone?: string;
  
  // Fechas
  hireDate?: string;
  leaveDate?: string;
  
  // Organización
  role: string;
  department: 'VENTAS' | 'MARKETING' | 'OPS' | 'PRODUCCION' | 'FIN' | 'HR';
  managerId?: string;
  
  // Nómina
  payrollRef?: string;
  costCenter?: string;
  baseLocation?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 8.2 `hr/timeOff` (Ausencias/Vacaciones)

```typescript
{
  id: string;
  employeeId: string;
  
  // Tipo
  kind: 'VAC' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
  
  // Periodo
  from: string;
  to: string;
  days: number;
  
  // Estado
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  
  // Aprobación
  approvedBy?: string;
  approvedAt?: string;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 8.3 `hr/commissions` (Comisiones)

```typescript
{
  id: string;
  employeeId: string;
  
  // Periodo
  period: {
    year: number;
    month: number;
  };
  
  // Base de cálculo
  basis: 'REVENUE' | 'MARGIN' | 'NEW_ACCOUNTS' | 'MIXED';
  pct: number;
  
  // Cálculo
  computedAt?: string;
  amount?: number;
  
  // Desglose
  breakdown?: Array<{
    accountId: string;
    orderId: string;
    base: number;
    commission: number;
  }>;
  
  // Pago
  paidAt?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 9) INTEGRACIONES

### 9.1 Arquitectura de Integración

```
┌─────────────────┐
│  SANTA BRISA    │
│     (SSOT)      │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬──────────┐
    │         │            │          │
┌───▼──┐  ┌──▼───┐  ┌────▼───┐  ┌───▼────┐
│Holded│  │Shopify│ │Google  │  │Scraper │
│ API  │  │  API  │ │Places  │  │ Jobs   │
└──────┘  └───────┘ └────────┘  └────────┘
```

---

### 9.2 `holded_*_mirror` (Espejos de Holded)

Colecciones que mantienen copia de datos de Holded:

```typescript
// holded_contacts_mirror
{
  id: string;
  holdedId: string;
  name: string;
  tradename?: string;
  vat?: string;
  type: 'customer' | 'supplier' | 'both';
  // ... campos completos de HoldedContact
  lastSyncAt: string;
  syncStatus: 'OK' | 'ERROR';
}

// holded_products_mirror
{
  id: string;
  holdedId: string;
  sku: string;
  name: string;
  // ... campos completos de HoldedProduct
  lastSyncAt: string;
}

// holded_documents_mirror
{
  id: string;
  holdedId: string;
  type: 'estimate' | 'salesorder' | 'invoice' | 'deliverynote';
  docNumber: string;
  // ... campos completos de HoldedDocument
  lastSyncAt: string;
}

// holded_payments_mirror
{
  id: string;
  holdedId: string;
  date: string;
  amount: number;
  // ... campos completos de HoldedPayment
  lastSyncAt: string;
}
```

---

### 9.3 `holded_webhook_log` (Log de Webhooks)

```typescript
{
  id: string;
  event: string;          // 'estimate.created', 'invoice.paid', etc.
  holdedId: string;       // ID de la entidad en Holded
  payload: any;           // Payload completo
  receivedAt: string;
  processedAt?: string;
  status: 'PENDING' | 'PROCESSED' | 'ERROR';
  error?: string;
  retries?: number;
}
```

---

### 9.4 `integration_jobs` (Jobs ETL)

```typescript
{
  id: string;
  kind: 'SYNC_CONTACTS' | 'SYNC_PRODUCTS' | 'SYNC_DOCUMENTS' | 'SYNC_PAYMENTS';
  direction: 'PULL' | 'PUSH';
  
  // Ejecución
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  startedAt?: string;
  completedAt?: string;
  
  // Resultados
  stats?: {
    total: number;
    created: number;
    updated: number;
    errors: number;
  };
  
  errorMsg?: string;
  retries?: number;
  nextRetryAt?: string;
  
  createdAt: string;
}
```

---

### 9.5 `enrichmentJobs` (Jobs de Enriquecimiento)

```typescript
{
  id: string;
  kind: 'GOOGLE_PLACES' | 'SCRAPE' | 'GEOCODE';
  target: 'account' | 'contact';
  targetId: string;
  
  // Estado
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  
  // Datos
  payload?: any;
  result?: any;
  
  // Ejecución
  lastRunAt?: string;
  errorMsg?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 9.6 `auditLogs` (Auditoría)

```typescript
{
  id: string;
  actorId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SYNC';
  entity: 'orders' | 'accounts' | 'items' | 'lots' | '...';
  entityId: string;
  
  // Cambios
  diff?: {
    before?: any;
    after?: any;
  };
  
  // Contexto
  source?: 'UI' | 'API' | 'SYNC' | 'IMPORT' | 'SCRIPT';
  
  createdAt: string;
}
```

---

## 10) ENUMS CANÓNICOS

### 10.1 Segmentos y Clasificación

```typescript
// Segmentos de cuenta
export type Segment = 
  | 'HORECA'          // Hoteles, Restaurantes, Cafeterías
  | 'RETAIL'          // Tiendas minoristas
  | 'DISTRIBUIDOR'    // Distribuidores mayoristas
  | 'IMPORTADOR'      // Importadores internacionales
  | 'PRIVADA'         // Venta privada/directa
  | 'ONLINE';         // E-commerce

// Etapas de cuenta
export type Stage = 
  | 'POTENCIAL'       // Prospecto
  | 'SEGUIMIENTO'     // En seguimiento activo
  | 'ACTIVA'          // Cliente activo
  | 'FALLIDA'         // Oportunidad perdida
  | 'CERRADA'         // Cerrada sin éxito
  | 'BAJA';           // Cliente dado de baja

// Flujo comercial
export type CommercialFlow = 
  | 'DIRECTA'         // Venta directa
  | 'COLOCACION'      // A través de distribuidor
  | 'AMBOS';          // Mixto
```

---

### 10.2 Operaciones y Estados

```typescript
// Estados de pedido
export type OrderStatus = 
  | 'BORRADOR'
  | 'ABIERTO'
  | 'EN_PROCESO'
  | 'SERVIDO'
  | 'FACTURADO'
  | 'PAGADO'
  | 'CANCELADO';

// Estados de envío
export type ShipmentStatus = 
  | 'DRAFT'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

// Tipos de movimiento de stock
export type StockMoveType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';

// Razones de movimiento
export type StockMoveReason = 
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'PRODUCTION'
  | 'CONSUMPTION'
  | 'LOSS'
  | 'OTHER';
```

---

### 10.3 Producción y Calidad

```typescript
// Estados de producción
export type ProductionStatus = 
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

// Estados QC
export type QCStatus = 
  | 'PENDING'
  | 'PASSED'
  | 'FAILED'
  | 'WAIVED';

// Tipos de test
export type QCTestKind = 
  | 'MICRO'
  | 'PH'
  | 'BRIX'
  | 'ORGANOLEPTIC'
  | 'LABELING'
  | 'OTHER';
```

---

### 10.4 Marketing y Eventos

```typescript
// Tipos de evento
export type EventKind = 
  | 'DEMO'
  | 'FERIA'
  | 'FORMACION'
  | 'POS'
  | 'ONLINE'
  | 'OTRO';

// Tipos de PLV
export type PlvKind = 
  | 'SHELF_TALKER'
  | 'STANDEE'
  | 'FRIDGE_STICKER'
  | 'HANGING'
  | 'GONDOLA'
  | 'OTHER';

// Canales online
export type OnlineChannel = 
  | 'META'
  | 'GOOGLE'
  | 'TIKTOK'
  | 'EMAIL'
  | 'OTHER';
```

---

### 10.5 Departamentos y Roles

```typescript
// Departamentos
export type Department = 
  | 'VENTAS'
  | 'MARKETING'
  | 'OPS'
  | 'PRODUCCION'
  | 'FIN'
  | 'HR'
  | 'OTRO';

// Roles de usuario
export type UserRole = 
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'MKT'
  | 'OPS'
  | 'FIN'
  | 'HR'
  | 'PRODUCCION';
```

---

## 11) MAPEO CON HOLDED

### 11.1 Contacts ↔ Accounts

```typescript
// HOLDED → SANTA BRISA
HoldedContact → Account + Contact
{
  // Account
  id: generateId(),
  name: holdedContact.name,
  legalName: holdedContact.tradename,
  vat: holdedContact.vatnumber,
  segment: inferSegment(holdedContact.tags),
  stage: 'ACTIVA',
  
  billingAddress: holdedContact.billing,
  shippingAddress: holdedContact.shipping,
  
  paymentMethodDefault: holdedContact.paymentMethod,
  paymentDaysDefault: holdedContact.paymentDays,
  discountDefaultPct: holdedContact.discount,
  iban: holdedContact.iban,
  
  holdedContactId: holdedContact.id,
  holdedUpdatedAt: holdedContact.updatedAt,
  
  // Contact (si hay email/phone)
  mainContactName: holdedContact.name,
  mainContactEmail: holdedContact.email,
  mainContactPhone: holdedContact.phone,
}

// SANTA BRISA → HOLDED
Account → HoldedContact
{
  id: account.holdedContactId || createInHolded(),
  name: account.name,
  tradename: account.legalName,
  vatnumber: account.vat,
  
  billing: account.billingAddress,
  shipping: account.shippingAddress,
  
  paymentMethod: account.paymentMethodDefault,
  paymentDays: account.paymentDaysDefault,
  discount: account.discountDefaultPct,
  iban: account.iban,
  
  tags: [account.segment, ...account.tags],
}
```

---

### 11.2 Products ↔ Items

```typescript
// HOLDED → SANTA BRISA
HoldedProduct → Item
{
  id: generateId(),
  name: holdedProduct.name,
  sku: holdedProduct.sku,
  gtin: holdedProduct.barcode ? [holdedProduct.barcode] : undefined,
  
  kind: holdedProduct.type === 'service' ? 'SERVICE' : 'PRODUCT',
  uom: mapUom(holdedProduct.unit),
  
  trackStock: holdedProduct.trackStock,
  trackBatches: holdedProduct.trackBatches,
  trackSerials: holdedProduct.trackSerials,
  
  msrp: holdedProduct.price,
  cost: holdedProduct.cost,
  defaultTaxPct: holdedProduct.tax,
  
  images: holdedProduct.images,
  
  holdedProductId: holdedProduct.id,
  holdedUpdatedAt: holdedProduct.updatedAt,
}

// SANTA BRISA → HOLDED
Item → HoldedProduct
{
  id: item.holdedProductId || createInHolded(),
  name: item.name,
  sku: item.sku,
  barcode: item.gtin?.[0],
  
  type: item.kind === 'SERVICE' ? 'service' : 'product',
  unit: item.uom,
  
  trackStock: item.trackStock,
  trackBatches: item.trackBatches,
  trackSerials: item.trackSerials,
  
  price: item.msrp || item.price,
  cost: item.cost,
  tax: item.defaultTaxPct,
}
```

---

### 11.3 Documents ↔ Orders

```typescript
// HOLDED ESTIMATE → Order
HoldedEstimate → Order
{
  id: generateId(),
  orderNumber: holdedEstimate.docNumber,
  
  accountId: findAccountByHoldedId(holdedEstimate.contactId),
  
  documentType: 'ESTIMATE',
  channel: 'DIRECTA',
  source: 'Holded',
  
  date: holdedEstimate.date,
  dueDate: holdedEstimate.validityDate,
  
  status: mapEstimateStatus(holdedEstimate.status),
  
  items: holdedEstimate.items.map(item => ({
    sku: findSkuByHoldedId(item.productId),
    qty: item.units,
    unitPrice: item.price,
    discountPct: item.discount,
    taxPct: item.tax,
  })),
  
  total: holdedEstimate.total,
  currency: 'EUR',
  
  holded: {
    documentId: holdedEstimate.id,
    type: 'estimate',
    number: holdedEstimate.docNumber,
    updatedAt: holdedEstimate.updatedAt,
  },
}

// Similar para INVOICE, SALESORDER, DELIVERYNOTE
```

---

### 11.4 Payments (Read-Only desde Holded)

```typescript
// HOLDED → payments_mirror
HoldedPayment → PaymentMirror
{
  id: generateId(),
  holdedId: holdedPayment.id,
  
  date: holdedPayment.date,
  amount: holdedPayment.amount,
  type: holdedPayment.type,
  method: holdedPayment.method,
  
  documentId: findOrderByHoldedDocId(holdedPayment.documentId),
  contactId: findAccountByHoldedContactId(holdedPayment.contactId),
  
  status: holdedPayment.status,
  reconciled: holdedPayment.reconciled,
  
  lastSyncAt: new Date().toISOString(),
}
```

---

## 12) ÍNDICES Y PERFORMANCE

### 12.1 Índices Críticos

```typescript
// ACCOUNTS
accounts: [
  ['segment', 'stage'],
  ['salesRepId', 'stage'],
  ['holdedContactId'],
  ['vat'],
]

// ORDERS
orders: [
  ['accountId', 'date'],
  ['status', 'date'],
  ['channel', 'date'],
  ['holded.documentId'],
  ['createdBy', 'date'],
]

// ITEMS
items: [
  ['sku'],
  ['gtin'],
  ['holdedProductId'],
  ['active'],
]

// ONHAND
onHand: [
  ['warehouseId', 'sku'],
  ['sku', 'qty'],
]

// STOCKMOVES
stockMoves: [
  ['date', 'warehouseId'],
  ['documentRef.kind', 'documentRef.id'],
  ['items.sku'],
]

// LOTS
lots: [
  ['lotNumber'],
  ['sku', 'mfgDate'],
  ['qcStatus'],
  ['expDate'],
]

// INTERACTIONS
interactions: [
  ['accountId', 'when'],
  ['createdBy', 'when'],
  ['dept', 'status'],
]

// POSTACTICS
posTactics: [
  ['accountId', 'status'],
  ['createdBy', 'createdAt'],
]
```

---

### 12.2 Vistas Materializadas

```typescript
// onHand - Actualizada por triggers en stockMoves
// Calcula qty disponible por warehouse + sku

// accountStage - Calculada por servicio
// Infiere stage basado en:
// - Última interacción
// - Último pedido
// - Estado de oportunidades

// salesKpis - Calculada diariamente
// Agrega métricas de ventas por:
// - Usuario
// - Periodo
// - Segment/Channel
```

---

## 13) FLUJOS DE DATOS

### 13.1 Flujo de Venta Directa

```
1. Cliente creado en CRM
   ↓
2. Sincronizado con Holded (Contact)
   ↓
3. Presupuesto en Holded (Estimate)
   ↓ Webhook
4. Order en CRM (documentType=ESTIMATE)
   ↓ Cliente acepta
5. Pedido en Holded (Salesorder)
   ↓ Webhook
6. Order actualizada (documentType=SALESORDER)
   ↓
7. Producción si necesario
   ↓
8. Albarán en Holded (Deliverynote)
   ↓ Webhook
9. Shipment en CRM
   ↓ StockMove (OUT)
10. Factura en Holded (Invoice)
   ↓ Webhook
11. Order actualizada (documentType=INVOICE)
   ↓ Cliente paga
12. Payment en Holded
   ↓ Webhook/Sync
13. payments_mirror actualizado
```

---

### 13.2 Flujo de Sell-Out (Colocación)

```
1. Distribuidor reporta ventas
   ↓ CSV/API/Email
2. orderSellOut creada (status=RECEIVED)
   ↓ Validación
3. orderSellOut validada (status=VALIDATED)
   ↓
4. KPIs de sell-out actualizados
   ↓
5. Dashboard distribuidor refleja ventas
   ↓ (opcional)
6. Reposición automática si threshold
```

---

### 13.3 Flujo de Producción

```
1. ProductionOrder creada (status=PLANNED)
   ↓
2. Reserva de materias primas
   ↓
3. ProductionOrder iniciada (status=IN_PROGRESS)
   ↓
4. Consumo de materiales → StockMove (OUT)
   ↓
5. Producción completa → Lot creado
   ↓
6. QC Tests realizados
   ↓
7. qcBatchResults → final='PASSED'
   ↓
8. Lot liberado (qcStatus='PASSED')
   ↓
9. Stock IN → StockMove (IN)
   ↓
10. onHand actualizado
```

---

### 13.4 Flujo de Sincronización Holded

```
PUSH (CRM → Holded):
1. Account creada/actualizada en CRM
   ↓
2. integration_jobs creado (PUSH_CONTACTS)
   ↓
3. API call a Holded
   ↓
4. Contact creado/actualizado en Holded
   ↓
5. holdedContactId guardado en Account
   ↓
6. holded_contacts_mirror actualizado

PULL (Holded → CRM):
1. Webhook de Holded recibido
   ↓
2. holded_webhook_log creado
   ↓
3. integration_jobs creado (PULL_DOCUMENTS)
   ↓
4. Fetch documento de Holded
   ↓
5. Order creada/actualizada en CRM
   ↓
6. holded_documents_mirror actualizado
```

---

## 14) PLAN DE MIGRACIÓN

### 14.1 Fase 1: Preparación (Semana 1-2)

**Objetivos:**
- Documentar estado actual
- Crear colecciones nuevas
- Setup de integración Holded

**Tareas:**

```typescript
// 1. Crear nuevas collections vacías
await createCollection('holded_contacts_mirror');
await createCollection('holded_products_mirror');
await createCollection('holded_documents_mirror');
await createCollection('holded_payments_mirror');
await createCollection('holded_webhook_log');
await createCollection('integration_jobs');
await createCollection('enrichmentJobs');
await createCollection('auditLogs');

// 2. Backup completo
await backupFirestore();

// 3. Documentar mapeos
await generateMappingDocs();
```

**Checklist:**
- [ ] Backup de Firestore completo
- [ ] Collections nuevas creadas
- [ ] Índices configurados
- [ ] API keys de Holded configuradas
- [ ] Webhooks de Holded configurados
- [ ] Documentación de mapeos lista

---

### 14.2 Fase 2: Sincronización Inicial (Semana 3-4)

**Objetivos:**
- Sincronizar datos existentes con Holded
- Validar mapeos
- Testing de integración

**Script de migración:**

```typescript
// scripts/migrate-to-holded-ssot.ts

async function migrateToHoldedSSOT() {
  console.log('🚀 Iniciando migración a Holded SSOT v7...');
  
  // PASO 1: Sincronizar Contactos
  console.log('📞 Sincronizando contactos...');
  const accounts = await getAllAccounts();
  
  for (const account of accounts) {
    try {
      // Buscar en Holded por VAT/CIF
      const holdedContact = await findHoldedContactByVat(account.vat);
      
      if (holdedContact) {
        // Ya existe, actualizar referencia
        await updateAccount(account.id, {
          holdedContactId: holdedContact.id,
          holdedUpdatedAt: holdedContact.updatedAt,
        });
      } else {
        // No existe, crear en Holded
        const newContact = await createHoldedContact({
          name: account.name,
          tradename: account.legalName,
          vatnumber: account.vat,
          billing: account.billingAddress,
          shipping: account.shippingAddress,
          // ...
        });
        
        await updateAccount(account.id, {
          holdedContactId: newContact.id,
          holdedUpdatedAt: newContact.updatedAt,
        });
      }
      
      console.log(`✅ Account ${account.name} sincronizada`);
    } catch (error) {
      console.error(`❌ Error con ${account.name}:`, error);
    }
  }
  
  // PASO 2: Sincronizar Productos
  console.log('📦 Sincronizando productos...');
  const items = await getAllItems();
  
  for (const item of items) {
    try {
      const holdedProduct = await findHoldedProductBySku(item.sku);
      
      if (holdedProduct) {
        await updateItem(item.id, {
          holdedProductId: holdedProduct.id,
          holdedUpdatedAt: holdedProduct.updatedAt,
        });
      } else {
        const newProduct = await createHoldedProduct({
          name: item.name,
          sku: item.sku,
          price: item.msrp,
          cost: item.cost,
          // ...
        });
        
        await updateItem(item.id, {
          holdedProductId: newProduct.id,
          holdedUpdatedAt: newProduct.updatedAt,
        });
      }
      
      console.log(`✅ Item ${item.sku} sincronizado`);
    } catch (error) {
      console.error(`❌ Error con ${item.sku}:`, error);
    }
  }
  
  // PASO 3: Migrar Orders existentes
  console.log('📝 Migrando orders...');
  await migrateOrders();
  
  // PASO 4: Pull inicial de documentos de Holded
  console.log('⬇️  Pulling documentos de Holded...');
  await pullHoldedDocuments();
  
  console.log('✅ Migración completada!');
}

async function migrateOrders() {
  const orders = await getAllOrders();
  
  for (const order of orders) {
    // Determinar documentType basado en datos actuales
    const documentType = inferDocumentType(order);
    
    await updateOrder(order.id, {
      documentType,
      holded: order.holded || {},
    });
  }
}

function inferDocumentType(order: any): string {
  // Si tiene holdedInvoiceId → INVOICE
  if (order.holded?.invoiceId || order.holdedInvoiceId) {
    return 'INVOICE';
  }
  
  // Si status = PAGADO o FACTURADO → INVOICE
  if (['PAGADO', 'FACTURADO'].includes(order.status)) {
    return 'INVOICE';
  }
  
  // Si status = SERVIDO o SHIPPED → SALESORDER
  if (['SERVIDO', 'SHIPPED', 'EN_PROCESO'].includes(order.status)) {
    return 'SALESORDER';
  }
  
  // Si status = ABIERTO → ESTIMATE
  if (order.status === 'ABIERTO') {
    return 'ESTIMATE';
  }
  
  // Default
  return 'SALESORDER';
}
```

**Checklist:**
- [ ] Accounts sincronizadas con Holded Contacts
- [ ] Items sincronizados con Holded Products
- [ ] Orders migradas con documentType
- [ ] Espejos (_mirror) poblados
- [ ] Validación de datos OK
- [ ] Testing de sincronización bidireccional

---

### 14.3 Fase 3: Activación de Webhooks (Semana 5)

**Objetivos:**
- Activar webhooks de Holded
- Testing de flujo en tiempo real
- Monitoreo de logs

**Webhooks a configurar:**

```json
{
  "events": [
    "estimate.created",
    "estimate.updated",
    "estimate.accepted",
    "salesorder.created",
    "salesorder.updated",
    "invoice.created",
    "invoice.updated",
    "invoice.paid",
    "deliverynote.created",
    "contact.created",
    "contact.updated",
    "product.created",
    "product.updated",
    "payment.created",
    "payment.completed"
  ],
  "url": "https://your-domain.com/api/integrations/holded/webhooks"
}
```

**Checklist:**
- [ ] Webhooks configurados en Holded
- [ ] Endpoint de webhooks testeado
- [ ] holded_webhook_log funcionando
- [ ] Procesamiento automático OK
- [ ] Alertas de errores configuradas

---

### 14.4 Fase 4: Enriquecimiento (Semana 6)

**Objetivos:**
- Activar jobs de enriquecimiento
- Google Places integration
- Validación de datos

**Script de enriquecimiento:**

```typescript
// scripts/enrich-accounts.ts

async function enrichAllAccounts() {
  const accounts = await getAllAccounts();
  
  for (const account of accounts) {
    // Skip si ya tiene enrichment reciente
    if (account.enrichment?.lastCheckedAt) {
      const daysSince = daysSince(account.enrichment.lastCheckedAt);
      if (daysSince < 30) continue;
    }
    
    await createEnrichmentJob({
      kind: 'GOOGLE_PLACES',
      target: 'account',
      targetId: account.id,
      status: 'PENDING',
    });
  }
  
  console.log('✅ Enrichment jobs creados');
}
```

**Checklist:**
- [ ] Google Places API configurada
- [ ] Enrichment jobs funcionando
- [ ] Datos de ubicación añadidos
- [ ] Fotos y ratings capturados

---

### 14.5 Fase 5: Cutover (Semana 7-8)

**Objetivos:**
- Switch completo a nuevo SSOT
- Deprecar código legacy
- Formación de equipo

**Cambios en código:**

```typescript
// ANTES (legacy)
const orders = await getOrdersSellOut();

// DESPUÉS (v7)
const estimates = await getOrders({ documentType: 'ESTIMATE' });
const salesOrders = await getOrders({ documentType: 'SALESORDER' });
const invoices = await getOrders({ documentType: 'INVOICE' });
```

**Checklist:**
- [ ] Todo el equipo formado
- [ ] UI actualizada
- [ ] Dashboards funcionando con nuevo SSOT
- [ ] Legacy code deprecado
- [ ] Documentación actualizada
- [ ] Go-live! 🚀

---

### 14.6 Rollback Plan

**Si algo sale mal:**

```typescript
// 1. Restaurar backup
await restoreFirestoreBackup(backupDate);

// 2. Desactivar webhooks
await disableHoldedWebhooks();

// 3. Revertir código
await gitCheckout('pre-migration-tag');

// 4. Notificar equipo
await notifyTeam('Rollback ejecutado - usando sistema legacy');
```

---

## RESUMEN EJECUTIVO

### ✅ Lo que logramos con SSOT v7:

1. **Integración Holded limpia y bidireccional**
   - Sincronización automática de contactos, productos, documentos
   - Holded como SSOT para facturación y pagos
   - CRM como SSOT para producción, stock, marketing

2. **Modelo de datos completo y extensible**
   - 30+ entidades documentadas
   - Consigna formal
   - Marketing completo (PLV, activaciones, ROI)
   - RRHH básico
   - Trazabilidad 360º

3. **Enriquecimiento automático**
   - Google Places integration
   - Scraping de datos públicos
   - Validación automática

4. **Auditoría y compliance**
   - Soft-delete en todas las entidades
   - Audit logs completos
   - Trazabilidad de cambios

### 📊 Métricas de éxito:

- **100%** sincronización Holded ↔ CRM
- **< 5 min** latencia en webhooks
- **> 95%** datos enriquecidos
- **0** pérdida de datos en migración

### 🎯 Próximos pasos:

1. Revisar y aprobar este documento
2. Toggle a Act Mode para generar TypeScript interfaces
3. Comenzar Fase 1 de migración
4. Sprint planning para implementación

---

**Fin del documento SSOT v7**

📅 **Fecha:** 9
