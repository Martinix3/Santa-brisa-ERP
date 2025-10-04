// FILE: src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL v5 (UNIFIED)
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type ISODateString = string;
/** @deprecated Use `ISODateString` for clarity. */
export type Timestamp = string;
export type LotNumber = string;

// --- Unidades de Medida (UoM) ---
export type UnitOfMass = 'kg' | 'g';
export type UnitOfVolume = 'L' | 'mL';
export type SalesUnit = 'unit' | 'bottle' | 'case' | 'pallet';
export type Uom = UnitOfMass | UnitOfVolume | SalesUnit;
export const UOM_ALIASES: Record<string, SalesUnit> = { uds: 'unit' };

// --- Enums y Tipos Literales ---
// NOTE: Casing inconsistency exists and should be unified in a future major refactor.
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL' | 'OPS';
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship' | 'consignment_send' | 'consignment_return' | 'consignment_sell' | 'sample_send' | 'sample_consume';
export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';
export type TaskKind = 'VISITA' | 'LLAMADA' | 'PEDIDO' | 'POS_EVT' | 'POS_PLV' | 'NOTA' | 'OTRO' | 'MKT' | 'QC' | 'FIN';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type BillingStatus = 'pending' | 'invoiced' | 'paid' | 'void';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';
export type ProductionStage = 'PRODUCCION' | 'ENVASADO';
export type ItemCategory = 'fg' | 'raw' | 'pack' | 'label' | 'intermediate' | 'consumable' | 'merch';
export type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
export type PosTacticStatus = 'planned' | 'approved' | 'scheduled' | 'delivered' | 'active' | 'closed' | 'cancelled';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type CommercialFlow = 'DIRECT' | 'PLACEMENT';
/** @deprecated Use `CommercialFlow` instead. */
export type AccountMode = 'DIRECTA' | 'COLOCACION';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';
export type PosCatalogItem = PosCostCatalogEntry;
export type PosResult = { upliftUnits: number; liftPct: number; roi: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; revenueAttributed: number };
export type VelocityInput = { itemId: string; qty: number; date: string; };

// -----------------------------------------------------------------
// 2. Interfaces de Entidades Principales
// -----------------------------------------------------------------

export type Note = {
  id: string;
  text: string;
  createdAt: ISODateString;
  accountId?: string;
  accountName?: string;
  assets?: string[];
  location?: { lat:number; lng:number; ts:number };
  contactName?: string;
  starred?: boolean;
  derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' };
};

// --- Contactos y Cuentas ---
export type Address = { street: string; city: string; zip: string; province?: string; country: string; countryCode?: string; };
export type CommItem = { value: string; isPrimary?: boolean; source?: string; verified?: boolean; updatedAt?: string; optOut?: boolean };
export type Person = { name: string; role?: string; email?: string; phone?: string };
export interface Party {
  id: string;
  name: string;
  kind: 'ORG' | 'PERSON';
  legalName?: string;
  tradeName?: string;
  /** @deprecated Use `vat` as the preferred field. */
  taxId?: string;
  vat?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  emails?: CommItem[];
  phones?: CommItem[];
  people?: Person[];
  tags?: string[];
  external?: { holdedContactId?: string; holdedUpdatedAt?: string; shopifyCustomerId?: string; };
  roles?: PartyRoleType[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  serviceArea?: any;
  location?: { lat: number, lng: number };
}

export interface CustomerData {
  priceListId?: string;
  paymentTermsDays?: number;
  salesRepId: string;
  billerId: string;
}

export interface PartyRole {
  id: string;
  partyId: string;
  role: PartyRoleType;
  isActive: boolean;
  createdAt: ISODateString;
  data?: CustomerData | any;
}

export interface PartyDuplicate {
  id: string;
  primaryPartyId: string;
  duplicatePartyId: string;
  reason: 'SAME_VAT' | 'SAME_EMAIL' | 'SAME_PHONE' | 'SIMILAR_NAME';
  score: number;
  status: 'OPEN' | 'MERGED' | 'DISMISSED';
  createdAt: ISODateString;
  resolvedAt?: ISODateString;
}

export type Segment = 'HORECA' | 'RETAIL' | 'ONLINE' | 'PRIVADA' | 'DISTRIBUIDOR';
export interface Account {
  id: string;
  partyId: string;
  name: string;
  segment: Segment;
  stage: Stage;
  ownerId: string;
  flow: CommercialFlow;
  distributorPartyId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastInteractionAt?: string;
  external?: any;
  // --- Legacy Fields ---
  /** @deprecated Use `flow` instead. */
  mode?: AccountMode;
  /** @deprecated Use `segment` instead. */
  type?: AccountType;
  /** @deprecated This field is no longer used. */
  subType?: string;
  /** @deprecated Use the `Note` entity instead. */
  notes?: string;
  /** @deprecated Use a dedicated `CodeAlias` entity instead. */
  code?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  managerId?: string;
  kpiBaseline?: { revenue?: number; unitsSold?: number; visits?: number; };
  assignedDistributors?: Array<{
    partyId: string;
    priority: number;
  }>;
}

// --- Pedidos y Envíos ---
export type OrderLine = { itemId: string; name?: string; qty: number; uom: SalesUnit; priceUnit: number; discountPct?: number; };
export interface OrderSellOut {
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string;
  flow?: 'PLACEMENT' | 'DIRECT';
  distributorId?: string;
  isSellOutReported?: boolean;
  status: OrderStatus;
  billingStatus?: BillingStatus;
  lines: OrderLine[];
  totalAmount?: number;
  currency: Currency;
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  notes?: string;
  external?: { shopifyOrderId?: string; };
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdById?: string;
  orderDate?: ISODateString;
  linkedPromotions?: string[];
}

export type ShipmentLine = { itemId: string; name: string; qty: number; uom: SalesUnit; lotNumber?: string; locationId?: string; note?: string };
export interface Shipment {
  id: string;
  shipmentNumber?: string;
  orderId: string;
  partyId: string;
  accountId: string;
  mode: 'PARCEL' | 'PALLET';
  status: ShipmentStatus;
  lines: ShipmentLine[];
  customerName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  carrier?: string;
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  deliveryNoteId?: string;
  holdedInvoiceId?: string;
  weightKg?: number;
  dimsCm?: { l: number; w: number; h: number };
  checks?: { visualOk?: boolean };
  isSample?: boolean;
  samplePurpose?: string;
  sampleNotes?: string;
  packedById?: string;
  validatedById?: string;
  validatedAt?: ISODateString;
  validationNotes?: string;
  shippedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  notes?: string;
}

// --- Producción y Calidad ---
export interface Item {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  uom: Uom;
  active: boolean;
  stdCost?: number;
  bottleMl?: number;
  caseUnits?: number;
}

export interface BillOfMaterial {
  id: string;
  outputItemId: string;
  name: string;
  stage?: ProductionStage;
  batchSize: number;
  baseUnit: Uom;
  items: { itemId: string; qty: number; uom: Uom, role?: 'FORMULA' | 'PACKAGING' | 'COST_ONLY' }[];
  isActive?: boolean;
}

export type JournalEntry = { id: string; at: string; kind: 'LOG'|'INCIDENT'; summary: string; data?: any };

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  bomId: string;
  outputItemId: string;
  targetQuantity: number;
  status: ProductionStatus;
  baseUnit: Uom;
  createdAt: ISODateString;
  scheduledFor?: ISODateString;
  responsibleId?: string;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  pauseLog?: { pausedAt: ISODateString; resumedAt?: ISODateString }[];
  execution?: { finishedAt?: ISODateString; goodUnits?: number; durationHours?: number };
  costing?: { actual?: { perUnit?: number; yieldLossPct?: number } };
  shortages?: any[];
  reservations?: any[];
  incidents?: any[];
  finalOutputs?: any[];
  finalConsumptions?: any[];
  journal?: JournalEntry[];
  checks?: boolean[];
  updatedAt?: ISODateString;
}

export interface Lot {
  id: string;
  lotNumber: LotNumber;
  itemId: string;
  itemName?: string;
  quantity: number;
  uom: Uom;
  qcStatus: QcStatus;
  status?: LotStatus;
  qcPlanId?: string;
  producedByOrderId?: string;
  createdByGoodsReceiptId?: string;
  parentLotNumber?: LotNumber;
  expDate?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  receivedAt?: ISODateString;
}

// --- Interacciones y Marketing ---
export interface Interaction {
  id: string;
  userId: string;
  involvedUserIds?: string[];
  accountId: string;
  kind: InteractionKind;
  note?: string;
  plannedFor?: ISODateString;
  createdAt: ISODateString;
  status: InteractionStatus;
  resultNote?: string;
  dept?: Department;
  linkedEntity?: { type: 'ORDER' | 'SHIPMENT' | 'POS_TACTIC' | 'EVENT'; id: string };
  tags?: string[];
  location?: string;
  updatedAt?: ISODateString;
  outcome?: any;
  // Campos para que funcione como agenda universal
  title?: string;
  startAt?: ISODateString;
  endAt?: ISODateString;
  durationMin?: number;
  uiKind?: TaskKind;
}

// Este tipo se puede mapear desde Interaction
export interface CalendarEvent {
  id: string;
  accountId?: string;
  accountName?: string;
  title: string;
  dept: Department;
  startAt: string;      // ISO
  endAt: string;        // ISO
  externalRef?: { provider:'google'|'outlook', id:string } | null;
  createdById?: string;
  updatedAt?: string;
}

// --- Otras entidades ---
export interface StockMove { id: string; itemId: string; lotNumber: string; qty: number; uom: Uom; reason: string; fromLocationId?: string; toLocationId?: string; occurredAt: ISODateString; createdAt: ISODateString; ref?: any; unitCost?: number; }
export interface GoodsReceipt { id: string; receiptNumber?: string; supplierPartyId: string; deliveryNote?: string; receivedAt: ISODateString; lines: any[]; status: 'pending_qc' | 'completed'; notes?: string; createdAt?: ISODateString; }
export interface OnHandView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: ISODateString | null; reservedQty?: number; createdAt: ISODateString; updatedAt: ISODateString; }
export interface LotGenealogyEdge { id: string; parentLotNumber: string; childLotNumber: string; qty: number; uom: Uom; createdAt: string; }
export interface ReservationView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number }
export interface MarketingEvent { id: string; title: string; startAt: string; endAt?: string; spend?: number; kpis?: any; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; city?: string; kind: EventKind; createdAt: ISODateString; updatedAt: ISODateString; ownerUserId?: string;}
export interface OnlineCampaign { id: string; title: string; channel: string; startAt: string; endAt?: string; budget?: number; spend?: number; metrics?: any; status: 'planned' | 'active' | 'closed' | 'cancelled'; createdAt: ISODateString; updatedAt: ISODateString; ownerUserId?: string; tracking?: { utmCampaign?: string; couponCode?: string; landingUrl?: string; }}
export interface InfluencerCollab { id: string; creatorName: string; platform: string; tier: string; status: any; dates?: any; costs?: any; tracking?: any; metrics?: any; deliverables?: any; compensation?: any; creatorId?:string; supplierPartyId?:string; ownerUserId?:string; createdAt:ISODateString; updatedAt:ISODateString; }
export interface PosTactic { id: string; accountId: string; tacticCode?: string; description?: string; customDesc?: string; catalogItemId?: string; qtyPlanned?: number; estCost?: number; actualCost: number; executionScore: number; status: PosTacticStatus; createdAt: ISODateString; createdById: string; items?: PosTacticItem[]; result?: any; taskId?: string; updatedAt: ISODateString; }
export interface PosCostCatalogEntry { id: string; name: string; family: string; fulfillmentMode: string; defaultCost?: number; defaultKpisTemplate?: any; }
export interface DeliveryNote { id: string; pdfUrl?: string; shipmentId: string; partyId: string; series: 'ONLINE'|'B2B'|'INTERNAL'; date: ISODateString; soldTo: any; shipTo: any; lines: any[]; company: any; createdAt: ISODateString; updatedAt: ISODateString; }
export interface QcPlanBySku { id: string; name: string; sku: string; specs: any[] }
export interface ParameterBySku { id: string; code: string; name: string; sku: string; unit?: string; method?: string; target?: number; tolerance?: number; range?: {min?:number,max?:number}, notes?: string }
export interface Protocol { id: string; title: string; code?: string; priority: 'PRP' | 'oPRP' | 'CCP'; active: boolean; checklist: string[]; criticalLimits?: string; monitoring?: string; correctiveActions?: string; verification?: string; records?: string; appliesToSkus?: string[]; createdAt?: ISODateString; updatedAt?: ISODateString; }
export interface QcTest { id: string; lotNumber: string; parameterId: string; valueNumeric?: number; valueText?: string; testedAt: string; testedBy: string; }
export interface ProtocolLog { id: string; productionOrderId: string; }
export interface PosTacticItem {}
export interface PlvMaterial {}
export interface Invoice {}
export interface PriceList {}
export interface AccountPriceOverride {}
export interface Activation {}
export interface Promotion {}
export interface MaterialCost {}
export interface FinanceLink { id: string; docType: string; externalId: string; status: 'pending' | 'paid' | 'overdue'; docNumber?: string; netAmount: number; taxAmount: number; grossAmount: number; currency: Currency; issueDate: string; dueDate: string; partyId?: string; costObject?: { kind: string; id: string; }; }
export interface PaymentLink { id: string; externalId: string; financeLinkId: string; amount: number; date: string; method?: string; }
export interface TraceEvent {
    id: string;
    at: string;
    title: string;
    details: string;
    links?: { prodOrderId?:string; lotNumber?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string;};
    data?: any;
    phase: TraceEventPhase;
    kind: TraceEventKind;
}
export interface Incident {}
export interface CodeAlias {}
export interface Integration {}
export interface Job {}
export interface DeadLetter {}
export interface Expense {}
export interface Task {
    id: string;
    title: string;
    dueAt: string;
    status: TaskStatus;
}


// -----------------------------------------------------------------
// 3. Estructura de Datos Unificada `SantaData`
// -----------------------------------------------------------------
export interface SantaData {
  parties: Party[];
  partyRoles: PartyRole[];
  partyDuplicates: PartyDuplicate[];
  users: User[];
  accounts: Account[];
  ordersSellOut: OrderSellOut[];
  interactions: Interaction[];
  items: Item[];
  billOfMaterials: BillOfMaterial[];
  productionOrders: ProductionOrder[];
  lots: Lot[];
  lotGenealogy: LotGenealogyEdge[];
  onHand: OnHandView[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  deliveryNotes: DeliveryNote[];
  qcPlans: QcPlanBySku[];
  qcParameters: ParameterBySku[];
  qcTests: QcTest[];
  qcProtocols: Protocol[];
  protocolLogs: ProtocolLog[];
  marketingEvents: MarketingEvent[];
  onlineCampaigns: OnlineCampaign[];
  influencerCollabs: InfluencerCollab[];
  posTactics: PosTactic[];
  posCostCatalog: PosCostCatalogEntry[];
  plv_material: PlvMaterial[];
  reservations?: ReservationView[];
  notes?: Note[];
  // Deprecated collections - mantain for data migration, then remove
  inventory?: any[];
  products?: any[];
  materials?: any[];
  suppliers?: any[];
  distributors?: any[];
  // Future collections
  materialCosts?: MaterialCost[];
  financeLinks?: FinanceLink[];
  paymentLinks?: PaymentLink[];
  traceEvents?: TraceEvent[];
  incidents?: Incident[];
  codeAliases?: CodeAlias[];
  integrations?: Integration[];
  jobs?: Job[];
  dead_letters?: DeadLetter[];
  expenses?: Expense[];
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
  "parties", "partyRoles", "partyDuplicates", "users", "accounts", "ordersSellOut", "interactions",
  "items", "billOfMaterials", "productionOrders", "lots", "lotGenealogy", "onHand", "stockMoves", "shipments",
  "goodsReceipts", "deliveryNotes", "qcPlans", "qcParameters", "qcTests", "qcProtocols", "protocolLogs",
  "marketingEvents", "onlineCampaigns", "influencerCollabs", "posTactics", "posCostCatalog",
  "plv_material", "reservations", "notes"
];


// -----------------------------------------------------------------
// 4. Metadatos y Constantes (UNIFICADO CON CSS TOKENS)
// -----------------------------------------------------------------

/**
 * Contiene los nombres de las variables CSS de `globals.css` para ser
 * usadas de forma segura en TypeScript. Evita el uso de strings mágicos.
 */
export const SB_CSS_VARS = {
  ACCENT_VENTAS: '--sb-accent-ventas',
  ACCENT_MARKETING: '--sb-accent-marketing',
  ACCENT_PRODUCCION: '--sb-accent-produccion',
  ACCENT_CALIDAD: '--sb-accent-calidad',
  ACCENT_LOGISTICA: '--sb-accent-logistica',
  ACCENT_FINANCE: '--sb-accent-finance',
  ACCENT_PERSONAL: '--sb-accent-personal',
  ACCENT_ADMIN: '--sb-accent-admin',
  ACCENT_OPS: '--sb-accent-ops', // Asumiendo que existe, si no, usar admin
  SUCCESS: '--success',
  DESTRUCTIVE: '--destructive',
  INFO: '--info',
  WARNING: '--primary', // El amarillo primario se usa para avisos
  PRIMARY: '--primary',
  PRIMARY_FOREGROUND: '--primary-foreground',
  MUTED_FOREGROUND: '--muted-foreground',
} as const;

export const DEPT_META: Record<Department, { label: string; colorVar: string }> = {
  VENTAS:     { label: 'Ventas',     colorVar: `var(${SB_CSS_VARS.ACCENT_VENTAS})` },
  MARKETING:  { label: 'Marketing',  colorVar: `var(${SB_CSS_VARS.ACCENT_MARKETING})` },
  PRODUCCION: { label: 'Producción', colorVar: `var(${SB_CSS_VARS.ACCENT_PRODUCCION})` },
  CALIDAD:    { label: 'Calidad',    colorVar: `var(${SB_CSS_VARS.ACCENT_CALIDAD})` },
  ALMACEN:    { label: 'Almacén',    colorVar: `var(${SB_CSS_VARS.ACCENT_LOGISTICA})` },
  FINANZAS:   { label: 'Finanzas',   colorVar: `var(${SB_CSS_VARS.ACCENT_FINANCE})` },
  PERSONAL:   { label: 'Personal',   colorVar: `var(${SB_CSS_VARS.ACCENT_PERSONAL})` },
  OPS:        { label: 'Operaciones',colorVar: `var(${SB_CSS_VARS.ACCENT_OPS})` },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; colorVar: string }> = {
  open:       { label: 'Abierto',    colorVar: `var(${SB_CSS_VARS.INFO})` },
  confirmed:  { label: 'Confirmado', colorVar: `var(${SB_CSS_VARS.PRIMARY})` },
  shipped:    { label: 'Enviado',    colorVar: `var(${SB_CSS_VARS.SUCCESS})` },
  invoiced:   { label: 'Facturado',  colorVar: `var(${SB_CSS_VARS.ACCENT_VENTAS})` },
  paid:       { label: 'Pagado',     colorVar: `var(${SB_CSS_VARS.SUCCESS})` },
  cancelled:  { label: 'Cancelado',  colorVar: `var(${SB_CSS_VARS.DESTRUCTIVE})` },
  lost:       { label: 'Perdido',    colorVar: `var(${SB_CSS_VARS.DESTRUCTIVE})` },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; colorVar: string }> = {
    pending: { label: 'Pendiente', colorVar: `var(${SB_CSS_VARS.INFO})` },
    picking: { label: 'Picking', colorVar: `var(${SB_CSS_VARS.PRIMARY})` },
    ready_to_ship: { label: 'Validado', colorVar: `var(${SB_CSS_VARS.PRIMARY})` },
    shipped: { label: 'Enviado', colorVar: `var(${SB_CSS_VARS.SUCCESS})` },
    delivered: { label: 'Entregado', colorVar: `var(${SB_CSS_VARS.SUCCESS})` },
    cancelled: { label: 'Cancelado', colorVar: `var(${SB_CSS_VARS.DESTRUCTIVE})` },
    exception: { label: 'Incidencia', colorVar: `var(${SB_CSS_VARS.WARNING})` },
};

export const LOT_QC_META: Record<LotBucket, { label: string; colorVar: string }> = {
    RELEASED: { label: 'LIBERADO', colorVar: `var(${SB_CSS_VARS.SUCCESS})` },
    HOLD: { label: 'RETENIDO', colorVar: `var(${SB_CSS_VARS.WARNING})` },
    REJECTED: { label: 'RECHAZADO', colorVar: `var(${SB_CSS_VARS.DESTRUCTIVE})` },
};

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; colorVar: string }> = {
  HORECA: { label: 'Horeca', colorVar: `var(${SB_CSS_VARS.ACCENT_VENTAS})` },
  RETAIL: { label: 'Retail', colorVar: `var(${SB_CSS_VARS.ACCENT_MARKETING})` },
  DISTRIBUIDOR: { label: 'Distribuidor', colorVar: `var(${SB_CSS_VARS.ACCENT_LOGISTICA})` },
  PRIVADA: { label: 'Venta Privada', colorVar: `var(${SB_CSS_VARS.ACCENT_VENTAS})` },
  ONLINE: { label: 'Online', colorVar: `var(${SB_CSS_VARS.PRIMARY})` },
  OTRO: { label: 'Otro', colorVar: `var(${SB_CSS_VARS.MUTED_FOREGROUND})` },
};

export const SB_THEME = {
  chart: {
    line: [
        `hsl(var(${SB_CSS_VARS.PRIMARY}))`, 
        `hsl(var(${SB_CSS_VARS.ACCENT_VENTAS}))`, 
        `hsl(var(${SB_CSS_VARS.ACCENT_MARKETING}))`, 
        `hsl(var(${SB_CSS_VARS.ACCENT_PRODUCCION}))`
    ],
    grid: `hsl(var(--border))`,
  },
};

// ... (El resto de constantes META se mantendrían igual) ...

// -----------------------------------------------------------------
// 5. Helpers y Lógica Derivada
// -----------------------------------------------------------------
export const qcToBucket = (s?: QcStatus): LotBucket => {
  const norm = String(s ?? 'PENDING').toUpperCase();
  if (['PASSED', 'WAIVED', 'RELEASED', 'OK', 'APPROVED'].includes(norm)) return 'RELEASED';
  if (['FAILED', 'REJECTED'].includes(norm)) return 'REJECTED';
  return 'HOLD';
};

/**
 * Genera una string HSL para usar en estilos JS, a partir de una variable CSS.
 * @example tokenToHsl('var(--primary)', 0.5) // hsl(var(--primary) / 0.5)
 */
export const tokenToHsl = (cssVar: string, alpha?: number) =>
  alpha == null ? `hsl(${cssVar})` : `hsl(${cssVar} / ${alpha})`;

export type Payload =
  | { type: 'venta', items: { itemId: string, qty: number }[] }
  | { type: 'interaccion', note: string, nextActionDate?: string }
  | { type: 'pos', items: PosTacticItem[] };

export type OrderSellIn = any; // Placeholder para compatibilidad
export type ExecCheck = any; // Placeholder