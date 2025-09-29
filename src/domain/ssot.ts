// src/domain/ssot.ts
// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL V4
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------
export type Timestamp = string; // ISO string for full date-time
export type LotNumber = string;      // alias semántico
export type ISO = string;            // si quieres usarlo en campos no Timestamp

// --- Refactorización de Unidades de Medida ---
export type UnitOfMass = 'kg' | 'g';
export type UnitOfVolume = 'L' | 'mL';
export type SalesUnit = 'bottle' | 'case' | 'pallet' | 'uds'; // 'unit' estandarizado a 'uds'

export type Uom = UnitOfMass | UnitOfVolume | SalesUnit; // Tipo unificado

export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';
export type ProductionStage = 'PRODUCCION' | 'ENVASADO';
export type ItemCategory = 'fg' | 'raw' | 'pack' | 'label' | 'intermediate' | 'consumable' | 'merch';
export type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
export type PosTacticStatus = 'planned' | 'active' | 'closed' | 'cancelled';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';


export function qcToBucket(qc: QcStatus): LotBucket {
  switch (qc) {
    case 'PASSED':
    case 'WAIVED': return 'RELEASED';
    case 'FAILED': return 'REJECTED';
    default: return 'HOLD';
  }
}

export const ITEM_CATEGORY_META: Record<ItemCategory, { label: string; }> = {
  fg: { label: "Producto Terminado" },
  raw: { label: "Materia Prima" },
  pack: { label: "Packaging" },
  label: { label: "Etiqueta" },
  intermediate: { label: "Producto Intermedio" },
  consumable: { label: "Consumible" },
  merch: { label: "Merchandising" },
};

// -----------------------------------------------------------------
// 2. Modelo Party / Role (Contacto Unificado)
// -----------------------------------------------------------------
export type Address = { address?: string; city?: string; zip?: string; province?: string; country?: string; countryCode?: string; };
export type CommItem = { value: string; isPrimary?: boolean; verified?: boolean; source?: 'CRM' | 'HOLDED' | 'IMPORT' | 'USER'; updatedAt?: Timestamp; optOut?: boolean; };
export interface PartyPerson { name: string; role?: string; email?: CommItem; phone?: CommItem; updatedAt?: Timestamp; }

export interface Party {
  id: string;
  name: string;
  kind: 'ORG' | 'PERSON';
  legalName: string;
  tradeName?: string;
  taxId?: string;
  vat?: string;
  emails?: CommItem[];
  phones?: CommItem[];
  billingAddress?: Address;
  shippingAddress?: Address;
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  tags?: string[];
  external?: { holdedContactId?: string; holdedUpdatedAt?: Timestamp; shopifyCustomerId?: string; };
  people?: PartyPerson[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PartyDuplicate {
    id: string;
    primaryPartyId: string;
    duplicatePartyId: string;
    reason: 'SAME_VAT' | 'SAME_EMAIL' | 'SAME_PHONE' | 'SIMILAR_NAME';
    score: number;
    status: 'OPEN' | 'MERGED' | 'DISMISSED';
    createdAt: string;
    resolvedAt?: string;
}

export interface CustomerData { priceListId?: string; paymentTermsDays?: number; salesRepId: string; billerId: string; }
export interface SupplierData { paymentTermsDays?: number; bankAccountNumber?: string; }
export interface InfluencerData { tier: 'nano' | 'micro' | 'mid' | 'macro'; audienceSize?: number; }
export interface EmployeeData { department: Department; managerId?: string; startDate: ISO; }

export interface PartyRole {
  id: string; partyId: string; role: PartyRoleType; isActive: boolean;
  data: CustomerData | SupplierData | InfluencerData | EmployeeData; createdAt: Timestamp;
}

export interface User {
  id: string; name: string; email?: string; role: UserRole; active: boolean; managerId?: string;
  kpiBaseline?: { revenue?: number; unitsSold?: number; visits?: number; }
}

export interface Account {
  id: string; code?: string; partyId: string; name: string; type: AccountType; stage: Stage; subType?: string;
  ownerId: string; createdAt: Timestamp; updatedAt?: Timestamp; lastInteractionAt?: Timestamp; notes?: string;
  external?: { shopifyCustomerId?: string; holdedContactId?: string; vat?: string; }
}

// -----------------------------------------------------------------
// 3. Catálogos y Producción
// -----------------------------------------------------------------
export interface Item {
  id: string; sku: string; name: string; category: ItemCategory;
  uom: Uom; active: boolean;
  bottleMl?: number; caseUnits?: number; casesPerPallet?: number; stdCost?: number;
}

export type BomLineRole = 'FORMULA' | 'PACKAGING';
export interface BillOfMaterial {
  id: string; outputItemId: string; name: string; batchSize: number; baseUnit: Uom; stage?: ProductionStage;
  items: Array<{ itemId: string; qty: number; uom: Uom; role?: BomLineRole; }>;
  qcPlanId?: string;
}

export type ExecCheck = { id: string; done: boolean; checkedBy?: string; checkedAt?: string };
export interface ProductionOrder {
  id: string; orderNumber?: string; bomId: string; outputItemId: string; targetQuantity: number; status: ProductionStatus;
  createdAt: Timestamp; scheduledFor?: Timestamp; batchCode?: LotNumber; responsibleId?: string; name?: string; baseUnit?: Uom;
  checks?: ExecCheck[];
  incidents?: { id: string; when: Timestamp; severity: 'BAJA' | 'MEDIA' | 'ALTA'; text: string }[];
  reservations?: any[]; shortages?: any[]; actuals?: any[]; output?: any[]; execution?: any; costing?: any;
  pauseLog?: { pausedAt: Timestamp; resumedAt?: Timestamp }[];
}


// -----------------------------------------------------------------
// 4. Inventario, Trazabilidad y Calidad
// -----------------------------------------------------------------
export type StockReason =
  | 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment'
  | 'return_in' | 'return_out' | 'ship' | 'consignment_send' | 'consignment_return' | 'consignment_sell'
  | 'sample_send' | 'sample_consume';

export interface StockMove {
  id: string; itemId: string; qty: number; uom: Uom; lotNumber?: LotNumber;
  fromLocationId?: string; toLocationId?: string;
  reason: StockReason; occurredAt: Timestamp; createdAt: Timestamp; unitCost?: number;
  ref?: { prodOrderId?: string; goodsReceiptId?: string; shipmentId?: string; orderId?: string };
}

export interface OnHandView {
  id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom;
  qcStatus: QcStatus; category: ItemCategory; expiryAt?: string | null; reservedQty?: number;
  createdAt: string; updatedAt: string;
}

export interface ReservationView {
    id: string;
    itemId: string;
    lotNumber: string;
    locationId: string;
    qty: number;
    uom: Uom;
    refType: 'ORDER' | 'PROD_ORDER';
    refId: string;
    createdAt: Timestamp;
}

export interface Lot {
  id: string;
  lotNumber: LotNumber;
  itemId: string;
  itemName?: string;
  quantity: number;
  status?: LotStatus;
  createdAt: Timestamp;
  orderId?: string;
  supplierId?: string;
  qcStatus: QcStatus;
  qcPlanId?: string;
  expDate?: Timestamp;
  receivedAt?: Timestamp;
  producedByOrderId?: string;
  createdByGoodsReceiptId?: string;
  parentLotNumber?: LotNumber;
}

export interface LotGenealogyEdge {
    id: string;
    parentLotNumber: LotNumber;
    childLotNumber: LotNumber;
    qty: number;
    uom: Uom;
    createdAt: Timestamp;
}

export interface TraceEvent {
  id: string;
  at: string;
  kind: TraceEventKind;
  title: string;
  details: string;
  data?: Record<string, any>;
  subject?: { type: 'LOT' | 'BATCH' | 'ORDER' | 'SHIPMENT'; id: string; };
  phase?: TraceEventPhase;
  links?: { lotNumber?: LotNumber; prodOrderId?: string; lotId?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string; };
}

export type QCResult = { value?: number | string | boolean; notes?: string; status: 'ok' | 'ko'; };
export interface QACheck {
  id: string;
  lotId: LotNumber;
  summaryStatus: 'ok' | 'ko';
  createdAt: Timestamp;
  results: Record<string, QCResult>; // { "param_id_1": { value: 1.2, status: 'ok' } }
}

export interface QcTest {
    id: string;
    lotNumber: LotNumber;
    parameterId: string;
    valueNumeric?: number;
    valueText?: string;
    inSpec?: boolean;
    testedBy: string;
    testedAt: Timestamp;
    createdAt: Timestamp;
}

export interface ParameterBySku {
  id: string;               // param_<sku>_<code> (único)
  sku: string;
  code: string;     // p.ej. 'pH', 'ALC_VOL', 'BRIX'
  name: string;     // legible
  unit?: string;
  method?: string; // LAB / SENSORIAL / INSTRUMENTAL
  target?: number;
  tolerance?: number;
  range?: {
    min?: number;
    max?: number;
    inclusiveMin?: boolean;
    inclusiveMax?: boolean;
  };
  notes?: string;
  createdAt?: ISO;
  updatedAt?: ISO;
}

export interface QcSpec {
  id: string; // spec_<...>
  parameterId: string; // referencia a ParameterBySku.id
  point: string; // RECEPCION | PROCESO | ENVASADO | ALMACEN | PRE-ENVIO
  method?: string;
  unit?: string;
  target?: number;
  tolerance?: number;
  range?: {
    min?: number;
    max?: number;
    inclusiveMin?: boolean;
    inclusiveMax?: boolean;
  };
};

export interface QcPlanBySku {
  id: string; // plan_<sku>_<slug>
  sku: string;
  name: string;
  specs: QcSpec[];
  createdAt?: ISO; updatedAt?: ISO;
}

export interface ProtocolLog {
    id: string;
    productionOrderId: string;
    protocolId: string;
    checkedAt: Timestamp;
    checkedBy: string;
    status: 'COMPLETED' | 'SKIPPED' | 'FAILED';
    notes?: string;
}

export interface Protocol {
  id: string;            // prot_<slug>
  title: string;
  code?: string;
  priority: 'PRP'|'oPRP'|'CCP';
  active: boolean;
  // APPCC: detalla cada protocolo como plan con sus elementos clave:
  criticalLimits?: string;   // solo aplica a CCP
  monitoring?: string;
  correctiveActions?: string;
  verification?: string;
  records?: string;
  checklist: string[];
  appliesToSkus?: string[]; // si vacío => global
  createdAt?: ISO; updatedAt?: ISO;
}

// -----------------------------------------------------------------
// 5. Documentos Operativos (Ventas, Compras, Envíos)
// -----------------------------------------------------------------
export type BillingStatus = 'PENDING' | 'INVOICING' | 'INVOICED' | 'PAID' | 'FAILED';
export interface OrderSellOut {
  id: string; docNumber?: string; partyId: string; accountId: string; source: 'CRM' | 'SHOPIFY' | 'OTHER' | 'MANUAL' | 'HOLDED';
  createdAt: Timestamp; currency: Currency;
  lines: Array<{ itemId: string; name?: string; qty: number; priceUnit: number; taxRate?: number; discountPct?: number; uom?: Uom | 'uds'; lotNumbers?: LotNumber[]; }>;
  notes?: string;
  status: OrderStatus;
  totalAmount?: number;
  external?: { shopifyOrderId?: string; holdedInvoiceId?: string; };
}

export interface GoodsReceipt {
  id: string; receiptNumber?: string; supplierPartyId: string; receivedAt: Timestamp; deliveryNote?: string;
  status: 'pending_qc' | 'completed' | 'partial'; currency?: Currency;
  lines: Array<{ itemId: string; qty: number; uom: Uom; unitCost: number; lotNumber: LotNumber; }>;
  notes?: string | null;
}

export interface ShipmentLine { itemId: string; name?: string; qty: number; uom: Uom | 'uds'; lotNumber?: LotNumber; }
export interface Shipment {
  id: string; shipmentNumber?: string; orderId: string; accountId: string; partyId: string; mode: 'PARCEL' | 'PALLET';
  createdAt: Timestamp; updatedAt: Timestamp; status: ShipmentStatus; lines: ShipmentLine[];
  customerName: string; city: string; addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string; labelUrl?: string; trackingCode?: string; trackingUrl?: string; notes?: string;
  packedById?: string; checks?: { visualOk?: boolean }; isSample?: boolean; samplePurpose?: 'sales' | 'qc' | 'mkt' | 'other';
  sampleNotes?: string; weightKg?: number; dimsCm?: { l: number; w: number; h: number };
  deliveryNoteId?: string; holdedDeliveryId?: string; holdedInvoiceId?: string;
}

export interface DeliveryNote {
    id: string;
    orderId: string;
    shipmentId: string;
    partyId: string;
    series: 'B2B' | 'ONLINE' | 'INTERNAL';
    date: Timestamp;
    soldTo: { name: string; vat?: string };
    shipTo: { name: string; address: string; zip: string; city: string; country: string };
    lines: Array<{ itemId: string; description: string; qty: number; uom: Uom; lotNumbers: LotNumber[] }>;
    company: { name: string; vat?: string; address?: string; city?: string; zip?: string; country?: string };
    pdfUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type Payload =
    | { type: 'venta', items: { itemId: string; qty: number }[] }
    | { type: 'interaccion', note: string, nextActionDate?: string }
    | { type: 'visita_plv', note: string, nextActionDate?: string, plvInstalled: boolean, plvNotes?: string }
    | { type: 'cobro', amount: number, notes?: string }
    | { type: 'evento_mkt', kpis: { cost: number; attendees: number; leads: number }, notes?: string };

export type JournalEntry = { id: string; at: string; kind: 'START' | 'PAUSE' | 'RESUME' | 'NOTE' | 'INCIDENT' | 'FINISH'; summary: string };

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
    type: 'Order' | 'Account' | 'EVENT' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction' | 'PosTactic';
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

export type ActivationType = 'bartender_day' | 'tasting' | 'event' | 'other_experience';
export interface Activation {
    id: string;
    accountId: string;
    type: ActivationType;
    cost: number;
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
    updatedAt: string;
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
  itemId: string;
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
  currency: 'EUR';
  issueDate: string;
  dueDate: string;
  docNumber?: string;
  partyId?: string;
  expenseCategory?: ExpenseCategory;
  costObject?: { kind: CostObjectKind; id: string };
  allocationPct?: number;
  campaignId?: string; eventId?: string; collabId?: string;
}
export interface PaymentLink { id: string; financeLinkId: string; externalId?: string; amount: number; date: string; method?: string; }
export type VelocityInput = { itemId: string; qty: number; date: string; };
export interface PosUom {
    id: string;
    // Add other properties if needed
}
export interface PosCostCatalogEntry {
    id: string;
    code: string;
    label: string;
    defaultUnitCost?: number;
    uom?: 'UNIT' | 'HOUR' | 'BATCH'; // Adjust as needed
    vendor?: string;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    createdAt?: string;
    createdById?: string;
    updatedAt?: string;
}
export interface PlvMaterial {
    id: string;
    itemId?: string;
    kind: 'SHELF_TALKER' | 'STANDEE' | 'FRIDGE_STICKER' | 'HANGING' | 'GONDOLA' | 'OTHER';
    purchaseCost?: number;
    purchaseDate?: string;
    expectedLifespanMonths?: number;
    expectedUses?: number;
    usesCount?: number;
    status: 'IN_STOCK' | 'INSTALLED' | 'DAMAGED' | 'RETIRED';
    accountId?: string;
    installedAt?: string;
    photoUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface PosTacticItem {
    id: string;
    catalogCode?: string;
    description: string;
    qty?: number;
    unitCost?: number;
    actualCost: number;
    uom?: 'UNIT' | 'HOUR' | 'BATCH';
    vendor?: string;
    assetId?: string; // Links to PlvMaterial.id
    attachments?: string[];
}
export interface PosResult {
    roi?: number;
    liftPct?: number;
    upliftUnits?: number;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
    revenueAttributed?: number;
}
export interface PosTactic {
    id: string;
    accountId: string;
    eventId?: string;
    interactionId?: string;
    orderId?: string;
    tacticCode: string;
    description?: string;
    appliesToItemIds?: string[];
    items: PosTacticItem[];
    plannedCost?: number;
    actualCost: number;
    executionScore: number;
    status: PosTacticStatus;
    createdAt: string;
    createdById: string;
    updatedAt?: string;
    result?: PosResult;
}

export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';

export interface CodePolicy {
  entity: CodeEntity;
  template: string;
  regex: string;
  seqScope?: 'GLOBAL' | 'YEAR' | 'MONTH' | 'DAY';
  pad?: number;
}

export type ExternalSystem = 'HOLDED' | 'SHOPIFY' | 'EAN' | 'GTIN' | 'CUSTOMER_REF' | 'SUPPLIER_REF';

export interface CodeAlias {
  id: string;
  entity: CodeEntity;
  entityId: string;
  system: ExternalSystem;
  code: string;
  createdAt: string;
}

export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
export interface Incident {
  id: string;
  kind: IncidentKind;
  status: IncidentStatus;
  openedAt: string;
  closedAt?: string;
  dept?: Department;
  partyId?: string;
  lotNumber?: string;
  goodsReceiptId?: string;
  shipmentId?: string;
  orderId?: string;
  description?: string;
  photos?: string[];
  correctiveActions?: { note: string; at: string; byUserId?: string }[];
  notes?: string;
}

// -----------------------------------------------------------------
// 6. Lista de Colecciones de la Base de Datos
// -----------------------------------------------------------------
export interface SantaData {
  items: Item[];
  stockMoves: StockMove[];
  productionOrders: ProductionOrder[];
  ordersSellOut: OrderSellOut[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  onHand: OnHandView[];
  parties: Party[];
  partyRoles: PartyRole[];
  accounts: Account[];
  users: User[];
  interactions: Interaction[];
  billOfMaterials: BillOfMaterial[];
  lots: Lot[];
  partyDuplicates: PartyDuplicate[];
  qcParameters: ParameterBySku[];
  qcPlans: QcPlanBySku[];
  qcTests: QcTest[];
  deliveryNotes: DeliveryNote[];
  lotGenealogy: LotGenealogyEdge[];
  marketingEvents: MarketingEvent[];
  onlineCampaigns: OnlineCampaign[];
  influencerCollabs: InfluencerCollab[];
  posTactics: PosTactic[];
  posCostCatalog: PosCostCatalogEntry[];
  plv_material: PlvMaterial[];
  reservations?: ReservationView[];

  // Deprecated / To be removed
  qaChecks: any[];
  inventory: any[];
  products: any[];
  materials: any[];
  suppliers: any[];
  distributors: any[];
  // Placeholders / Future
  [key: string]: any;
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
  'items', 'stockMoves', 'productionOrders', 'ordersSellOut', 'shipments', 'goodsReceipts',
  'onHand', 'parties', 'partyRoles', 'accounts', 'users', 'interactions', 'billOfMaterials', 'lots',
  'partyDuplicates', 'qcParameters', 'qcPlans', 'qcTests', 'deliveryNotes', 'lotGenealogy', 'marketingEvents', 'onlineCampaigns', 'influencerCollabs',
  'posTactics', 'posCostCatalog', 'plv_material',
  // Deprecated
  'qaChecks', 'inventory', 'products', 'materials', 'suppliers', 'distributors', 'reservations'
];

export * from './ssot.metas';
