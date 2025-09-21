# Propuesta de Arquitectura de Datos (SSOT) - V4 (Party-Role + Trazabilidad y Calidad)

Este documento presenta una arquitectura de datos unificada y completa. Se basa en el patrón "Party-Role" para una gestión de contactos sin duplicados y añade capas robustas para la trazabilidad, la gestión de calidad y la integración con sistemas externos como Holded.

---

## 1. Principios de Diseño

*   **Contacto Único (Party)**: Una persona u organización (un CIF/NIF) solo existe una vez, en la entidad `Party`.
*   **Roles sobre Contactos**: Un `Party` puede tener múltiples roles (`CUSTOMER`, `SUPPLIER`, `EMPLOYEE`). Cada rol se almacena en `PartyRole` y contiene los datos específicos de esa relación.
*   **Holded como Maestro Contable**: El CRM no duplica la contabilidad. Almacena referencias (IDs) a documentos de Holded (facturas, albaranes, gastos) para enriquecer la vista de negocio.
*   **Trazabilidad Extremo a Extremo**: Cada movimiento y transformación de un lote, desde la materia prima hasta la entrega al cliente, se registra a través de `StockMove` y `TraceEvent`.
*   **Gestión de Incidencias**: Cualquier desviación (calidad, logística) se registra en una entidad `Incident`, permitiendo su seguimiento y resolución.

---

## 2. Tipos Primitivos y Enums

Estos son los tipos y uniones que se reutilizan en toda la aplicación para garantizar la consistencia.

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
export type ProductionStatus = 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
```

---

## 3. Entidades Centrales: Party y Roles

El núcleo del modelo de contactos.

```typescript
// --- CONTACTO UNIFICADO (PARTY) ---
// Representa a una persona u organización única. Es el maestro de contactos.
export interface Party {
  id: string;
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
    data: CustomerData | SupplierData | InfluencerData | EmployeeData;
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
export interface Material { id: string; sku: string; name: string; category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising'; uom?: Uom; standardCost?: number; }
export interface Product { id: string; sku: string; name: string; category?: string; bottleMl?: number; caseUnits?: number; casesPerPallet?: number; active: boolean; materialId?: string; }

// --- PRODUCCIÓN ---
export interface BillOfMaterial { id: string; sku: string; name: string; items: { materialId: string; quantity: number; unit?: string; }[]; batchSize: number; baseUnit?: string; }
export interface ProductionOrder { id: string; sku: string; bomId: string; targetQuantity: number; status: ProductionStatus; createdAt: string; lotId?: string; }

// --- CALIDAD Y LOTES ---
export type QCResult = { value?: number | string | boolean; notes?: string; status: 'ok' | 'ko'; };
export interface Lot {
  id: string;
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
  supplierPartyId: string;
  deliveryNote: string;      // Nº albarán proveedor
  holdedBillId?: string;     // factura compra en Holded
  holdedDeliveryId?: string; // albarán en Holded (si aplica)
  receivedAt: string;
  lines: { materialId: string; sku: string; lotId: string; qty: number; uom: Uom; }[];
  status: 'pending_qc' | 'completed' | 'partial';
  incidentIds?: string[];
  notes?: string;
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
export type TraceEventKind = 'FARM_DATA' | 'SUPPLIER_PO' | 'ARRIVED' | 'BOOKED' | 'CHECK_PASS' | 'CHECK_FAIL' | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT' | 'PACK_START' | 'PACK_END' | 'MOVE' | 'RESERVE' | 'ORDER_ALLOC' | 'SHIPMENT_PICKED' | 'SHIPPED' | 'DELIVERED';
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

## 7. Marketing y Finanzas

```typescript
// --- MARKETING EN PUNTO DE VENTA ---
export interface Activation { id: string; accountId: string; materialId: string; description: string; status: 'active' | 'inactive' | 'pending_renewal'; startDate: string; endDate?: string; ownerId: string; }
export interface Promotion { id: string; name: string; type: '5+1' | 'BOGO' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED'; value: number; validFrom: string; validTo: string; }

// --- MARKETING GENERAL ---
export interface EventMarketing { id: string; title: string; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; startAt: string; endAt?: string; city?: string; spend?: number; extraCosts?: { description: string; amount: number }[]; linkedActivations?: string[]; linkedPromotions?: string[]; }
export interface OnlineCampaign { id: string; title: string; channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other'; status: 'planned' | 'active' | 'closed' | 'cancelled'; startAt: string; endAt?: string; budget: number; spend: number; metrics?: any; }

// --- INFLUENCERS (proveedores de servicios de marketing) ---
export interface InfluencerCollab { id: string; supplierPartyId: string; /* ... */ }

// --- CONTABILIDAD (Enlaces a Holded) ---
export type HoldedDocType = 'SALES_INVOICE' | 'PURCHASE_BILL' | 'CREDIT_NOTE' | 'EXPENSE';
export interface FinanceLink { id: string; docType: HoldedDocType; externalId: string; status: 'paid' | 'pending' | 'overdue'; netAmount: number; taxAmount: number; grossAmount: number; currency: Currency; issueDate: string; dueDate: string; campaignId?: string; eventId?: string; collabId?: string; partyId?: string; }
export interface PaymentLink { id: string; financeLinkId: string; externalId?: string; amount: number; date: string; method?: string; }
```

---

## 8. Colección de Datos Completa `SantaData`

```typescript
// La interfaz que representa todo el estado de la aplicación.
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
  financeLinks: FinanceLink[];
  paymentLinks: PaymentLink[];
  
  // Registros de Auditoría y Trazabilidad
  traceEvents: TraceEvent[];
  incidents: Incident[];
}

// Lista de colecciones válidas para persistencia.
export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
    'parties', 'partyRoles', 'users', 'accounts', 'ordersSellOut', 'interactions',
    'products', 'materials', 'billOfMaterials', 'productionOrders', 'lots', 'qaChecks',
    'inventory', 'stockMoves', 'shipments', 'goodsReceipts', 'activations', 'promotions',
    'events', 'onlineCampaigns', 'influencerCollabs', 'financeLinks', 'paymentLinks',
    'traceEvents', 'incidents'
];
```

---

## 9. Metadatos y Constantes

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
