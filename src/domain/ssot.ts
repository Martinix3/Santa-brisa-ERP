// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - V5
// =================================================================
export type Timestamp = string; // ISO string

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR';

// Departamentos internos
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD';

// --- Roles y Estados ---
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';

// Estados para flujos de trabajo
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'planned' | 'released' | 'wip' | 'done' | 'cancelled';
export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
export type ActivationStatus = 'active' | 'inactive' | 'pending_renewal';


// -----------------------------------------------------------------
// 2. Entidades Centrales: Party y Roles
// -----------------------------------------------------------------
export type Address = { address?: string; city?: string; zip?: string; province?: string; country?: string; countryCode?: string };

export interface Party {
  id: string;
  legalName: string;
  tradeName?: string;
  vat?: string;                     // NIF/CIF normalizado
  emails?: string[];                // normalizados en minúscula
  phones?: string[];                // E.164 +34...
  billingAddress?: Address;
  shippingAddress?: Address;
  roles: Array<'CUSTOMER'|'SUPPLIER'|'OTHER'>;
  external?: {
    holdedContactId?: string;
    shopifyCustomerId?: string;
  };
  flags?: {
    needsReview?: boolean;
    issues?: string[];              // ej: ['MISSING_VAT','POSSIBLE_DUP']
  };
  quality?: {
    lastAuditAt?: string;
    score?: number;                 // 0..100
  };
  createdAt: any; 
  updatedAt: any;
  // Campos del modelo anterior para compatibilidad temporal. Serán eliminados.
  name: string; // Mantener por ahora, pero usar legalName/tradeName
  kind: 'ORG' | 'PERSON';
  taxId?: string; // CIF/NIF opcional para compatibilidad
  contacts: { type: 'email' | 'phone' | 'whatsapp' | 'web'; value: string; isPrimary?: boolean; description?: string; }[];
  addresses: { type: 'main' | 'billing' | 'shipping'; street: string; city: string; postalCode?: string; country: string; isPrimary?: boolean; }[];
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  tags?: string[];
}

export interface PartyRole {
    id: string;
    partyId: string;        // Vínculo a la Party
    role: PartyRoleType;    // El tipo de relación que es
    isActive: boolean;
    data: CustomerData | SupplierData | InfluencerData | EmployeeData; // Datos específicos del rol
    createdAt: Timestamp;
}

export interface PartyDuplicate {
  id: string;                       // dup_<timestamp>_<rand>
  primaryPartyId: string;           // candidato ganador
  duplicatePartyId: string;         // candidato a fusionar
  reason: 'SAME_VAT'|'SAME_EMAIL'|'FUZZY_NAME_CITY'|'SAME_PHONE';
  score: number;                    // 0..1
  status: 'OPEN'|'MERGED'|'IGNORED';
  createdAt: any; resolvedAt?: any;
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

export interface AccountRollup {
    accountId: string;
    hasPLVInstalled?: boolean;
    lastPLVInstalledAt?: Timestamp;
    activeActivations: number;
    lastActivationAt?: Timestamp;
    activePromotions: number;
    activePosTactics: number;
    lastTacticAt?: Timestamp;
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
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastInteractionAt?: Timestamp;
  notes?: string;
  external?: {
    shopifyCustomerId?: string;
    holdedContactId?: string;
    vat?: string;
  }
}

export type BillingStatus = 'PENDING'|'INVOICING'|'INVOICED'|'PAID'|'FAILED';

export interface OrderSellOut {
  id: string;
  partyId: string; // <-- party-centric
  accountId: string; // <-- compatibilidad
  source: 'CRM'|'SHOPIFY'|'OTHER' | 'MANUAL' | 'HOLDED';
  createdAt: Timestamp;         // ISO o epoch
  currency: 'EUR' | string;
  lines: Array<{ sku: string; name?: string; qty: number; priceUnit: number; taxRate?: number; discountPct?: number; uom?: 'uds'; lotIds?: string[] }>;
  notes?: string;
  billingStatus?: BillingStatus;
  status: OrderStatus; // compatibilidad
  docNumber?: string;
  totalAmount?: number;
  external?: {
    shopifyOrderId?: string;
    holdedInvoiceId?: string;
  };
}

export type Expense = {
  id: string;                           // "holded-<purchaseId>" (idempotente)
  partyId: string;                      // ← Party SUPPLIER
  date: string;                         // ISO
  dueDate?: string;
  status: 'DRAFT'|'APPROVED'|'PAID'|'CANCELLED';
  amountTotal: number;
  amountTax: number;
  currency: 'EUR' | string;
  lines: Array<{ description: string; qty: number; unitPrice: number; taxRate?: number }>;
  external: { holdedPurchaseId: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO'|'FERIA'|'FORMACION'|'OTRO';

export type Payload = 
    | { type: 'venta', items: { sku: string; qty: number }[] }
    | { type: 'interaccion', note: string, nextActionDate?: string }
    | { type: 'visita_plv', note: string, nextActionDate?: string, plvInstalled: boolean, plvNotes?: string }
    | { type: 'cobro', amount: number, notes?: string }
    | { type: 'evento_mkt', kpis: { cost: number; attendees: number; leads: number }, notes?: string };
    
export type PosResult = {
  windowWeeks: number;
  baselineUnits: number;
  actualUnits: number;
  upliftUnits: number;
  liftPct: number;
  marginPerUnit?: number;
  upliftMargin?: number;
  roi?: number;
  confidence: 'LOW'|'MEDIUM'|'HIGH';
  computedAt: string;
};
    
export interface Interaction {
  id: string;
  partyId?: string;
  accountId?: string;
  userId: string;
  dept?: Department;
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: Timestamp;
  status: InteractionStatus;
  resultNote?: string;
  involvedUserIds?: string[];
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'EVENT' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction';
    id: string;
  };
  tags?: string[];
  posTactic?: {
    tacticCode: string;
    startDate: string;
    endDate?: string;
    costTotal: number;
    executionScore: number;
    exposure?: {
      unitsGiven?: number;
      staffIncentivized?: number;
    };
    appliesToSkuIds?: string[];
    photos?: string[];
  };
  posTacticResult?: PosResult;
}


// ... Resto de tipos del SSOT sin cambios ...

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

export type BomLineRole = "FORMULA" | "PACKAGING";
export interface BillOfMaterial {
  id: string;
  sku: string;
  name: string;
  items: { 
    materialId: string;
    quantity: number;
    unit?: string;
    role?: BomLineRole;
  }[];
  batchSize: number;
  baseUnit?: string;
  stdLaborCostPerBatch?: number;
  stdOverheadPerBatch?: number;
  currency?: Currency;
  yieldPct?: number;
  wastePctProduction?: number;
  wastePctPackaging?: number;
  version?: number;
  status?: "ACTIVA" | "BORRADOR" | "ARCHIVADA";
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
  createdAt: Timestamp;
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
  lotCode?: string;
  sku: string;
  quantity: number;
  createdAt: Timestamp;
  orderId?: string; 
  supplierId?: string;
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
  dept?: Department;
  partyId?: string;
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
  lotId?: string;
  prodOrderId?: string;
  phase: 'INBOUND' | 'PROCESS' | 'RELEASE';
  checklist?: Array<{ name: string; result: 'ok' | 'ko'; value?: number | string | boolean; notes?: string }>;
  summaryStatus: 'ok' | 'ko';
  reviewedById?: string;
  reviewedAt?: string;
  notes?: string;
  links?: { goodsReceiptId?: string; traceEventId?: string };
  createdAt: Timestamp;
}

export type StockReason =
  | 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer'
  | 'adjustment' | 'return_in' | 'return_out' | 'ship'
  | 'consignment_send' | 'consignment_return' | 'consignment_sell'
  | 'sample_send' | 'sample_consume';
  
export interface StockMove {
  id: string;
  sku: string;
  lotId?: string;
  uom: Uom;
  qty: number;
  fromLocation?: string;
  toLocation?: string;
  reason: StockReason;
  occurredAt: string;
  createdAt: string;
  ref?: { orderId?: string; shipmentId?: string; prodOrderId?: string; goodsReceiptId?: string; };
}

export interface InventoryItem {
    id: string;
    sku: string;
    lotNumber?: string;
    uom: Uom;
    qty: number;
    locationId: string;
    expDate?: string;
    updatedAt: Timestamp;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber?: string;
  supplierPartyId: string;
  deliveryNote: string;
  holdedBillId?: string;
  holdedDeliveryId?: string;
  receivedAt: Timestamp;
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
  partyId: string;
  mode: 'PARCEL' | 'PALLET';
  shipmentNumber?: string;
  deliveryNoteId?: string;
  holdedDeliveryId?: string;
  holdedInvoiceId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  customerName: string;
  city: string;
  addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string;
  labelUrl?: string; 
  trackingCode?: string;
  tracking?: string;
  notes?: string;
  packedById?: string;
  checks?: { visualOk?: boolean };
  isSample?: boolean;
  samplePurpose?: 'sales'|'qc'|'mkt'|'other';
  sampleNotes?: string;
  weightKg?: number;
  dimsCm?: { l:number; w:number; h:number };
  parcels?: Array<{ weightKg?:number; dimsCm?:{l:number;w:number;h:number} }>;
  pallets?: Array<{ type:'EURO'|'AMERICAN'|'OTHER'; count:number; notes?:string }>;
  trackingUrl?: string;
}

export interface DeliveryNote {
  id: string;
  orderId: string;
  shipmentId: string;
  partyId: string;
  series: 'ONLINE'|'B2B'|'INTERNAL';
  date: string; // ISO
  soldTo: { name: string; vat?: string };
  shipTo: { name: string; address: string; zip: string; city: string; country: string };
  lines: Array<{ sku:string; description:string; qty:number; uom?:string; lotNumbers?:string[] }>;
  pdfUrl?: string;
  company: { name: string; vat: string; address?: string; city?: string; zip?: string; country?: string };
  createdAt: any;
  updatedAt: any;
}

export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type TraceEventKind = 'FARM_DATA' | 'SUPPLIER_PO' | 'ARRIVED' | 'BOOKED' | 'CHECK_PASS' | 'CHECK_FAIL' | 'BATCH_PLANNED' | 'BATCH_RELEASED' | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT' | 'PACK_START' | 'PACK_END' | 'MOVE' | 'RESERVE' | 'ORDER_ALLOC' | 'SHIPMENT_PICKED' | 'SHIPPED' | 'DELIVERED';
export interface TraceEvent {
    id: string;
    subject: { type: 'LOT' | 'BATCH' | 'ORDER' | 'SHIPMENT'; id: string; };
    phase: TraceEventPhase;
    kind: TraceEventKind;
    occurredAt: Timestamp;
    actorId?: string;
    links?: { lotId?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string; };
    data?: any;
}

export type ActivationType = 'bartender_day' | 'tasting' | 'event' | 'other_experience';
export interface Activation {
    id: string;
    accountId: string;
    type: ActivationType;
    cost: number;
    description: string;
    status: 'active' | 'inactive' | 'pending_renewal';
    startDate: Timestamp;
    endDate?: Timestamp;
    ownerId: string;
}

export interface Promotion {
    id: string;
    code?: string;
    name: string;
    type: '5+1' | 'BOGO' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED';
    value: number;
    validFrom: Timestamp;
    validTo: Timestamp;
}

export interface MarketingEvent {
    id: string;
    title: string;
    kind: EventKind;
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: Timestamp;
    endAt?: Timestamp;
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
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface OnlineCampaign {
    id: string;
    title: string;
    channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other';
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: Timestamp;
    endAt?: Timestamp;
    budget: number;
    spend: number;
    metrics?: any;
    createdAt: Timestamp;
    updatedAt: Timestamp;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  supplierPartyId: string;
}

export interface MaterialCost {
  id: string;
  materialId: string;
  currency: 'EUR';
  costPerUom: number;
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp;
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
  issueDate: Timestamp;
  dueDate: Timestamp;
  docNumber?: string;
  partyId?: string;
  expenseCategory?: ExpenseCategory;
  costObject?: { kind: CostObjectKind; id: string };
  allocationPct?: number;
  campaignId?: string; eventId?: string; collabId?: string;
}
export interface PaymentLink { id: string; financeLinkId: string; externalId?: string; amount: number; date: Timestamp; method?: string; }

export type PosUom = 'UNIT'|'HOUR'|'BATCH';
export type PosCostCatalogEntry = {
  code: string;
  label: string;
  defaultUnitCost?: number;
  uom?: PosUom;
  vendor?: string;
  status?: 'ACTIVE'|'DRAFT'|'ARCHIVED';
  createdAt?: string; createdById?: string;
  updatedAt?: string;
};

export type PlvStatus = 'IN_STOCK'|'INSTALLED'|'DAMAGED'|'RETIRED';
export type PlvMaterial = {
  id: string;
  sku?: string;
  kind: 'SHELF_TALKER'|'STANDEE'|'FRIDGE_STICKER'|'HANGING'|'GONDOLA'|'OTHER';
  purchaseCost?: number;
  purchaseDate?: string;
  expectedLifespanMonths?: number;
  expectedUses?: number;
  usesCount?: number;
  status: PlvStatus;
  accountId?: string;
  installedAt?: string;
  photoUrl?: string;
  createdAt?: string; updatedAt?: string;
};

export type PosTacticItem = {
  id: string;
  catalogCode?: string;
  description: string;
  qty?: number;
  unitCost?: number;
  actualCost: number;
  uom?: PosUom;
  vendor?: string;
  assetId?: string;
  attachments?: string[];
};

export type PosTacticKind = 'PLV'|'MENU'|'INCENTIVE'|'PROMO'|'OTHER';

export type PosTactic = {
  id: string;
  accountId: string;
  eventId?: string;
  interactionId?: string;
  orderId?: string;
  tacticCode: string;
  description?: string;
  appliesToSkuIds?: string[];
  items: PosTacticItem[];
  plannedCost?: number;
  actualCost: number;
  executionScore: number;
  status: 'planned'|'active'|'closed'|'cancelled';
  createdAt: Timestamp; createdById: string;
  updatedAt?: Timestamp;
  result?: { roi?: number; liftPct?: number; upliftUnits?: number; confidence?: 'LOW'|'MEDIUM'|'HIGH' };
};

export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';

export interface CodePolicy {
  entity: CodeEntity;
  template: string;
  regex: string;
  seqScope?: 'GLOBAL' | 'YEAR' | 'MONTH' | 'DAY';
  pad?: number;
}

export const CODE_POLICIES: Record<CodeEntity, CodePolicy> = {
  PRODUCT:    { entity:'PRODUCT', template:'{SKU}', regex:'^[A-Z0-9_-]{3,32}$'},
  ACCOUNT:    { entity:'ACCOUNT', template:'ACC-{SEQ#6}', regex:'^ACC-\\d{6}$', seqScope:'GLOBAL', pad:6 },
  PARTY:      { entity:'PARTY', template:'PTY-{SEQ#6}', regex:'^PTY-\\d{6}s$', seqScope:'GLOBAL', pad:6 },
  SUPPLIER:   { entity:'SUPPLIER', template:'SUP-{SEQ#5}', regex:'^SUP-\\d{5}$', seqScope:'GLOBAL', pad:5 },
  LOT:        { entity:'LOT', template:'{YY}{MM}{DD}-{SKU}-{SEQ#3}', regex:'^\\d{6}-.+-\\d{3}$', seqScope:'DAY', pad:3 },
  PROD_ORDER: { entity:'PROD_ORDER', template:'PO-{YYYY}{MM}-{SEQ#4}', regex:'^PO-\\d{6}-\\d{4}$', seqScope:'MONTH', pad:4 },
  SHIPMENT:   { entity:'SHIPMENT', template:'SHP-{YYYY}{MM}{DD}-{SEQ#3}', regex:'^SHP-\\d{8}-\\d{3}$', seqScope:'DAY', pad:3 },
  GOODS_RECEIPT:{ entity:'GOODS_RECEIPT', template:'GR-{YYYY}{MM}{DD}-{SEQ#3}', regex:'^GR-\\d{8}-\\d{3}s$', seqScope:'DAY', pad:3 },
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

export interface SantaData {
  parties: Party[];
  partyRoles: PartyRole[];
  partyDuplicates: PartyDuplicate[];
  users: User[];
  accounts: Account[];
  ordersSellOut: OrderSellOut[];
  interactions: Interaction[];
  products: Product[];
  materials: Material[];
  billOfMaterials: BillOfMaterial[];
  productionOrders: ProductionOrder[];
  lots: Lot[];
  qaChecks: QACheck[];
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  deliveryNotes: DeliveryNote[];
  goodsReceipts: GoodsReceipt[];
  activations: Activation[];
  promotions: Promotion[];
  marketingEvents: MarketingEvent[];
  onlineCampaigns: OnlineCampaign[];
  influencerCollabs: InfluencerCollab[];
  posTactics: PosTactic[];
  posCostCatalog: PosCostCatalogEntry[];
  plv_material: PlvMaterial[];
  materialCosts: MaterialCost[];
  financeLinks: FinanceLink[];
  paymentLinks: PaymentLink[];
  traceEvents: TraceEvent[];
  incidents: Incident[];
  codeAliases: CodeAlias[];
  integrations?: any;
  jobs?: any[];
  dead_letters?: any[];
  expenses: Expense[];
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
    'parties', 'partyRoles', 'users', 'accounts', 'ordersSellOut', 'interactions',
    'products', 'materials', 'billOfMaterials', 'productionOrders', 'lots', 'qaChecks',
    'inventory', 'stockMoves', 'shipments', 'goodsReceipts', 'activations', 'promotions',
    'marketingEvents', 'onlineCampaigns', 'influencerCollabs', 'materialCosts', 'financeLinks', 
    'paymentLinks', 'traceEvents', 'incidents', 'codeAliases',
    'posTactics', 'posCostCatalog', 'plv_material', 'integrations', 'jobs', 'dead_letters', 'expenses',
    'deliveryNotes', 'partyDuplicates'
];

export const SB_COLORS = {
  primary: {
    sun   : '#F7D15F',
    copper: '#D7713E',
    aqua  : '#A7D8D9',
    teal  : '#618E8F',
    neutral50 : '#FAFAFA',
    neutral900: '#111111',
  },
  state: {
    success: '#22c55e',
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
    release: { label: 'LIBERADO',  bg: '#22c55e', text: '#fff'    },
    hold:    { label: 'RETENIDO',  bg: '#F7D15F', text: '#111111' },
    reject:  { label: 'RECHAZADO', bg: '#ef4444', text: '#fff'    },
  },
  tokens: {
    radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 4px rgba(0,0,0,0.08)',
      lg: '0 6px 12px rgba(0,0,0,0.08)',
      xl: '0 20px 25px rgba(0,0,0,0.08)',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
} as const;

export type DeptKey = keyof typeof SB_COLORS.dept;
export type QCVisual = keyof typeof SB_COLORS.lotQC; // 'release'|'hold'|'reject'

export const PARTY_ROLE_META: Record<PartyRoleType, { label: string; accent: string }> = {
    CUSTOMER: { label: 'Cliente', accent: SB_COLORS.primary.copper },
    SUPPLIER: { label: 'Proveedor', accent: SB_COLORS.primary.aqua },
    DISTRIBUTOR: { label: 'Distribuidor', accent: SB_COLORS.primary.teal },
    IMPORTER: { label: 'Importador', accent: SB_COLORS.primary.teal },
    INFLUENCER: { label: 'Influencer', accent: '#f472b6' },
    CREATOR: { label: 'Creator', accent: '#ec4899' },
    EMPLOYEE: { label: 'Empleado', accent: '#6366f1' },
    BRAND_AMBASSADOR: { label: 'Brand Ambassador', accent: '#8b5cf6' },
    OTHER: { label: 'Otro', accent: '#9ca3af' },
};


export const ORDER_STATUS_META: Record<OrderStatus, { label: string; accent: string }> = {
  open:      { label: 'Abierto',    accent: SB_COLORS.state.info    },
  confirmed: { label: 'Confirmado', accent: SB_COLORS.primary.teal  },
  shipped:   { label: 'Enviado',    accent: SB_COLORS.state.success },
  invoiced:  { label: 'Facturado',  accent: SB_COLORS.primary.copper },
  paid:      { label: 'Pagado',     accent: SB_COLORS.state.success },
  cancelled: { label: 'Cancelado',  accent: SB_COLORS.state.danger  },
  lost:      { label: 'Perdido',    accent: SB_COLORS.state.danger  },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; accent: string }> = {
  pending:       { label: 'Pendiente',  accent: SB_COLORS.state.info   },
  picking:       { label: 'Picking',   accent: SB_COLORS.primary.teal },
  ready_to_ship: { label: 'Validado',  accent: SB_COLORS.primary.teal },
  shipped:       { label: 'Enviado',   accent: SB_COLORS.state.success },
  delivered:     { label: 'Entregado', accent: SB_COLORS.state.success },
  cancelled:     { label: 'Cancelado', accent: SB_COLORS.state.danger },
  exception:     { label: 'Incidencia', accent: SB_COLORS.state.warning },
};

export const LOT_QC_META = SB_COLORS.lotQC;

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

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; accent: string }> = {
  HORECA:       { label: 'HORECA',       accent: SB_COLORS.primary.teal   },
  RETAIL:       { label: 'Retail',       accent: SB_COLORS.primary.copper },
  PRIVADA:      { label: 'Privada',      accent: SB_COLORS.state.info     },
  ONLINE:       { label: 'Online',       accent: SB_COLORS.state.info     },
  OTRO:         { label: 'Otro',         accent: '#9CA3AF'                },
  DISTRIBUIDOR: { label: 'Distribuidor', accent: SB_COLORS.primary.aqua   },
};

export const DEPT_META: Record<Department, { label: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     color: SB_COLORS.dept.VENTAS.bg,     textColor: SB_COLORS.dept.VENTAS.text },
  PRODUCCION: { label: 'Producción', color: SB_COLORS.dept.PRODUCCION.bg, textColor: SB_COLORS.dept.PRODUCCION.text },
  ALMACEN:    { label: 'Almacén',    color: SB_COLORS.dept.ALMACEN.bg,    textColor: SB_COLORS.dept.ALMACEN.text },
  MARKETING:  { label: 'Marketing',  color: SB_COLORS.dept.MARKETING.bg,  textColor: SB_COLORS.dept.MARKETING.text },
  FINANZAS:   { label: 'Finanzas',   color: SB_COLORS.dept.FINANZAS.bg,   textColor: SB_COLORS.dept.FINANZAS.text },
  CALIDAD:    { label: 'Calidad',    color: SB_COLORS.dept.CALIDAD.bg,    textColor: SB_COLORS.dept.CALIDAD.text },
};
