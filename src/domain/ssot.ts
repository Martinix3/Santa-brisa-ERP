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
export type SalesUnit = 'bottle' | 'case' | 'pallet' | 'uds';
export type Uom = UnitOfMass | UnitOfVolume | SalesUnit;
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';

// --- Roles y Estados ---
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
export type CommercialFlow = 'DIRECT' | 'PLACEMENT';
export type AccountMode = 'DIRECTA' | 'COLOCACION'; // Legacy, use CommercialFlow

// -----------------------------------------------------------------
// 2. Interfaces de Entidades Principales
// -----------------------------------------------------------------

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
export interface OrderSellOut {
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string; // Denormalized
  flow?: 'PLACEMENT' | 'DIRECT'; // To distinguish origin
  distributorId?: string; // If PLACEMENT
  isSellOutReported?: boolean; // True if from distributor report, false if placed by SB comercial
  status: OrderStatus;
  billingStatus?: 'PENDING' | 'INVOICED' | 'PAID' | 'VOID';
  lines: { itemId: string; name?: string; qty: number; uom: 'unit' | 'uds'; priceUnit: number; discountPct?: number; }[];
  totalAmount?: number;
  currency: Currency;
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  notes?: string;
  external?: { shopifyOrderId?: string; };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Shipment {
  id: string;
  shipmentNumber?: string;
  orderId: string;
  partyId: string;
  accountId: string;
  mode: 'PARCEL' | 'PALLET';
  status: ShipmentStatus;
  lines: { itemId: string; name: string; qty: number; uom: 'unit' | 'uds'; lotNumber?: string; locationId?: string }[];
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
  invoiceId?: string;
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
  stage?: 'PRODUCCION' | 'ENVASADO';
  batchSize: number;
  baseUnit: Uom;
  items: { itemId: string; qty: number; uom: Uom, role?: 'FORMULA' | 'PACKAGING' | 'COST_ONLY' }[];
  isActive?: boolean;
}

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  bomId: string;
  outputItemId: string;
  targetQuantity: number;
  status: ProductionStatus;
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
export interface OnHandView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: string | null; reservedQty?: number; createdAt: string; updatedAt: string; }
export interface LotGenealogyEdge { id: string; parentLotNumber: string; childLotNumber: string; qty: number; uom: Uom; createdAt: string; }
export interface ReservationView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number }
export interface MarketingEvent { id: string; title: string; startAt: string; endAt?: string; spend?: number; kpis?: any; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; }
export interface OnlineCampaign { id: string; title: string; channel: string; startAt: string; endAt?: string; spend?: number; metrics?: any; status: 'planned' | 'active' | 'closed' | 'cancelled'; }
export interface InfluencerCollab { id: string; creatorName: string; platform: string; tier: string; status: any; dates?: any; costs?: any; tracking?: any; metrics?: any; deliverables?: any; compensation?: any; }
export interface PosTactic { id: string; accountId: string; tacticCode?: string; description?: string; catalogItemId?: string; qtyPlanned?: number; estCost?: number; actualCost: number; executionScore: number; status: 'planned' | 'active' | 'closed' | 'cancelled'; createdAt: string; items?: any; result?: any; taskId?: string }
export interface PosCostCatalogEntry { id: string; name: string; family: string; defaultCost?: number; fulfillmentMode: string; defaultKpisTemplate?: any; }
export interface DeliveryNote { id: string; pdfUrl?: string; shipmentId: string; partyId: string; }
export interface QcPlanBySku { id: string; name: string; sku: string; specs: any[] }
export interface ParameterBySku { id: string; name: string; sku: string; }
export interface Protocol { id: string; title: string; }
export interface QcTest { id: string; lotNumber: string; parameterId: string; valueNumeric?: number; valueText?: string; testedAt: string; testedBy: string; }
export interface ProtocolLog { productionOrderId: string; }
export interface PosTacticItem {}
export interface PlvMaterial {}
export interface OrderSellIn {}
export interface Invoice {}
export interface PriceList {}
export interface AccountPriceOverride {}
export interface Activation {}
export interface Promotion {}
export interface MaterialCost {}
export interface FinanceLink {}
export interface PaymentLink {}
export interface TraceEvent {}
export interface Incident {}
export interface CodeAlias {}
export interface Job {}
export interface DeadLetter {}
export interface Expense {}
export interface Integration {}


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
  "plv_material", "reservations"
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
    line: ['#c56a3c', '#ed6a36', '#5a9496', '#99d9d9', '#fecb46'],
    grid: 'hsl(240 6% 90%)',
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
export type ReservationView = any; // Placeholder
