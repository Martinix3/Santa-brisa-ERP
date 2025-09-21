
// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - V5
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR';

// Departamentos internos
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD';

// --- Roles y Estados ---
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';

// Estados para flujos de trabajo
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export type ProductionStatus = 'planned' | 'released' | 'wip' | 'done' | 'cancelled';
export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
export type ActivationStatus = 'active' | 'inactive' | 'pending_renewal';


// -----------------------------------------------------------------
// 2. Entidades Centrales: Party y Roles
// -----------------------------------------------------------------

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

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  managerId?: string;
  kpiBaseline?: {
    revenue?: number;
    unitsSold?: number;
    visits?: number;
  }
}

// -----------------------------------------------------------------
// 3. Entidades de Negocio (CRM y Ventas)
// -----------------------------------------------------------------
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

export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO'|'FERIA'|'FORMACION'|'OTRO';

export type Payload = 
    | { type: 'venta', items: { sku: string; qty: number }[] }
    | { type: 'interaccion', note: string, nextActionDate?: string }
    | { type: 'visita_plv', note: string, nextActionDate?: string, plvInstalled: boolean, plvNotes?: string }
    | { type: 'cobro', amount: number, notes?: string }
    | { type: 'evento_mkt', kpis: { cost: number; attendees: number; leads: number }, notes?: string };


export interface Interaction {
  id: string;
  partyId?: string;
  accountId?: string;
  userId: string;
  dept?: Department;
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  status: InteractionStatus;
  resultNote?: string;
  involvedUserIds?: string[];
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'EVENT' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction';
    id: string;
  };
  tags?: string[];
}

// -----------------------------------------------------------------
// 4. Producción, Calidad y Trazabilidad
// -----------------------------------------------------------------
export interface Material {
  id: string;
  sku: string;
  name: string;
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising';
  uom?: Uom;
  standardCost?: number;
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

export interface BillOfMaterial {
  id: string;
  sku: string;
  name: string;
  items: { materialId: string; quantity: number; unit?: string; }[];
  batchSize: number;
  baseUnit?: string;
}

export type Shortage = { materialId: string; required: number; available: number; uom: Uom };
export type Reservation = { materialId: string; fromLot: string; reservedQty: number; uom: Uom };
export type ActualConsumption = {
  materialId: string;
  name: string;
  fromLot?: string;
  theoreticalQty: number;
  actualQty: number;
  uom: Uom;
  costPerUom: number;
};
export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };

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
  responsibleId?: string;
  shortages?: Shortage[];
  reservations?: Reservation[];
  actuals?: ActualConsumption[];
  checks?: ExecCheck[];
  execution?: {
    startedAt?: string;
    finishedAt?: string;
    durationHours?: number;
    finalYield?: number;
    yieldUom?: 'L' | 'ud';
    goodBottles?: number;
    scrapBottles?: number;
  };
  incidents?: { id: string; when: string; severity: "BAJA" | "MEDIA" | "ALTA"; text: string }[];
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

export interface QACheck {
  id: string;
  lotId?: string;                 // Para QC inbound o de proceso sobre un lote
  prodOrderId?: string;           // Para QC de proceso/lanzamiento
  phase: 'INBOUND' | 'PROCESS' | 'RELEASE';
  checklist?: Array<{ name: string; result: 'ok' | 'ko'; value?: number | string | boolean; notes?: string }>;
  summaryStatus: 'ok' | 'ko';     // Resultado global
  reviewedById?: string;
  reviewedAt?: string;
  notes?: string;
  links?: { goodsReceiptId?: string; traceEventId?: string };
  createdAt: string;
}

// -----------------------------------------------------------------
// 5. Almacén y Logística (Trazabilidad)
// -----------------------------------------------------------------
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship';

export interface InventoryItem {
    id: string;
    sku: string;
    lotNumber?: string;
    uom: Uom;
    qty: number;
    locationId: string;
    expDate?: string;
    updatedAt: string;
}

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

export interface ShipmentLine {
  sku: string;
  name: string;
  qty: number;
  uom: 'uds';
  lotNumber?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  accountId: string;
  shipmentNumber?: string;     // Nº albarán interno
  holdedDeliveryId?: string;
  holdedInvoiceId?: string;    // (si facturas al expedir)
  createdAt: string;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  customerName: string;
  city: string;
  addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string; labelUrl?: string; tracking?: string;
  notes?: string; packedById?: string;
  checks?: { visualOk?: boolean };
}

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


// -----------------------------------------------------------------
// 6. Marketing, Finanzas y Costes
// -----------------------------------------------------------------
export interface Activation {
    id: string;
    accountId: string;
    materialId: string;
    description: string;
    status: 'active' | 'inactive' | 'pending_renewal';
    startDate: string;
    endDate?: string;
    ownerId: string;
}
export interface Promotion {
    id: string;
    code?: string;
    name: string;
    type: '5+1' | 'BOGO' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED';
    value: number;
    validFrom: string;
    validTo: string;
}

export interface MarketingEvent {
    id: string;
    title: string;
    kind: EventKind;
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: string;
    endAt?: string;
    ownerUserId?: string;
    accountId?: string;
    city?: string;
    location?: string;
    budget?: number;
    spend?: number;
    goal?: { 
        leads?: number; 
        sampling?: number; 
        impressions?: number; 
        interactions?: number 
    };
    kpis?: {
        leads?: number;
        sampling?: number;
        impressions?: number;
        interactions?: number;
        revenueAttributed?: number;
        roi?: number;
        completedAt?: string;
    };
    links?: {
        activationId?: string;
        plvIds?: string[];
        promotionId?: string;
    };
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface OnlineCampaign {
    id: string;
    title: string;
    channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other';
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: string;
    endAt?: string;
    budget: number;
    spend: number;
    metrics?: any;
    createdAt: string;
    updatedAt: string;
    ownerUserId?: string;
    tracking?: {
        utmCampaign?: string;
        couponCode?: string;
        landingUrl?: string;
    };
}

export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Deliverable = 'post' | 'story' | 'reel' | 'short' | 'video_long' | 'stream' | 'blogpost';
export type CompType = 'gift' | 'flat' | 'cpa' | 'cpc' | 'revshare';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';

export interface InfluencerCollab {
  id: string;
  creatorId: string;
  creatorName: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  status: CollabStatus;
  ownerUserId?: string;
  couponCode?: string;
  utmCampaign?: string;
  landingUrl?: string;
  deliverables: {
    kind: Deliverable;
    qty: number;
    dueAt?: string;
  }[];
  compensation: {
    type: CompType;
    amount?: number;
    notes?: string;
  };
  costs?: {
    productCost?: number;
    shippingCost?: number;
    cashPaid?: number;
    otherCost?: number;
  };
  tracking?: {
    views?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    clicks?: number;
    orders?: number;
    revenue?: number;
    updatedAt?: string;
    couponCode?: string;
    utmCampaign?: string;
  };
  metrics?: {
    impressions?: number;
    clicks?: number;
    engagements?: number;
    orders?: number;
    ctr?: number;
    cpm?: number;
    cpc?: number;
    cpe?: number;
    cac?: number;
  };
  dates?: {
    agreedAt?: string;
    goLiveAt?: string;
    completedAt?: string;
    endAt?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  supplierPartyId: string;
}

export interface MaterialCost {
  id: string;
  materialId: string;
  currency: 'EUR';
  costPerUom: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

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


// -----------------------------------------------------------------
// 7. Sistema de Codificación Centralizado
// -----------------------------------------------------------------
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

// -----------------------------------------------------------------
// 8. Dataset Canónico (El gran objeto de datos)
// -----------------------------------------------------------------

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
  qaChecks: QACheck[];

  // Logística y Almacén
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];

  // Marketing
  activations: Activation[];
  promotions: Promotion[];
  marketingEvents: MarketingEvent[];
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
    'marketingEvents', 'onlineCampaigns', 'influencerCollabs', 'materialCosts', 'financeLinks', 
    'paymentLinks', 'traceEvents', 'incidents', 'codeAliases'
];

// -----------------------------------------------------------------
// 9. Lógica de Negocio y Hooks Operativos (Resumen)
// -----------------------------------------------------------------

// Los hooks como `onGoodsReceiptCreated`, `onQACheckReviewed`, etc. se definen aquí conceptualmente.
// Su implementación real estará en los servicios del backend.

// Invariantes del sistema:
// - No se puede vender o expedir un `Lot` cuyo `quality.qcStatus` no sea `'release'`.
// - Un `Shipment` no puede pasar a `'ready_to_ship'` si alguna línea no tiene `lotNumber`.
// - Un `GoodsReceipt` no pasa a `'completed'` hasta que todos sus lotes pasen QC o se abra un `Incident`.

// -----------------------------------------------------------------
// 10.A — UI KIT (SSOT de Colores, Metadatos y CSS Variables)
// -----------------------------------------------------------------

export const SB_COLORS = {
  primary: {
    sun   : '#F7D15F', // Luz / CTA
    copper: '#D7713E', // Ventas / Acento cálido
    aqua  : '#A7D8D9', // Almacén / Logística
    teal  : '#618E8F', // Producción / Admin
    neutral50 : '#FAFAFA',
    neutral900: '#111111',
  },
  state: {
    success: '#22c55e', // ✅ Verde real (para release, paid, shipped, delivered)
    warning: '#f59e0b',
    danger : '#ef4444',
    info   : '#3b82f6',
  },
  dept: {
    VENTAS:     { bg: '#D7713E', text: '#fff'     },
    PRODUCCION: { bg: '#618E8F', text: '#fff'     },
    ALMACEN:    { bg: '#A7D8D9', text: '#2F5D5D'  },
    MARKETING:  { bg: '#F7D15F', text: '#9E4E27'  },
    FINANZAS:   { bg: '#CCCCCC', text: '#333'     },
    CALIDAD:    { bg: '#F7D15F', text: '#9E4E27'  },
  },
  lotQC: {
    release: { label: 'LIBERADO',  bg: '#22c55e', text: '#fff'    }, // verde
    hold:    { label: 'RETENIDO',  bg: '#F7D15F', text: '#111111' }, // amarillo
    reject:  { label: 'RECHAZADO', bg: '#ef4444', text: '#fff'    },
  },
  tokens: {
    radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 4px rgba(0,0,0,0.08)',
      lg: '0 6px 12px rgba(0,0,0,0.08)',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
} as const;

export type DeptKey = keyof typeof SB_COLORS.dept;
export type QCVisual = keyof typeof SB_COLORS.lotQC; // 'release'|'hold'|'reject'

// --- Estados visuales de negocio ---
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; accent: string }> = {
  open:      { label: 'Abierto',    accent: SB_COLORS.state.info    },
  confirmed: { label: 'Confirmado', accent: SB_COLORS.primary.teal  },
  shipped:   { label: 'Enviado',    accent: SB_COLORS.state.success }, // verde
  invoiced:  { label: 'Facturado',  accent: SB_COLORS.primary.copper },
  paid:      { label: 'Pagado',     accent: SB_COLORS.state.success }, // verde
  cancelled: { label: 'Cancelado',  accent: SB_COLORS.state.danger  },
  lost:      { label: 'Perdido',    accent: SB_COLORS.state.danger  },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; accent: string }> = {
  pending:       { label: 'Pendiente', accent: SB_COLORS.state.info   },
  picking:       { label: 'Picking',   accent: SB_COLORS.primary.teal },
  ready_to_ship: { label: 'Validado',  accent: SB_COLORS.primary.teal },
  shipped:       { label: 'Enviado',   accent: SB_COLORS.state.success }, // verde
  delivered:     { label: 'Entregado', accent: SB_COLORS.state.success }, // verde
  cancelled:     { label: 'Cancelado', accent: SB_COLORS.state.danger },
};

export const LOT_QC_META = SB_COLORS.lotQC;

// --- Fases de trazabilidad ---
export const PHASE_NAME_ES: Record<TraceEventPhase, string> = {
  SOURCE:    'Origen (Almacén)',
  RECEIPT:   'Recepción (Almacén)',
  QC:        'Calidad',
  PRODUCTION:'Producción',
  PACK:      'Embalaje',
  WAREHOUSE: 'Almacén',
  SALE:      'Venta',
  DELIVERY:  'Entrega (Almacén)',
};

export const PHASE_DEPT: Record<TraceEventPhase, DeptKey> = {
  SOURCE:     'ALMACEN',
  RECEIPT:    'ALMACEN',
  QC:         'CALIDAD',
  PRODUCTION: 'PRODUCCION',
  PACK:       'PRODUCCION',
  WAREHOUSE:  'ALMACEN',
  SALE:       'VENTAS',
  DELIVERY:   'ALMACEN',
};

export const phaseStyle = (phase: TraceEventPhase) => {
  const dept = PHASE_DEPT[phase];
  const c = SB_COLORS.dept[dept];
  return { bg: c.bg, text: c.text };
};

// --- Cuentas por tipo ---
export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; accent: string }> = {
  HORECA:       { label: 'HORECA',       accent: SB_COLORS.primary.teal   },
  RETAIL:       { label: 'Retail',       accent: SB_COLORS.primary.copper },
  PRIVADA:      { label: 'Privada',      accent: SB_COLORS.state.info     },
  ONLINE:       { label: 'Online',       accent: SB_COLORS.state.info     },
  OTRO:         { label: 'Otro',         accent: '#9CA3AF'                },
  DISTRIBUIDOR: { label: 'Distribuidor', accent: SB_COLORS.primary.aqua   },
};

// --- Variables CSS globales ---
export function attachSBColorCSSVariables(targetDoc?: Document) {
  const d = targetDoc || (typeof document !== 'undefined' ? document : undefined);
  if (!d) return;
  const root = d.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  set('--sb-sun',    SB_COLORS.primary.sun);
  set('--sb-copper', SB_COLORS.primary.copper);
  set('--sb-aqua',   SB_COLORS.primary.aqua);
  set('--sb-teal',   SB_COLORS.primary.teal);

  set('--sb-success', SB_COLORS.state.success);
  set('--sb-warning', SB_COLORS.state.warning);
  set('--sb-danger',  SB_COLORS.state.danger);
  set('--sb-info',    SB_COLORS.state.info);

  (Object.keys(SB_COLORS.dept) as DeptKey[]).forEach((k) => {
    set(`--sb-dept-${k.toLowerCase()}-bg`,   SB_COLORS.dept[k].bg);
    set(`--sb-dept-${k.toLowerCase()}-text`, SB_COLORS.dept[k].text);
  });
}

// --- Autotest rápido ---
export function runColorMetaSelfTest(): string[] {
  const errs: string[] = [];
  const hex = /^#([0-9a-fA-F]{6})$/;

  if (!SB_COLORS.primary || !SB_COLORS.state || !SB_COLORS.dept) errs.push('SB_COLORS incompleto');

  (['VENTAS','PRODUCCION','ALMACEN','MARKETING','FINANZAS','CALIDAD'] as Department[])
    .forEach(d => {
      if (!SB_COLORS.dept[d]) errs.push(`Falta dept ${d}`);
      if (!hex.test(SB_COLORS.dept[d].bg)) errs.push(`Dept ${d} bg inválido`);
    });

  (['open','confirmed','shipped','invoiced','paid','cancelled','lost'] as OrderStatus[])
    .forEach(s => { if (!ORDER_STATUS_META[s]) errs.push(`Falta ORDER_STATUS_META.${s}`); });

  (['pending','picking','ready_to_ship','shipped','delivered','cancelled'] as ShipmentStatus[])
    .forEach(s => { if (!SHIPMENT_STATUS_META[s]) errs.push(`Falta SHIPMENT_STATUS_META.${s}`); });

  (['HORECA','RETAIL','PRIVADA','ONLINE','OTRO','DISTRIBUIDOR'] as AccountType[])
    .forEach(a => { if (!ACCOUNT_TYPE_META[a]) errs.push(`Falta ACCOUNT_TYPE_META.${a}`); });

  (['SOURCE','RECEIPT','QC','PRODUCTION','PACK','WAREHOUSE','SALE','DELIVERY'] as TraceEventPhase[])
    .forEach(p => {
      if (!PHASE_NAME_ES[p]) errs.push(`Falta PHASE_NAME_ES.${p}`);
      const dept = PHASE_DEPT[p];
      if (!SB_COLORS.dept[dept]) errs.push(`PHASE_DEPT.${p} apunta a dept inexistente`);
    });

  return errs;
}

// -----------------------------------------------------------------
// 10.B — DEPT_META (compat) derivado de SB_COLORS.dept
// -----------------------------------------------------------------
export const DEPT_META: Record<Department, { label: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     color: SB_COLORS.dept.VENTAS.bg,     textColor: SB_COLORS.dept.VENTAS.text },
  PRODUCCION: { label: 'Producción', color: SB_COLORS.dept.PRODUCCION.bg, textColor: SB_COLORS.dept.PRODUCCION.text },
  ALMACEN:    { label: 'Almacén',    color: SB_COLORS.dept.ALMACEN.bg,    textColor: SB_COLORS.dept.ALMACEN.text },
  MARKETING:  { label: 'Marketing',  color: SB_COLORS.dept.MARKETING.bg,  textColor: SB_COLORS.dept.MARKETING.text },
  FINANZAS:   { label: 'Finanzas',   color: SB_COLORS.dept.FINANZAS.bg,   textColor: SB_COLORS.dept.FINANZAS.text },
  CALIDAD:    { label: 'Calidad',    color: SB_COLORS.dept.CALIDAD.bg,    textColor: SB_COLORS.dept.CALIDAD.text },
};


// -----------------------------------------------------------------
// 11. Rollups de Cuenta
// -----------------------------------------------------------------

export type AccountRollup = {
    accountId: string;
    hasPLVInstalled: boolean;
    lastPLVInstalledAt?: string;
    activeActivations: number;
    lastActivationAt?: string;
    activePromotionIds: string[];
    ordersWithPromoInPeriod: number;
    attributedSalesInPeriod: number;
};
