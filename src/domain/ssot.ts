// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL v5 (UNIFIED)
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type Timestamp = string;
export type LotNumber = string;
export type ISO = string;

// --- Unidades de Medida (UoM) ---
export type UnitOfMass = 'kg' | 'g';
export type UnitOfVolume = 'L' | 'mL';
export type SalesUnit = 'unit' | 'bottle' | 'case' | 'pallet';
export type Uom = UnitOfMass | UnitOfVolume | SalesUnit;
export const UOM_ALIASES: Record<string, SalesUnit> = { uds: 'unit' };

export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship' | 'consignment_send' | 'consignment_return' | 'consignment_sell' | 'sample_send' | 'sample_consume';
export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';
export type TaskKind = 'VISITA' | 'PEDIDO' | 'POS_EVT' | 'POS_PLV' | 'NOTA';
export type TaskStatus = 'open' | 'done' | 'cancelled';

// --- Roles y Estados ---
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
export type AccountMode = 'DIRECTA' | 'COLOCACION'; // Legacy, use CommercialFlow
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
  createdAt: string; // ISO
  accountId?: string;
  accountName?: string;
  assets?: string[];
  location?: { lat:number; lng:number; ts:number };
  contactName?: string;
  starred?: boolean;
  derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' };
};

// --- Agenda (Task) ---
export type Task = {
  id: string;
  kind: TaskKind;
  createdAt: string;
  updatedAt: string;
  department: Department;
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
  taxId?: string;
  vat?: string; // Preferred over taxId
  billingAddress?: Address;
  shippingAddress?: Address;
  emails?: CommItem[];
  phones?: CommItem[];
  people?: Person[];
  tags?: string[];
  external?: { holdedContactId?: string; holdedUpdatedAt?: string; shopifyCustomerId?: string; };
  roles?: PartyRoleType[]; // Denormalized for quick filtering
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CustomerData {
  priceListId?: string;
  paymentTermsDays?: number;
  salesRepId: string;
  billerId: string; // 'SB' o un partyId de distribuidor
}

export interface PartyRole {
  id: string;
  partyId: string;
  role: PartyRoleType;
  isActive: boolean;
  createdAt: Timestamp;
  data?: CustomerData | any;
}

export interface PartyDuplicate {
  id: string;
  primaryPartyId: string;
  duplicatePartyId: string;
  reason: 'SAME_VAT' | 'SAME_EMAIL' | 'SAME_PHONE' | 'SIMILAR_NAME';
  score: number;
  status: 'OPEN' | 'MERGED' | 'DISMISSED';
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Legacy
  mode?: AccountMode;
  type?: AccountType;
  subType?: string;
  notes?: string;
  code?: string;
  lastInteractionAt?: string;
  external?: any;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  managerId?: string;
  kpiBaseline?: { revenue?: number; unitsSold?: number; visits?: number; };
}

// --- Pedidos y Envíos ---
export type OrderLine = { itemId: string; name?: string; qty: number; uom: SalesUnit; priceUnit: number; discountPct?: number; };
export interface OrderSellOut {
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string; // Denormalized
  flow?: 'PLACEMENT' | 'DIRECT'; // To distinguish origin
  distributorId?: string; // If PLACEMENT
  isSellOutReported?: boolean; // True if from distributor report, false if placed by SB comercial
  status: OrderStatus;
  billingStatus?: BillingStatus;
  lines: OrderLine[];
  totalAmount?: number;
  currency: Currency;
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  notes?: string;
  external?: { shopifyOrderId?: string; };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdById?: string;
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
  validatedAt?: Timestamp;
  validationNotes?: string;
  shippedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  createdAt: Timestamp;
  scheduledFor?: Timestamp;
  responsibleId?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  pauseLog?: { pausedAt: Timestamp; resumedAt?: Timestamp }[];
  execution?: { finishedAt?: Timestamp; goodUnits?: number; durationHours?: number };
  costing?: { actual?: { perUnit?: number; yieldLossPct?: number } };
  shortages?: any[];
  reservations?: any[];
  incidents?: any[];
  finalOutputs?: any[];
  finalConsumptions?: any[];
  journal?: JournalEntry[];
  checks?: boolean[];
  updatedAt?: Timestamp;
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
  expDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  receivedAt?: Timestamp;
}

// --- Interacciones y Marketing ---
export interface Interaction {
  id: string;
  userId: string;
  involvedUserIds?: string[];
  accountId: string;
  kind: InteractionKind;
  note?: string;
  plannedFor?: Timestamp;
  createdAt: Timestamp;
  status: InteractionStatus;
  resultNote?: string;
  dept?: Department;
  linkedEntity?: { type: 'ORDER' | 'SHIPMENT' | 'POS_TACTIC' | 'EVENT'; id: string };
  tags?: string[];
  location?: string;
  updatedAt?: Timestamp;
  outcome?: any;
}

// --- Otras entidades ---
export interface StockMove { id: string; itemId: string; lotNumber: string; qty: number; uom: Uom; reason: string; fromLocationId?: string; toLocationId?: string; occurredAt: Timestamp; createdAt: Timestamp; ref?: any; unitCost?: number; }
export interface GoodsReceipt { id: string; receiptNumber?: string; supplierPartyId: string; deliveryNote?: string; receivedAt: Timestamp; lines: any[]; status: 'pending_qc' | 'completed'; notes?: string; createdAt?: Timestamp; }
export interface OnHandView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: Timestamp | null; reservedQty?: number; createdAt: Timestamp; updatedAt: Timestamp; }
export interface LotGenealogyEdge { id: string; parentLotNumber: string; childLotNumber: string; qty: number; uom: Uom; createdAt: string; }
export interface ReservationView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number }
export interface MarketingEvent { id: string; title: string; startAt: string; endAt?: string; spend?: number; kpis?: any; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; city?: string; kind: EventKind; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string;}
export interface OnlineCampaign { id: string; title: string; channel: string; startAt: string; endAt?: string; budget?: number; spend?: number; metrics?: any; status: 'planned' | 'active' | 'closed' | 'cancelled'; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string; tracking?: { utmCampaign?: string; couponCode?: string; landingUrl?: string; }}
export interface InfluencerCollab { id: string; creatorName: string; platform: string; tier: string; status: any; dates?: any; costs?: any; tracking?: any; metrics?: any; deliverables?: any; compensation?: any; creatorId?:string; supplierPartyId?:string; ownerUserId?:string; createdAt:Timestamp; updatedAt:Timestamp; }
export interface PosTactic { id: string; accountId: string; tacticCode?: string; description?: string; customDesc?: string; catalogItemId?: string; qtyPlanned?: number; estCost?: number; actualCost: number; executionScore: number; status: PosTacticStatus; createdAt: Timestamp; createdById: string; items?: PosTacticItem[]; result?: any; taskId?: string; updatedAt: Timestamp; }
export interface PosCostCatalogEntry { id: string; name: string; family: string; fulfillmentMode: string; defaultCost?: number; defaultKpisTemplate?: any; }
export interface DeliveryNote { id: string; pdfUrl?: string; shipmentId: string; partyId: string; series: 'ONLINE'|'B2B'|'INTERNAL'; date: Timestamp; soldTo: any; shipTo: any; lines: any[]; company: any; createdAt: Timestamp; updatedAt: Timestamp; }
export interface QcPlanBySku { id: string; name: string; sku: string; specs: any[] }
export interface ParameterBySku { id: string; code: string; name: string; sku: string; unit?: string; method?: string; target?: number; tolerance?: number; range?: {min?:number,max?:number}, notes?: string }
export interface Protocol { id: string; title: string; code?: string; priority: 'PRP' | 'oPRP' | 'CCP'; active: boolean; checklist: string[]; criticalLimits?: string; monitoring?: string; correctiveActions?: string; verification?: string; records?: string; appliesToSkus?: string[]; createdAt?: Timestamp; updatedAt?: Timestamp; }
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
// 4. Metadatos y Constantes
// -----------------------------------------------------------------

export const SB_COLORS = {
  brand: {
    sun: '#fff5a9', sunStrong: '#fecb46', agua: '#99d9d9', cobre: '#c56a3c',
    naranja: '#ed6a36', verdeMar: '#5a9496', neutral50: '#FAFAFA', neutral900: '#111111',
  },
  primary: { sun: '#fff5a9', copper: '#c56a3c', aqua: '#99d9d9', teal: '#5a9496', },
  state: { success: '#22c55e', warning: '#fecb46', danger: '#ef4444', info: '#3b82f6', },
  lotQC: {
    release: { label: 'LIBERADO', bg: '#22c55e', text: '#ffffff' },
    hold: { label: 'RETENIDO', bg: '#fff5a9', text: '#111111' },
    reject: { label: 'RECHAZADO', bg: '#ef4444', text: '#ffffff' },
  },
};

export const SB_THEME = {
  chart: {
    line: ['hsl(var(--primary))', 'hsl(var(--cobre))', 'hsl(var(--agua))', 'hsl(var(--naranja))', 'hsl(var(--sb-verde-mar))'],
    grid: 'hsl(var(--border))',
  },
};

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
  open: { label: 'Abierto', accent: SB_COLORS.state.info },
  confirmed: { label: 'Confirmado', accent: SB_COLORS.primary.teal },
  shipped: { label: 'Enviado', accent: SB_COLORS.state.success },
  invoiced: { label: 'Facturado', accent: SB_COLORS.primary.copper },
  paid: { label: 'Pagado', accent: SB_COLORS.state.success },
  cancelled: { label: 'Cancelado', accent: SB_COLORS.state.danger },
  lost: { label: 'Perdido', accent: SB_COLORS.state.danger },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; accent: string }> = {
  pending: { label: 'Pendiente', accent: SB_COLORS.state.info },
  picking: { label: 'Picking', accent: SB_COLORS.primary.teal },
  ready_to_ship: { label: 'Validado', accent: SB_COLORS.primary.teal },
  shipped: { label: 'Enviado', accent: SB_COLORS.state.success },
  delivered: { label: 'Entregado', accent: SB_COLORS.state.success },
  cancelled: { label: 'Cancelado', accent: SB_COLORS.state.danger },
  exception: { label: 'Incidencia', accent: SB_COLORS.state.warning },
};

export const LOT_QC_META = SB_COLORS.lotQC;

export const DEPT_META: Record<Department, { label: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     color: '#ea945e', textColor: '#ffffff' },
  MARKETING:  { label: 'Marketing',  color: '#9dd4d6', textColor: '#2F5D5D' },
  PRODUCCION: { label: 'Producción', color: '#638c8d', textColor: '#ffffff' },
  CALIDAD:    { label: 'Calidad',    color: '#829fce', textColor: '#ffffff' },
  ALMACEN:    { label: 'Almacén',    color: '#996947', textColor: '#ffffff' },
  FINANZAS:   { label: 'Finanzas',   color: '#fecb46', textColor: '#412c00' },
  PERSONAL:   { label: 'Personal',   color: 'hsl(var(--sb-accent-personal))', textColor: 'hsl(var(--sb-neutral-900))' },
};

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; accent: string }> = {
  HORECA: { label: 'Horeca', accent: SB_COLORS.primary.copper },
  RETAIL: { label: 'Retail', accent: SB_COLORS.primary.aqua },
  DISTRIBUIDOR: { label: 'Distribuidor', accent: SB_COLORS.primary.teal },
  PRIVADA: { label: 'Venta Privada', accent: SB_COLORS.brand.naranja },
  ONLINE: { label: 'Online', accent: SB_COLORS.brand.sunStrong },
  OTRO: { label: 'Otro', accent: '#9ca3af' },
};

export const PHASE_DEPT: Record<TraceEventPhase, Department> = {
  SOURCE: 'PRODUCCION', RECEIPT: 'ALMACEN', QC: 'CALIDAD', PRODUCTION: 'PRODUCCION',
  PACK: 'PRODUCCION', WAREHOUSE: 'ALMACEN', SALE: 'VENTAS', DELIVERY: 'ALMACEN',
};
export const PHASE_NAME_ES: Record<TraceEventPhase, string> = {
  SOURCE: 'Origen', RECEIPT: 'Recepción', QC: 'Calidad', PRODUCTION: 'Producción',
  PACK: 'Envasado', WAREHOUSE: 'Almacén', SALE: 'Venta', DELIVERY: 'Entrega',
};


export const ITEM_CATEGORY_META: Record<ItemCategory, { label: string; }> = {
  fg: { label: "Producto Terminado" },
  raw: { label: "Materia Prima" },
  pack: { label: "Packaging" },
  label: { label: "Etiqueta" },
  intermediate: { label: "Producto Intermedio" },
  consumable: { label: "Consumible" },
  merch: { label: "Merchandising" },
};

export const MODULE_ACCENTS: Record<string, string> = {
  personal: "var(--sb-accent-personal)",
  sales: "var(--sb-accent-ventas)",
  marketing: "var(--sb-accent-marketing)",
  production: "var(--sb-accent-produccion)",
  quality: "var(--sb-accent-calidad)",
  warehouse: "var(--sb-accent-logistica)",
  finance: "var(--sb-accent-finance)",
  admin: "var(--sb-accent-admin)",
};

// -----------------------------------------------------------------
// 5. Helpers y Lógica Derivada
// -----------------------------------------------------------------
export const qcToBucket = (s?: QcStatus): LotBucket => {
  const norm = String(s ?? 'PENDING').toUpperCase();
  if (['PASSED', 'WAIVED', 'RELEASED', 'OK', 'APPROVED'].includes(norm)) return 'RELEASED';
  if (['FAILED', 'REJECTED'].includes(norm)) return 'REJECTED';
  return 'HOLD';
};

export const tokenToHsl = (token: string, alpha?: number) =>
  alpha == null ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

export type Payload =
  | { type: 'venta', items: { itemId: string, qty: number }[] }
  | { type: 'interaccion', note: string, nextActionDate?: string }
  | { type: 'pos', items: PosTacticItem[] };

export type OrderSellIn = any; // Placeholder para compatibilidad
export type ExecCheck = any; // Placeholder
