// FILE: src/domain/ssot.v7.ts
// =================================================================
// == SINGLE SOURCE OF TRUTH v7 - Santa Brisa ERP
// == Integración completa con Holded + Modelo extendido
// =================================================================

// -----------------------------------------------------------------
// 1) TIPOS PRIMITIVOS
// -----------------------------------------------------------------

export type ISODateString = string;
export type Currency = 'EUR';

// -----------------------------------------------------------------
// 2) ENUMS CANÓNICOS
// -----------------------------------------------------------------

// Segmentos y Clasificación
export type Segment = 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'PRIVADA' | 'ONLINE';
export type Stage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type CommercialFlow = 'DIRECTA' | 'COLOCACION' | 'AMBOS';

// Estados de Operaciones
export type OrderStatus = 'BORRADOR' | 'ABIERTO' | 'EN_PROCESO' | 'SERVIDO' | 'FACTURADO' | 'PAGADO' | 'CANCELADO';
export type OrderDocumentType = 'ESTIMATE' | 'SALESORDER' | 'INVOICE' | 'DELIVERYNOTE' | 'INTERNAL';
export type OrderChannel = 'DIRECTA' | 'COLOCACION';
export type OrderSource = 'Holded' | 'Shopify' | 'Manual' | 'DistributorPortal' | 'B2B';
export type ShipmentStatus = 'DRAFT' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type StockMoveType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
export type StockMoveReason = 'PURCHASE' | 'SALE' | 'RETURN' | 'PRODUCTION' | 'CONSUMPTION' | 'LOSS' | 'OTHER';

// Producción y Calidad
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type QCStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type QCTestKind = 'MICRO' | 'PH' | 'BRIX' | 'ORGANOLEPTIC' | 'LABELING' | 'OTHER';
export type QCTestResult = 'PASS' | 'FAIL' | 'NA';

// Marketing y Eventos
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'POS' | 'ONLINE' | 'OTRO';
export type EventStatus = 'planned' | 'active' | 'closed' | 'cancelled';
export type PlvKind = 'SHELF_TALKER' | 'STANDEE' | 'FRIDGE_STICKER' | 'HANGING' | 'GONDOLA' | 'OTHER';
export type PlvStatus = 'IN_STOCK' | 'INSTALLED' | 'DAMAGED' | 'RETIRED';
export type OnlineChannel = 'META' | 'GOOGLE' | 'TIKTOK' | 'EMAIL' | 'OTHER';
export type PosTacticConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type PosCatalogUom = 'UNIT' | 'HOUR' | 'BATCH' | 'KG' | 'M2';

// Departamentos y Roles
export type Department = 'VENTAS' | 'MARKETING' | 'OPS' | 'PRODUCCION' | 'FIN' | 'HR' | 'OTRO';
export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'MKT' | 'OPS' | 'FIN' | 'HR' | 'PRODUCCION';
export type TargetPeriod = 'MONTH' | 'QUARTER' | 'YEAR';

// Interacciones
export type InteractionKind = 'LLAMADA' | 'VISITA' | 'EMAIL' | 'WHATSAPP' | 'REUNION' | 'OTRO';
export type InteractionStatus = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_CONTACTO';
export type InteractionResult = 'VISITA_OK' | 'VISITA_FALLIDA' | 'SIN_CONTACTO' | 'PEDIDO' | 'PENDIENTE' | 'OTRO';
export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TaskKind = 'FOLLOWUP' | 'COBRO' | 'MKT' | 'OPS' | 'OTRO';

// Items y Logística
export type ItemKind = 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'RAW' | 'PACKAGING';
export type Uom = 'UNIT' | 'L' | 'KG' | 'BOX' | 'CASE' | 'PALLET';
export type WarehouseKind = 'OWN' | '3PL' | 'CONSIGNA';

// Sell-Out
export type SellOutSource = 'CSV' | 'API' | 'EMAIL' | 'PORTAL';
export type SellOutStatus = 'RECEIVED' | 'VALIDATED' | 'REJECTED';

// RRHH
export type TimeOffKind = 'VAC' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
export type TimeOffStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type CommissionBasis = 'REVENUE' | 'MARGIN' | 'NEW_ACCOUNTS' | 'MIXED';

// Integraciones
export type IntegrationJobKind = 'SYNC_CONTACTS' | 'SYNC_PRODUCTS' | 'SYNC_DOCUMENTS' | 'SYNC_PAYMENTS';
export type IntegrationDirection = 'PULL' | 'PUSH';
export type IntegrationJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
export type EnrichmentJobKind = 'GOOGLE_PLACES' | 'SCRAPE' | 'GEOCODE';
export type EnrichmentJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SYNC';
export type AuditSource = 'UI' | 'API' | 'SYNC' | 'IMPORT' | 'SCRIPT';
export type WebhookStatus = 'PENDING' | 'PROCESSED' | 'ERROR';
export type SyncStatus = 'OK' | 'ERROR';

// -----------------------------------------------------------------
// 3) TIPOS AUXILIARES
// -----------------------------------------------------------------

export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  countryCode?: string;
}

export interface OrderLine {
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
}

export interface ShipmentLine {
  sku: string;
  name?: string;
  qty: number;
  lotNumber?: string;
}

export interface StockMoveItem {
  sku: string;
  quantity: number;
  cost?: number;
  lotNumber?: string;
  serial?: string;
  location?: string;
}

export interface BomItem {
  sku: string;
  qty: number;
  uom: string;
}

export interface ItemPack {
  unitsPerCase?: number;
  casesPerPallet?: number;
  taraKg?: number;
}

export interface ItemDimensions {
  w?: number;
  h?: number;
  l?: number;
  unit?: 'cm' | 'm';
}

export interface ItemSupplier {
  accountId: string;
  supplierSku?: string;
  cost?: number;
  leadTimeDays?: number;
}

export interface UserTargets {
  period: TargetPeriod;
  revenueTarget?: number;
  newAccountsTarget?: number;
  visitsTarget?: number;
}

export interface Enrichment {
  source?: 'GOOGLE_PLACES' | 'SCRAPE' | 'MANUAL';
  placeId?: string;
  website?: string;
  instagram?: string;
  rating?: number;
  openingHours?: string[];
  photos?: string[];
  lastCheckedAt?: string;
}

export interface LotGenealogy {
  parents?: string[];
  children?: string[];
}

export interface PosTacticItem {
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
}

export interface PosTacticResult {
  roi?: number;
  liftPct?: number;
  upliftUnits?: number;
  revenueAttributed?: number;
  confidence?: PosTacticConfidence;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  revenue?: number;
  roas?: number;
}

export interface CampaignTracking {
  utmCampaign?: string;
  couponCode?: string;
  landingUrl?: string;
}

export interface CollabMetrics {
  reach?: number;
  engagement?: number;
  leads?: number;
  conversions?: number;
  roas?: number;
}

export interface ActivationKpis {
  visitors?: number;
  samples?: number;
  salesAttributed?: number;
  upliftPct?: number;
}

export interface CommissionBreakdownItem {
  accountId: string;
  orderId: string;
  base: number;
  commission: number;
}

export interface DocumentReference {
  kind: 'order' | 'invoice' | 'deliverynote' | 'goodsReceipt' | 'productionOrder' | 'adjustment';
  id: string;
}

export interface IntegrationStats {
  total: number;
  created: number;
  updated: number;
  errors: number;
}

export interface AuditDiff {
  before?: any;
  after?: any;
}

export interface Consignment {
  ownerAccountId?: string;
  terms?: string;
  returnPolicy?: string;
}

export interface HoldedSync {
  documentId?: string;
  type?: 'estimate' | 'salesorder' | 'invoice' | 'deliverynote';
  number?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------
// 4) ENTIDADES CORE
// -----------------------------------------------------------------

export interface Account {
  id: string;
  name: string;
  legalName?: string;
  cif?: string;
  vat?: string;
  
  segment: Segment;
  stage: Stage;
  
  parentAccountId?: string;
  distributorId?: string;
  
  salesRepId?: string;
  channels: Array<'ONLINE' | 'PRIVADA' | 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR'>;
  commercialFlow: CommercialFlow;
  
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  
  billingAddress?: Address;
  shippingAddress?: Address;
  
  paymentMethodDefault?: string;
  paymentDaysDefault?: number;
  discountDefaultPct?: number;
  iban?: string;
  
  enrichment?: Enrichment;
  
  tags?: string[];
  custom?: Record<string, any>;
  
  holdedContactId?: string;
  holdedUpdatedAt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  managerId?: string;
  permissions?: string[];
  commissionPct?: number;
  targets?: UserTargets;
  holdedUserId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  gtin?: string[];
  kind: ItemKind;
  category?: string;
  uom: Uom;
  pack?: ItemPack;
  trackStock: boolean;
  trackBatches?: boolean;
  trackSerials?: boolean;
  dimensions?: ItemDimensions;
  weightKg?: number;
  volumeL?: number;
  defaultTaxPct?: number;
  msrp?: number;
  cost?: number;
  price?: number;
  suppliers?: ItemSupplier[];
  longDesc?: string;
  marketingFlags?: string[];
  images?: string[];
  tags?: string[];
  custom?: Record<string, any>;
  holdedProductId?: string;
  holdedUpdatedAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// -----------------------------------------------------------------
// 5) ENTIDADES DE VENTAS
// -----------------------------------------------------------------

export interface Order {
  id: string;
  orderNumber?: string;
  accountId: string;
  distributorId?: string;
  channel: OrderChannel;
  source?: OrderSource;
  documentType: OrderDocumentType;
  date: string;
  dueDate?: string;
  deliveryDate?: string;
  status: OrderStatus;
  currency: Currency;
  subtotal?: number;
  discountTotal?: number;
  taxBase?: number;
  tax?: number;
  total: number;
  items: OrderLine[];
  linkedPromotions?: string[];
  shipmentId?: string;
  warehouseId?: string;
  holded?: HoldedSync;
  notes?: string;
  custom?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}

export interface OrderSellOut {
  id: string;
  distributorId: string;
  accountId?: string;
  period: {
    from: string;
    to: string;
  };
  lines: Array<{
    sku: string;
    qty: number;
    unitPrice?: number;
    total?: number;
  }>;
  source?: SellOutSource;
  status: SellOutStatus;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  validatedBy?: string;
  validatedAt?: string;
}

export interface Interaction {
  id: string;
  accountId: string;
  dept: Department;
  kind: InteractionKind;
  when: string;
  duration?: number;
  status: InteractionStatus;
  result?: InteractionResult;
  summary?: string;
  nextAt?: string;
  linkedOrderId?: string;
  linkedEventId?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  accountId?: string;
  assignedToId?: string;
  dept?: Department;
  kind?: TaskKind;
  dueAt: string;
  status: TaskStatus;
  linkedId?: string;
  linkedKind?: 'order' | 'event' | 'activation' | 'plv' | 'shipment';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// -----------------------------------------------------------------
// 6) ENTIDADES DE MARKETING
// -----------------------------------------------------------------

export interface Event {
  id: string;
  accountId?: string;
  kind: EventKind;
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  budget?: number;
  spend?: number;
  goal?: string;
  kpis?: Record<string, number>;
  status: EventStatus;
  notes?: string;
  links?: string[];
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PlvMaterial {
  id: string;
  kind: PlvKind;
  description?: string;
  purchaseCost?: number;
  purchaseDate?: string;
  expectedLifespanMonths?: number;
  expectedUses?: number;
  usesCount?: number;
  status: PlvStatus;
  accountId?: string;
  installedAt?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activation {
  id: string;
  accountId: string;
  materialId?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: EventStatus;
  kpis?: ActivationKpis;
  ownerId: string;
  notes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PosTactic {
  id: string;
  accountId: string;
  eventId?: string;
  interactionId?: string;
  orderId?: string;
  tacticCode?: string;
  description?: string;
  appliesToSkuIds?: string[];
  items: PosTacticItem[];
  plannedCost?: number;
  actualCost: number;
  executionScore: number;
  status: EventStatus;
  result?: PosTacticResult;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface PosCostCatalogEntry {
  id: string;
  code: string;
  label: string;
  defaultUnitCost?: number;
  uom: PosCatalogUom;
  vendor?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface OnlineCampaign {
  id: string;
  name: string;
  channel: OnlineChannel;
  startAt: string;
  endAt?: string;
  budget: number;
  spend?: number;
  metrics?: CampaignMetrics;
  status: EventStatus;
  tracking?: CampaignTracking;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Collab {
  id: string;
  name: string;
  handle?: string;
  platform?: 'Instagram' | 'TikTok' | 'YouTube' | 'Blog' | 'Other';
  cost: number;
  deliverables?: string[];
  metrics?: CollabMetrics;
  status: EventStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------
// 7) ENTIDADES DE OPERACIONES
// -----------------------------------------------------------------

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  active: boolean;
  address?: Address;
  kind?: WarehouseKind;
  consignment?: Consignment;
  default?: boolean;
  holdedWarehouseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnHand {
  id: string;
  warehouseId: string;
  sku: string;
  qty: number;
  reserved?: number;
  available?: number;
  lotNumbers?: Record<string, number>;
  updatedAt: string;
}

export interface StockMove {
  id: string;
  date: string;
  type: StockMoveType;
  reason?: StockMoveReason;
  warehouseId: string;
  toWarehouseId?: string;
  items: StockMoveItem[];
  documentRef?: DocumentReference;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Shipment {
  id: string;
  shipmentNumber?: string;
  orderId: string;
  lines: ShipmentLine[];
  status: ShipmentStatus;
  fromWarehouseId: string;
  carrier?: string;
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  toAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  cost?: number;
  holdedDeliverynoteId?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

// -----------------------------------------------------------------
// 8) ENTIDADES DE PRODUCCIÓN
// -----------------------------------------------------------------

export interface ProductionOrder {
  id: string;
  code?: string;
  status: ProductionStatus;
  recipeId?: string;
  outputSku: string;
  outputQty: number;
  uom: string;
  bom: BomItem[];
  plannedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Lot {
  id: string;
  lotNumber: string;
  sku: string;
  qtyMade: number;
  uom: string;
  mfgDate: string;
  expDate?: string;
  bestBeforeMonths?: number;
  qcStatus: QCStatus;
  warehouseId?: string;
  eanBatchCode?: string;
  genealogy?: LotGenealogy;
  createdAt: string;
  updatedAt: string;
}

export interface QcTest {
  id: string;
  lotNumber: string;
  sku: string;
  kind: QCTestKind;
  result: QCTestResult;
  value?: number | string;
  units?: string;
  takenAt: string;
  byUserId: string;
  notes?: string;
  createdAt: string;
}

export interface QcBatchResult {
  id: string;
  lotNumber: string;
  final: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
  decidedAt?: string;
  decidedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------
// 9) ENTIDADES DE RRHH
// -----------------------------------------------------------------

export interface Employee {
  id: string;
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  leaveDate?: string;
  role: string;
  department: Department;
  managerId?: string;
  payrollRef?: string;
  costCenter?: string;
  baseLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeOff {
  id: string;
  employeeId: string;
  kind: TimeOffKind;
  from: string;
  to: string;
  days: number;
  status: TimeOffStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  employeeId: string;
  period: {
    year: number;
    month: number;
  };
  basis: CommissionBasis;
  pct: number;
  computedAt?: string;
  amount?: number;
  breakdown?: CommissionBreakdownItem[];
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------
// 10) ENTIDADES DE INTEGRACIÓN
// -----------------------------------------------------------------

export interface HoldedContactMirror {
  id: string;
  holdedId: string;
  name: string;
  tradename?: string;
  vat?: string;
  type: 'customer' | 'supplier' | 'both';
  lastSyncAt: string;
  syncStatus: SyncStatus;
  [key: string]: any;
}

export interface HoldedProductMirror {
  id: string;
  holdedId: string;
  sku: string;
  name: string;
  lastSyncAt: string;
  [key: string]: any;
}

export interface HoldedDocumentMirror {
  id: string;
  holdedId: string;
  type: 'estimate' | 'salesorder' | 'invoice' | 'deliverynote';
  docNumber: string;
  lastSyncAt: string;
  [key: string]: any;
}

export interface HoldedPaymentMirror {
  id: string;
  holdedId: string;
  date: string;
  amount: number;
  lastSyncAt: string;
  [key: string]: any;
}

export interface HoldedWebhookLog {
  id: string;
  event: string;
  holdedId: string;
  payload: any;
  receivedAt: string;
  processedAt?: string;
  status: WebhookStatus;
  error?: string;
  retries?: number;
}

export interface IntegrationJob {
  id: string;
  kind: IntegrationJobKind;
  direction: IntegrationDirection;
  status: IntegrationJobStatus;
  startedAt?: string;
  completedAt?: string;
  stats?: IntegrationStats;
  errorMsg?: string;
  retries?: number;
  nextRetryAt?: string;
  createdAt: string;
}

export interface EnrichmentJob {
  id: string;
  kind: EnrichmentJobKind;
  target: 'account' | 'contact';
  targetId: string;
  status: EnrichmentJobStatus;
  payload?: any;
  result?: any;
  lastRunAt?: string;
  errorMsg?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  diff?: AuditDiff;
  source?: AuditSource;
  createdAt: string;
}

// -----------------------------------------------------------------
// 11) ESTRUCTURA DE DATOS UNIFICADA
// -----------------------------------------------------------------

export interface SantaDataV7 {
  // Core
  accounts: Account[];
  contacts: Contact[];
  teams: Team[];
  items: Item[];
  
  // Ventas
  orders: Order[];
  ordersSellOut: OrderSellOut[];
  interactions: Interaction[];
  tasks: Task[];
  
  // Marketing
  events: Event[];
  plvMaterial: PlvMaterial[];
  activations: Activation[];
  posTactics: PosTactic[];
  posCostCatalog: PosCostCatalogEntry[];
  onlineCampaigns: OnlineCampaign[];
  collabs: Collab[];
  
  // Operaciones
  warehouses: Warehouse[];
  onHand: OnHand[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  
  // Producción
  productionOrders: ProductionOrder[];
  lots: Lot[];
  qcTests: QcTest[];
  qcBatchResults: QcBatchResult[];
  
  // RRHH
  employees: Employee[];
  timeOff: TimeOff[];
  commissions: Commission[];
  
  // Integraciones
  holdedContactsMirror: HoldedContactMirror[];
  holdedProductsMirror: HoldedProductMirror[];
  holdedDocumentsMirror: HoldedDocumentMirror[];
  holdedPaymentsMirror: HoldedPaymentMirror[];
  holdedWebhookLog: HoldedWebhookLog[];
  integrationJobs: IntegrationJob[];
  enrichmentJobs: EnrichmentJob[];
  auditLogs: AuditLog[];
}

// -----------------------------------------------------------------
// 12) CONSTANTES Y HELPERS
// -----------------------------------------------------------------

export const SSOT_V7_VERSION = '7.0.0';

export const SSOT_V7_COLLECTIONS = [
  'accounts',
  'contacts',
  'teams',
  'items',
  'orders',
  'ordersSellOut',
  'interactions',
  'tasks',
  'events',
  'plvMaterial',
  'activations',
  'posTactics',
  'posCostCatalog',
  'onlineCampaigns',
  'collabs',
  'warehouses',
  'onHand',
  'stockMoves',
  'shipments',
  'productionOrders',
  'lots',
  'qcTests',
  'qcBatchResults',
  'employees',
  'timeOff',
  'commissions',
  'holdedContactsMirror',
  'holdedProductsMirror',
  'holdedDocumentsMirror',
  'holdedPaymentsMirror',
  'holdedWebhookLog',
  'integrationJobs',
  'enrichmentJobs',
  'auditLogs',
] as const;

export type SSOTCollectionName = typeof SSOT_V7_COLLECTIONS[number];

// Helpers para conversión de estados
export function mapHoldedStatusToOrderStatus(holdedStatus: string, docType: string): OrderStatus {
  if (docType === 'invoice') {
    if (holdedStatus === 'paid') return 'PAGADO';
    if (holdedStatus === 'sent') return 'FACTURADO';
    return 'FACTURADO';
  }
  
  if (docType === 'estimate') {
    if (holdedStatus === 'accepted') return 'ABIERTO';
    if (holdedStatus === 'rejected') return 'CANCELADO';
    return 'ABIERTO';
  }
  
  if (docType === 'salesorder') {
    if (holdedStatus === 'sent') return 'EN_PROCESO';
    return 'ABIERTO';
  }
  
  return 'ABIERTO';
}

export function mapHoldedDocTypeToDocumentType(holdedType: string): OrderDocumentType {
  switch (holdedType) {
    case 'estimate': return 'ESTIMATE';
    case 'salesorder': return 'SALESORDER';
    case 'invoice': return 'INVOICE';
    case 'deliverynote': return 'DELIVERYNOTE';
    default: return 'INTERNAL';
  }
}

export function inferSegmentFromTags(tags?: string[]): Segment {
  if (!tags || tags.length === 0) return 'RETAIL';
  
  const tagLower = tags.map(t => t.toLowerCase());
  
  if (tagLower.some(t => t.includes('horeca') || t.includes('restaurante') || t.includes('hotel'))) {
    return 'HORECA';
  }
  if (tagLower.some(t => t.includes('distribuidor') || t.includes('mayorista'))) {
    return 'DISTRIBUIDOR';
  }
  if (tagLower.some(t => t.includes('importador'))) {
    return 'IMPORTADOR';
  }
  if (tagLower.some(t => t.includes('online') || t.includes('ecommerce'))) {
    return 'ONLINE';
  }
  if (tagLower.some(t => t.includes('privada') || t.includes('particular'))) {
    return 'PRIVADA';
  }
  
  return 'RETAIL';
}
