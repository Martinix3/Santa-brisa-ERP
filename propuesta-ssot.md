# Propuesta de Arquitectura de Datos (SSOT) - V5 (Party-Role, Trazabilidad, Costes y Gastos)

Este documento presenta una arquitectura de datos unificada y completa. Se basa en el patrón "Party-Role" para una gestión de contactos sin duplicados y añade capas robustas para la trazabilidad, la gestión de calidad, la integración con sistemas externos como Holded y un sistema de codificación y costeo centralizado.

---

## 1. Principios de Diseño

*   **Contacto Único (Party)**: Una persona u organización (un CIF/NIF) solo existe una vez, en la entidad `Party`.
*   **Roles sobre Contactos**: Un `Party` puede tener múltiples roles (`CUSTOMER`, `SUPPLIER`, `EMPLOYEE`). Cada rol se almacena en `PartyRole` y contiene los datos específicos de esa relación.
*   **Holded como Maestro Contable**: El CRM no duplica la contabilidad. Almacena referencias (IDs) a documentos de Holded (facturas, albaranes, gastos) para enriquecer la vista de negocio.
*   **Trazabilidad Extremo a Extremo**: Cada movimiento y transformación de un lote, desde la materia prima hasta la entrega al cliente, se registra a través de `StockMove` y `TraceEvent`.
*   **Gestión de Incidencias**: Cualquier desviación (calidad, logística) se registra en una entidad `Incident`, permitiendo su seguimiento y resolución.
*   **Codificación Centralizada**: Las reglas para generar códigos legibles (SKUs, códigos de cliente, números de lote) se definen en un único lugar para garantizar la consistencia.
*   **Modelo de Costes Conectado**: Cada euro gastado (COGS y OPEX) se enlaza a un "objeto de coste" (producto, lote, campaña, evento, cliente, departamento) para un análisis financiero preciso.

---

## 2. Tipos Primitivos y Enums

```typescript
// --- Tipos Generales ---
export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR';

// Departamentos internos
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD';

// --- Roles y Estados ---
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';

// Estados para flujos de trabajo
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export type ProductionStatus = 'planned' | 'released' | 'wip' | 'done' | 'cancelled';
export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
```

---

## 3. Entidades Centrales: Party y Roles

```typescript
// --- CONTACTO UNIFICADO (PARTY) ---
// Representa a una persona u organización única. Es el maestro de contactos.
export interface Party {
  id: string;             // ID interno inmutable (UUID)
  code?: string;          // Código legible (ej. PTY-000123)
  kind: 'ORG' | 'PERSON';
  name: string;
  taxId?: string; // CIF, NIF, VAT ID. Clave de unicidad.

  // --- Datos de Contacto (Array) ---
  contacts: {
    type: 'email' | 'phone' | 'whatsapp' | 'web';
    value: string; isPrimary?: boolean; description?: string;
  }[];
  addresses: { type: 'main' | 'billing' | 'shipping'; street: string; city: string; postalCode?: string; country: string; isPrimary?: boolean; }[];
  
  // --- Identidades Digitales ---
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  
  // --- Metadatos ---
  tags?: string[];
  createdAt: string;
  holdedContactId?: string; // ID 1:1 con el Contacto en Holded
}

// --- ROLES DE LA PARTY ---
// Define la relación de negocio que tenemos con una Party.
export interface PartyRole {
    id: string;
    partyId: string;        // Vínculo a la Party
    role: PartyRoleType;    // El tipo de relación que es
    isActive: boolean;
    data: CustomerData | SupplierData | InfluencerData | EmployeeData; // Datos específicos del rol
    createdAt: string;
}

// --- Interfaces para los datos de cada rol ---
export interface CustomerData {
    priceListId?: string;
    paymentTermsDays?: number;
    salesRepId: string;       // ID del User responsable
    billerId: string;         // 'SB' o un ID de distribuidor
}
export interface SupplierData {
    paymentTermsDays?: number;
    bankAccountNumber?: string;
}
export interface InfluencerData {
    tier: 'nano' | 'micro' | 'mid' | 'macro';
    audienceSize?: number;
}
export interface EmployeeData {
    department: Department;
    managerId?: string;
    startDate: string;
}
```

---

## 4. Entidades de Negocio (CRM y Ventas)

```typescript
// --- CUENTAS DE CLIENTE (CRM) ---
// Representa una oportunidad de venta o un pipeline con un cliente (Party con rol CUSTOMER).
export interface Account {
  id: string;
  code?: string;        // Código legible (ej. ACC-000123)
  partyId: string;      // Vinculado a una Party
  name: string;         // Denormalizado de Party para facilidad de uso
  type: AccountType;    // HORECA, RETAIL...
  stage: Stage;
  subType?: string;      // Ej. "Bar de copas", "Restaurante de autor"
  ownerId: string;        // ID del User o Distributor responsable de la venta
  createdAt: string;
  updatedAt?: string;
  lastInteractionAt?: string;
  notes?: string;
}

// --- PEDIDOS DE VENTA ---
export interface OrderSellOut { 
  id: string;
  docNumber?: string;   // Número de pedido legible (ej. ORD-SB-202409-0042)
  accountId: string;
  lines: { sku: string; qty: number; uom: 'uds'; priceUnit: number; discount?: number; lotIds?: string[]; }[];
  status: OrderStatus;
  createdAt: string;
  currency: 'EUR';
  totalAmount?: number;
  notes?: string;
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  holdedDocId?: string;
  holdedDocType?: 'estimate' | 'order' | 'delivery' | 'invoice';
}

// --- INTERACCIONES ---
// Registra cualquier contacto (visita, llamada, etc.) con una Party.
export interface Interaction {
  id:string;
  partyId?: string;     // Para registrar llamadas a proveedores, etc.
  accountId?: string;   // Para interacciones comerciales con clientes
  userId: string;
  dept?: Department;    // Ahora incluye 'CALIDAD'
  kind: 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
  note?: string;
  plannedFor?: string;
  createdAt: string;
  status: InteractionStatus;
  resultNote?: string;
}
```

---

## 5. Producción, Calidad y Trazabilidad

```typescript
// --- CATÁLOGOS ---
export interface Material { 
  id: string; 
  sku: string; 
  name: string; 
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising'; 
  uom?: Uom; 
}
export interface Product { 
  id: string; 
  sku: string; 
  name: string; 
  category?: string; 
  bottleMl?: number; 
  caseUnits?: number; 
  casesPerPallet?: number; 
  active: boolean; 
  materialId?: string; 
}

// --- PRODUCCIÓN ---
export interface BillOfMaterial { 
  id: string; 
  sku: string; 
  name: string; 
  items: { materialId: string; quantity: number; unit?: string; }[]; 
  batchSize: number; 
  baseUnit?: string; 
}

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  sku: string;
  bomId: string;
  targetQuantity: number;
  status: ProductionStatus;
  createdAt: string;
  scheduledFor?: string;
  lotId?: string;

  // Planificación vs Realidad
  shortages?: { materialId: string; required: number; available: number; uom: Uom }[];
  reservations?: { materialId: string; fromLot: string; reservedQty: number; uom: Uom }[];
  
  // Costes
  costing?: {
    stdCostPerUom?: number;
    actual?: {
      materials: number;
      labor?: number;
      overhead?: number;
      other?: number;
      total: number;
      perUnit?: number;
      yieldLossPct?: number;
    };
    variance?: {
      materials?: number;
      labor?: number;
      overhead?: number;
      total?: number;
    };
    updatedAt?: string;
  };
}


// --- CALIDAD Y LOTES ---
export type QCResult = { value?: number | string | boolean; notes?: string; status: 'ok' | 'ko'; };
export interface Lot {
  id: string;
  lotCode?: string;      // Código legible (ej. 240915-SB-750-01)
  sku: string;
  quantity: number;
  createdAt: string;
  orderId?: string; // Production Order ID
  supplierId?: string; // For raw materials
  quality: { qcStatus: 'hold' | 'release' | 'reject', results: Record<string, QCResult> };
  expDate?: string;
  receivedAt?: string;
}

// --- INCIDENCIAS (CALIDAD/LOGÍSTICA) ---
export interface Incident {
  id: string;
  kind: IncidentKind;
  status: IncidentStatus;
  openedAt: string;
  closedAt?: string;
  dept?: Department;       // 'CALIDAD' o 'ALMACEN'
  partyId?: string;        // proveedor/cliente implicado
  lotId?: string;
  goodsReceiptId?: string;
  shipmentId?: string;
  orderId?: string;
  description?: string;
  photos?: string[];
  correctiveActions?: { note: string; at: string; byUserId?: string }[];
  notes?: string;
}
```

---

## 6. Almacén y Logística (Trazabilidad)

```typescript
// --- MOVIMIENTOS DE STOCK ---
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship';
export interface StockMove {
  id: string;
  sku: string;
  lotId?: string;           // OBLIGATORIO si SKU es loteable
  uom: Uom;
  qty: number;              // + entrada / - salida
  fromLocation?: string;
  toLocation?: string;
  reason: StockReason;
  occurredAt: string;
  createdAt: string;
  ref?: { orderId?: string; shipmentId?: string; prodOrderId?: string; goodsReceiptId?: string; };
}

// --- ENTRADA DE MERCANCÍA ---
export interface GoodsReceipt {
  id: string;
  receiptNumber?: string;    // Número legible (ej. GR-20240915-001)
  supplierPartyId: string;
  deliveryNote: string;      // Nº albarán proveedor
  holdedBillId?: string;     // factura compra en Holded
  holdedDeliveryId?: string; // albarán en Holded (si aplica)
  receivedAt: string;
  lines: { materialId: string; sku: string; lotId: string; qty: number; uom: Uom; }[];
  status: 'pending_qc' | 'completed' | 'partial';
  incidentIds?: string[];
  notes?: string;
  landedCosts?: {
    kind: 'freight' | 'duty' | 'insurance' | 'other';
    amount: number;
    allocation: 'by_value' | 'by_weight' | 'by_qty';
    notes?: string;
  }[];
}

// --- ENVÍOS / SALIDA DE MERCANCÍA ---
export interface Shipment {
  id: string;
  orderId: string;
  accountId: string;
  shipmentNumber?: string;     // Nº albarán interno
  holdedDeliveryId?: string;
  holdedInvoiceId?: string;    // (si facturas al expedir)
  createdAt: string;
  status: ShipmentStatus;
  lines: { sku: string; name: string; qty: number; unit: 'uds'; lotNumber?: string; }[];
  customerName: string;
  city: string;
  addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string; labelUrl?: string; tracking?: string;
  notes?: string; packedById?: string;
  checks?: { visualOk?: boolean };
}

// --- EVENTOS DE TRAZABILIDAD (LOG) ---
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type TraceEventKind = 'FARM_DATA' | 'SUPPLIER_PO' | 'ARRIVED' | 'BOOKED' | 'CHECK_PASS' | 'CHECK_FAIL' | 'BATCH_PLANNED' | 'BATCH_RELEASED' | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT' | 'PACK_START' | 'PACK_END' | 'MOVE' | 'RESERVE' | 'ORDER_ALLOC' | 'SHIPMENT_PICKED' | 'SHIPPED' | 'DELIVERED';
export interface TraceEvent {
    id: string;
    subject: { type: 'LOT' | 'BATCH' | 'ORDER' | 'SHIPMENT'; id: string; };
    phase: TraceEventPhase;
    kind: TraceEventKind;
    occurredAt: string;
    actorId?: string;
    links?: { lotId?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string; };
    data?: any;
}
```

---

## 7. Marketing, Finanzas y Costes

```typescript
// --- MARKETING EN PUNTO DE VENTA ---
export interface Activation { id: string; accountId: string; materialId: string; description: string; status: 'active' | 'inactive' | 'pending_renewal'; startDate: string; endDate?: string; ownerId: string; }
export interface Promotion { id: string; code?: string; name: string; type: '5+1' | 'BOGO' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED'; value: number; validFrom: string; validTo: string; }

// --- MARKETING GENERAL ---
export interface EventMarketing { id: string; title: string; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; startAt: string; endAt?: string; city?: string; spend?: number; extraCosts?: { description: string; amount: number }[]; linkedActivations?: string[]; linkedPromotions?: string[]; }
export interface OnlineCampaign { id: string; title: string; channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other'; status: 'planned' | 'active' | 'closed' | 'cancelled'; startAt: string; endAt?: string; budget: number; spend: number; metrics?: any; }

// --- INFLUENCERS ---
export interface InfluencerCollab { id: string; supplierPartyId: string; /* ... */ }

// --- GESTIÓN DE COSTES ---
export interface MaterialCost {
  id: string;
  materialId: string;
  currency: 'EUR';
  costPerUom: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

// --- CONTABILIDAD Y GASTOS (Enlaces a Holded) ---
export type HoldedDocType = 'SALES_INVOICE' | 'PURCHASE_BILL' | 'CREDIT_NOTE' | 'EXPENSE';

export type CostObjectKind = 'NONE' | 'PRODUCT' | 'LOT' | 'PROD_ORDER' | 'ACCOUNT' | 'ORDER' | 'SHIPMENT' | 'EVENT' | 'CAMPAIGN' | 'COLLAB' | 'DEPARTMENT';
export type ExpenseCategory = 'COGS_MATERIAL' | 'COGS_FREIGHT' | 'COGS_DUTY' | 'PLV' | 'MARKETING_MEDIA' | 'INFLUENCER' | 'EVENT' | 'TRAVEL' | 'MEALS' | 'ACCOMMODATION' | 'TRANSPORT' | 'SALARIES' | 'SOCIAL_SECURITY' | 'SUBCONTRACTING' | 'OTHER_OPEX';

export interface FinanceLink {
  id: string;
  docType: HoldedDocType;
  externalId: string;
  status: 'paid' | 'pending' | 'overdue';
  netAmount: number; taxAmount: number; grossAmount: number;
  currency: Currency;
  issueDate: string; dueDate: string;
  docNumber?: string;
  partyId?: string;
  expenseCategory?: ExpenseCategory;
  costObject?: { kind: CostObjectKind; id: string };
  allocationPct?: number;
  campaignId?: string; eventId?: string; collabId?: string;
}
export interface PaymentLink { id: string; financeLinkId: string; externalId?: string; amount: number; date: string; method?: string; }
```

---

## 8. Sistema de Codificación Centralizado

```typescript
export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';

export interface CodePolicy {
  entity: CodeEntity;
  template: string; // Ej: 'ACC-{SEQ#6}', '{YY}{MM}{DD}-{SKU}-{SEQ#3}'
  regex: string;
  seqScope?: 'GLOBAL' | 'YEAR' | 'MONTH' | 'DAY';
  pad?: number;
}

export const CODE_POLICIES: Record<CodeEntity, CodePolicy> = {
  PRODUCT:    { entity:'PRODUCT', template:'{SKU}', regex:'^[A-Z0-9_-]{3,32}$'},
  ACCOUNT:    { entity:'ACCOUNT', template:'ACC-{SEQ#6}', regex:'^ACC-\\d{6}$', seqScope:'GLOBAL', pad:6 },
  PARTY:      { entity:'PARTY', template:'PTY-{SEQ#6}', regex:'^PTY-\\d{6}$', seqScope:'GLOBAL', pad:6 },
  SUPPLIER:   { entity:'SUPPLIER', template:'SUP-{SEQ#5}', regex:'^SUP-\\d{5}$', seqScope:'GLOBAL', pad:5 },
  LOT:        { entity:'LOT', template:'{YY}{MM}{DD}-{SKU}-{SEQ#3}', regex:'^\\d{6}-[A-Z0-9_-]+-\\d{3}$', seqScope:'DAY', pad:3 },
  PROD_ORDER: { entity:'PROD_ORDER', template:'PO-{YYYY}{MM}-{SEQ#4}', regex:'^PO-\\d{6}-\\d{4}$', seqScope:'MONTH', pad:4 },
  SHIPMENT:   { entity:'SHIPMENT', template:'SHP-{YYYY}{MM}{DD}-{SEQ#3}', regex:'^SHP-\\d{8}-\\d{3}$', seqScope:'DAY', pad:3 },
  GOODS_RECEIPT:{ entity:'GOODS_RECEIPT', template:'GR-{YYYY}{MM}{DD}-{SEQ#3}', regex:'^GR-\\d{8}-\\d{3}$', seqScope:'DAY', pad:3 },
  LOCATION:   { entity:'LOCATION', template:'{ZONE}-{SEQ#3}', regex:'^[A-Z]{2,6}-\\d{3}$', seqScope:'GLOBAL', pad:3 },
  PRICE_LIST: { entity:'PRICE_LIST', template:'PL-{YYYY}-{SEQ#2}', regex:'^PL-\\d{4}-\\d{2}$', seqScope:'YEAR', pad:2 },
  PROMOTION:  { entity:'PROMOTION', template:'PRM-{YY}{MM}-{SEQ#3}', regex:'^PRM-\\d{4}-\\d{3}$', seqScope:'MONTH', pad:3 },
};

export type ExternalSystem = 'HOLDED'|'SHOPIFY'|'EAN'|'GTIN'|'CUSTOMER_REF'|'SUPPLIER_REF';

export interface CodeAlias {
  id: string;
  entity: CodeEntity;
  entityId: string;
  system: ExternalSystem;
  code: string;
  createdAt: string;
}
```

---

## 9. Colección de Datos Completa `SantaData`

```typescript
export interface SantaData {
  // Catálogos principales
  parties: Party[];
  partyRoles: PartyRole[];
  users: User[];
  
  // CRM y Ventas
  accounts: Account[];
  ordersSellOut: OrderSellOut[];
  interactions: Interaction[];
  
  // Producción y Calidad
  products: Product[];
  materials: Material[];
  billOfMaterials: BillOfMaterial[];
  productionOrders: ProductionOrder[];
  lots: Lot[];
  qaChecks: QACheck[]; // Asumiendo que se creará esta entidad
  
  // Logística y Almacén
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  
  // Marketing
  activations: Activation[];
  promotions: Promotion[];
  events: EventMarketing[];
  onlineCampaigns: OnlineCampaign[];
  influencerCollabs: InfluencerCollab[];
  
  // Finanzas y Contabilidad
  materialCosts: MaterialCost[];
  financeLinks: FinanceLink[];
  paymentLinks: PaymentLink[];
  
  // Registros de Auditoría y Trazabilidad
  traceEvents: TraceEvent[];
  incidents: Incident[];

  // Códigos y Aliases
  codeAliases: CodeAlias[];
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
    'parties', 'partyRoles', 'users', 'accounts', 'ordersSellOut', 'interactions',
    'products', 'materials', 'billOfMaterials', 'productionOrders', 'lots', 'qaChecks',
    'inventory', 'stockMoves', 'shipments', 'goodsReceipts', 'activations', 'promotions',
    'events', 'onlineCampaigns', 'influencerCollabs', 'materialCosts', 'financeLinks', 
    'paymentLinks', 'traceEvents', 'incidents', 'codeAliases'
];
```

---

## 10. Lógica de Negocio y Hooks Operativos

Esta sección describe las reglas de negocio y los "hooks" (disparadores automáticos) que el sistema debe implementar para mantener la integridad de los datos.

### 10.1. Invariantes del Sistema (Reglas de Oro)

*   No se puede vender o expedir (`ship`/`sale`) un `Lot` cuyo `quality.qcStatus` no sea `'release'`.
*   Un `Shipment` no puede pasar a `'ready_to_ship'` si alguna de sus líneas de producto loteable no tiene un `lotNumber` asignado.
*   Un `GoodsReceipt` no puede pasar a `'completed'` hasta que todos sus lotes hayan pasado el QC de entrada (`'release'`) o se haya abierto un `Incident` asociado.
*   La suma de todos los `StockMove` para un `lotId` específico debe ser igual a la cantidad `onHand` de ese lote en el `inventory` (considerando las reservas).

### 10.2. Hooks por Proceso de Negocio

#### **Entrada de Mercancía**
*   **`onGoodsReceiptCreated`**:
    *   Crea un `StockMove` de tipo `'receipt'` para cada línea, aumentando el stock en una ubicación de cuarentena (ej. `'QC/AREA'`).
    *   Crea un `TraceEvent` de tipo `'ARRIVED'` para cada lote.

#### **Control de Calidad (QC)**
*   **`onQACheckReviewed`**:
    *   Actualiza el `quality.qcStatus` del `Lot` a `'release'` o `'reject'`.
    *   Crea un `TraceEvent` (`'CHECK_PASS'` o `'CHECK_FAIL'`).
    *   Si es `'FAIL'`, crea un `Incident`.
    *   Si es `'PASS'` y el lote estaba en `'QC/AREA'`, genera un `StockMove` de tipo `'transfer'` al almacén principal.

#### **Producción**
*   **`onProductionOrderCreated`**:
    *   Estado inicial `'planned'`. Calcula `shortages` comparando el `BillOfMaterial` con el `inventory` disponible.
    *   Genera `reservations` para el material que sí está disponible.
    *   Emite `TraceEvent` de tipo `'BATCH_PLANNED'`.
*   **`onProductionOrderReleased`**:
    *   Estado cambia a `'released'`. Emite `TraceEvent` de tipo `'BATCH_RELEASED'`.
*   **`onProductionConsumeInput`**:
    *   Estado cambia a `'wip'`. Crea `StockMove` de tipo `'production_out'` para cada material.
    *   Crea `TraceEvent` de tipo `'CONSUME'`.
*   **`onProductionOutput`**:
    *   Crea un nuevo `Lot` con `qcStatus: 'hold'`.
    *   Crea un `StockMove` de tipo `'production_in'`.
    *   Crea `TraceEvent` de tipo `'OUTPUT'` y `'BATCH_END'`. La orden pasa a `'done'`.

#### **Logística de Salida (Picking y Envío)**
*   **`onShipmentLinePicked`**:
    *   Crea un `StockMove` de tipo `'ship'` para decrementar el stock.
    *   Crea un `TraceEvent` de tipo `'SHIPMENT_PICKED'`.
*   **`onShipmentConfirmed`**:
    *   Crea un `TraceEvent` de tipo `'SHIPPED'`.
    *   (Hook contable) Si se factura al expedir, genera el albarán/factura en Holded y crea el `FinanceLink`.

#### **Devoluciones**
*   **`onCustomerReturn`**:
    *   Crea `StockMove` de tipo `'return_in'` a una ubicación de devoluciones.
    *   Crea un `Incident` de tipo `'CUSTOMER_RETURN'`.

---

## 11. Metadatos y Constantes

```typescript
// Colores y etiquetas para los departamentos
export const DEPT_META: Record<Department, { label: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     color: '#D7713E', textColor: '#fff' },
  PRODUCCION: { label: 'Producción', color: '#618E8F', textColor: '#fff' },
  ALMACEN:    { label: 'Almacén',    color: '#A7D8D9', textColor: '#2F5D5D' },
  MARKETING:  { label: 'Marketing',  color: '#F7D15F', textColor: '#9E4E27' },
  FINANZAS:   { label: 'Finanzas',   color: '#CCCCCC', textColor: '#333' },
  CALIDAD:    { label: 'Calidad',    color: '#F7D15F', textColor: '#9E4E27' },
};
```
