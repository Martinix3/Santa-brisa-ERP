/* =====================================================================
   SANTA BRISA — SSOT v7 (Unified Domain Types)
   - Compatible con Firestore
   - Compatible con integración Holded/Shopify/Sendcloud
   - Cubre: Cuentas (directa/colocación), Consigna, Ventas, Marketing,
            Producción, Logística (lotes, FEFO, QC), RRHH y Enriquecimiento.
   ===================================================================== */

//// -------------------------------------------------------------------
//// 0) Tipos base y helpers
//// -------------------------------------------------------------------

export type ID = string;
export type ISODate = string;              // e.g., '2025-10-09T12:34:56.000Z'
export type CurrencyCode = 'EUR';
export type Percentage = number;           // 0..100
export type Decimal = number;
export type Url = string;

export interface AuditBase {
  createdAt: ISODate;
  updatedAt: ISODate;
  createdById?: ID;
  updatedById?: ID;
  deletedAt?: ISODate;
}

export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  zip?: string; // compat (legacy): algunos módulos esperan "zip"
}

export interface NameValue {
  name: string;
  value: string | number | boolean | null;
}

//// -------------------------------------------------------------------
//// 1) Enums canónicos
//// -------------------------------------------------------------------

export type AccountType =
  | 'CLIENTE_FINAL'    // bares, tiendas, hoteles...
  | 'DISTRIBUIDOR'
  | 'IMPORTADOR'
  | 'HORECA'
  | 'RETAIL'
  | 'ONLINE'
  | 'OTRO';

export type AccountStage =
  | 'POTENCIAL'
  | 'SEGUIMIENTO'
  | 'ACTIVA'
  | 'FALLIDA'
  | 'CERRADA'
  | 'BAJA';

export type CommercialFlow = 'DIRECTA' | 'COLOCACION' | 'AMBOS';

export type Department = 'VENTAS' | 'MARKETING' | 'OPS' | 'PRODUCCION' | 'FIN' | 'HR' | 'OTRO';

export type InteractionKind = 'LLAMADA' | 'VISITA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'EVENTO_MKT' | 'COBRO';
export type InteractionStatus = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA';
export type InteractionResult = 'VISITA_OK' | 'VISITA_FALLIDA' | 'SIN_CONTACTO' | 'PENDIENTE' | 'OTRO';

export type OrderStatus = 'BORRADOR' | 'ABIERTO' | 'EN_PROCESO' | 'SERVIDO' | 'FACTURADO' | 'PAGADO' | 'CANCELADO';
export type OrderChannel = 'DIRECTA' | 'COLOCACION';

export type WarehouseKind = 'OWN' | '3PL' | 'CONSIGNA';

export type Uom = 'UNIT' | 'L' | 'KG' | 'BOX' | 'CASE';

export type ItemKind = 'PRODUCT' | 'SERVICE' | 'BUNDLE';

export type QcTestKind = 'MICRO' | 'PH' | 'BRIX' | 'ORGANOLEPTIC' | 'LABELING' | 'OTHER';
export type QcTestResult = 'PASS' | 'FAIL' | 'NA';
export type QcFinal = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'POS' | 'ONLINE' | 'OTRO';

export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TaskKind = 'FOLLOWUP' | 'COBRO' | 'MKT' | 'OPS' | 'OTRO';

export type ActivationStatus = 'planned' | 'active' | 'closed' | 'REJECTED';

export type OnlineChannel = 'META' | 'GOOGLE' | 'TIKTOK' | 'OTHER';

export type PromotionMechanic = 'PCT' | 'AMOUNT' | '5+1' | 'BOGO' | 'BUNDLE' | 'TIERED';

//// -------------------------------------------------------------------
//// 2) Cuentas, contactos, equipo
//// -------------------------------------------------------------------

export interface Account extends AuditBase {
  id: ID;
  name: string;
  legalName?: string;
  cif?: string;
  vat?: string;
  accountType: AccountType;
  accountStage: AccountStage;              // calculado por servicio
  parentAccountId?: ID;                    // cadenas/grupos
  distributorId?: ID;                      // si es cliente de colocación, vinculado a distribuidor
  salesRepId?: ID;                         // comercial responsable

  channels?: Array<'ONLINE' | 'PRIVADA' | 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR'>;
  tags?: string[];

  billingAddress?: Address;
  shippingAddress?: Address;

  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;

  commercialFlow: CommercialFlow;          // DIRECTA | COLOCACION | AMBOS
  
  notes?: string;                          // observaciones internas
  
  // Sales targeting
  isTarget?: boolean;
  targetUserId?: ID;
  targetedAt?: ISODate;

  enrichment?: {
    source?: 'GOOGLE_PLACES' | 'SCRAPE' | 'MANUAL';
    placeId?: string;
    website?: Url;
    instagram?: Url;
    rating?: number;
    openingHours?: string[];
    photos?: Url[];
    lastCheckedAt?: ISODate;
  };

  paymentMethodDefault?: string;
  paymentDaysDefault?: number;
  discountDefaultPct?: Percentage;
  iban?: string;

  custom?: Record<string, any>;

  // Claves externas
  external?: {
    holdedId?: string;
    shopifyCustomerId?: string;
  };

  // --- compat (legacy) ---
  partyId?: ID;                       // muchos módulos referencian account.partyId
  segment?: 'ONLINE' | 'B2B' | string;// algunos checks usan segment
  type?: 'ONLINE' | 'PRIVADA' | string; // usado en lógica legacy (equivalente a channels/segment)
  stage?: string;                     // @deprecated usar accountStage
  ownerId?: ID;                       // @deprecated usar salesRepId
  mode?: 'DIRECTA' | 'COLOCACION';   // @deprecated usar commercialFlow
  flow?: 'DIRECTA' | 'COLOCACION';     // @deprecated usar commercialFlow
}

export interface Contact extends AuditBase {
  id: ID;
  accountId: ID;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface TeamMember extends AuditBase {
  id: ID;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'MKT' | 'OPS' | 'FIN' | 'HR';
  permissions?: string[];
  active: boolean;
  commissionPct?: Percentage;
  targets?: { period: 'MONTH' | 'YEAR'; revenueTarget?: number; newAccountsTarget?: number };
  lastLoginAt?: ISODate;
}

//// -------------------------------------------------------------------
//// 3) Catálogo, precios y promociones
//// -------------------------------------------------------------------

export interface Item extends AuditBase {
  id: ID;           // sku recomendado = id si único
  name: string;
  sku: string;
  gtin?: string[];  // EAN-13/14/128 por presentación
  kind: ItemKind;
  uom: Uom;

  pack?: { unitsPerCase?: number; casesPerPallet?: number; taraKg?: number };

  trackStock: boolean;
  trackBatches?: boolean;
  trackSerials?: boolean;

  dimensions?: { w?: number; h?: number; l?: number; unit?: 'cm' };
  weightKg?: number;
  volumeL?: number;

  defaultTaxPct?: Percentage;
  msrp?: Decimal;
  cost?: Decimal;
  price?: Decimal;
  /** @deprecated usar cost */
  stdCost?: Decimal;

  categoryId?: ID;
  /** @deprecated usar categoryId */
  category?: string;
  /** @deprecated */
  active?: boolean;
  tags?: string[];
  images?: Url[];

  suppliers?: Array<{ accountId: ID; supplierSku?: string; cost?: Decimal; leadTimeDays?: number }>;

  longDesc?: string;
  marketingFlags?: string[];

  external?: { holdedId?: string; shopifyProductId?: string };
}

export interface PriceList extends AuditBase {
  id: ID;
  name: string;
  currency: CurrencyCode;
  validFrom?: ISODate;
  validTo?: ISODate;
  lines: Array<{ sku: string; price: Decimal; taxPct?: Percentage }>;
}

export interface AccountPriceOverride extends AuditBase {
  id: ID;
  accountId: ID;
  sku: string;
  price: Decimal;
  currency: CurrencyCode;
  validFrom?: ISODate;
  validTo?: ISODate;
}

export interface Promotion extends AuditBase {
  id: ID;
  name: string;
  mechanic: PromotionMechanic;
  scope: { skuIds?: ID[]; categoryIds?: ID[]; accountIds?: ID[] };
  value?: number;                // % o €
  validFrom: ISODate;
  validTo: ISODate;
  constraints?: { minQty?: number; maxUsesPerAccount?: number };
  budget?: Decimal;              // € marketing
  createdById?: ID;
}

//// -------------------------------------------------------------------
//// 4) Ventas (Directa y Colocación)
//// -------------------------------------------------------------------

export interface OrderItem {
  sku: string;
  qty: number;
  unitPrice: Decimal;
  discountPct?: Percentage;
  taxPct?: Percentage;
  linkedPromotionIds?: ID[];
}

export interface Order extends AuditBase {
  id: ID;
  accountId: ID;                 // cliente
  distributorId?: ID;            // si COLOCACION (vía quién)
  channel: OrderChannel;
  source?: 'Holded' | 'Shopify' | 'Manual' | 'DistributorPortal';
  date: ISODate;
  currency: CurrencyCode;

  status: OrderStatus;

  amount: Decimal;               // total con impuestos
  taxBase?: Decimal;
  tax?: Decimal;
  discountTotal?: Decimal;

  items: OrderItem[];
  notes?: string;
  linkedPromotions?: ID[];

  // logística
  shipmentId?: ID;
  warehouseId?: ID;

  // integración Holded
  holded?: { documentId?: string; type?: 'estimate' | 'salesorder' | 'deliverynote' | 'invoice'; number?: string };
}

export interface OrderSellOut extends AuditBase {
  id: ID;
  distributorId: ID;
  accountId?: ID;                // bar/tienda final (si lo tenemos)
  period: { from: ISODate; to: ISODate };
  lines: Array<{
    sku: string; qty: number; unitPrice?: Decimal; total?: Decimal;
    // --- compat (legacy) ---
    itemId?: string; name?: string; uom?: string; locationId?: string; lotNumber?: string;
  }>;
  source?: 'CSV' | 'API' | 'EMAIL';
  status: 'RECEIVED' | 'VALIDATED' | 'REJECTED';
  notes?: string;
}

//// -------------------------------------------------------------------
//// 5) Interacciones, tareas y eventos
//// -------------------------------------------------------------------

export interface Interaction extends AuditBase {
  id: ID;
  accountId: ID;
  dept: Department;
  kind: InteractionKind;
  when: ISODate;
  status: InteractionStatus;
  result?: InteractionResult;
  summary?: string;
  nextAt?: ISODate;
  attachments?: Url[];
  
  // --- compat (legacy) ---
  note?: string;  // @deprecated usar summary
}

export interface Task extends AuditBase {
  id: ID;
  title: string;
  accountId?: ID;
  assignedToId?: ID;
  dept?: Department;
  kind?: TaskKind;
  dueAt: ISODate;
  status: TaskStatus;
  linkedId?: ID;                 // order | event | activation | plv
  linkedKind?: 'order' | 'event' | 'activation' | 'plv';
}

export interface Event extends AuditBase {
  id: ID;
  accountId?: ID;
  kind: EventKind;
  title: string;
  startAt: ISODate;
  endAt?: ISODate;
  location?: string;
  notes?: string;

  // Marketing
  budget?: Decimal;
  spend?: Decimal;
  goal?: string;
  kpis?: Record<string, number>;
  links?: Url[];
  status: ActivationStatus;
}

//// -------------------------------------------------------------------
//// 6) Marketing (PLV/Activaciones/Online/Collabs/POS)
//// -------------------------------------------------------------------

export type PlvKind =
  | 'SHELF_TALKER'
  | 'STANDEE'
  | 'FRIDGE_STICKER'
  | 'HANGING'
  | 'GONDOLA'
  | 'OTHER';

export interface PlvMaterial extends AuditBase {
  id: ID;
  kind: PlvKind;
  purchaseCost?: Decimal;
  purchaseDate?: ISODate;
  expectedLifespanMonths?: number;
  expectedUses?: number;
  usesCount?: number;
  status: 'IN_STOCK' | 'INSTALLED' | 'DAMAGED' | 'RETIRED';
  accountId?: ID;
  installedAt?: ISODate;
  photoUrl?: Url;
}

export interface Activation extends AuditBase {
  id: ID;
  accountId: ID;
  materialId?: ID;
  description?: string;
  status: ActivationStatus;
  startDate: ISODate;
  endDate?: ISODate;
  ownerId: ID; // responsable
  kpis?: { visitors?: number; samples?: number; salesAttributed?: number };
}

export interface PosCostCatalog extends AuditBase {
  id: ID;
  code: string;
  label: string;
  defaultUnitCost?: Decimal;
  uom: 'UNIT' | 'HOUR' | 'BATCH';
  vendor?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

export interface PosTacticItem {
  id: ID;
  catalogCode?: string;
  description: string;
  qty?: number;
  unitCost?: Decimal;
  actualCost: Decimal;
  uom?: 'UNIT' | 'HOUR' | 'BATCH';
  vendor?: string;
  assetId?: ID;                   // plv u otro
  attachments?: Url[];
}

export interface PosTactic extends AuditBase {
  id: ID;
  accountId: ID;
  eventId?: ID;
  interactionId?: ID;
  orderId?: ID;

  tacticCode: string;
  description?: string;
  appliesToSkuIds?: ID[];

  items: PosTacticItem[];
  plannedCost?: Decimal;
  actualCost: Decimal;
  executionScore: number;         // 0..100
  status: ActivationStatus;
  result?: { roi?: number; liftPct?: number; upliftUnits?: number; confidence?: 'LOW' | 'MEDIUM' | 'HIGH' };
  createdById?: ID;
}

export interface OnlineCampaign extends AuditBase {
  id: ID;
  channel: OnlineChannel;
  name: string;
  status: ActivationStatus;
  budget: Decimal;
  spend?: Decimal;
  metrics?: { impressions?: number; clicks?: number; roas?: number };
  startAt: ISODate;
  endAt?: ISODate;
}

export interface Collab extends AuditBase {
  id: ID;
  name: string;
  handle?: string;
  cost: Decimal;
  deliverables?: string[];
  metrics?: { reach?: number; engagement?: number; leads?: number; roas?: number };
  status: ActivationStatus;
}

//// -------------------------------------------------------------------
//// 7) Logística, inventario, consignas y envíos
//// -------------------------------------------------------------------

export interface Warehouse extends AuditBase {
  id: ID;
  name: string;
  code?: string;
  active: boolean;
  address?: Address;
  kind?: WarehouseKind;
  consignment?: {
    ownerAccountId?: ID;          // distribuidor o cliente propietario del stock
    terms?: string;
    returnPolicy?: string;
  };
  default?: boolean;
  external?: { holdedId?: string };
}

export interface OnHand extends AuditBase {
  id: ID;
  warehouseId: ID;
  sku: string;
  qty: number;
  reserved?: number;
  available?: number;
  lotNumbers?: Record<string, number>;

  // --- compat (legacy view) ---
  itemId?: string;
  locationId?: string;
  lotNumber?: string;   // en v7 se modela por lotNumbers
  qcStatus?: string;
}

export type StockMoveType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
export type StockReason =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'PRODUCTION'
  | 'CONSUMPTION'
  | 'LOSS'
  | 'OTHER';

export interface StockMove extends AuditBase {
  id: ID;
  date: ISODate;
  type: StockMoveType;
  reason?: StockReason;
  warehouseId: ID;
  toWarehouseId?: ID;
  items: Array<{ sku: string; quantity: number; cost?: Decimal; lotNumber?: string; serial?: string; location?: string }>;
  documentRef?: { kind: 'order' | 'invoice' | 'deliverynote' | 'goodsReceipt' | 'productionOrder' | 'adjustment'; id: ID };
  notes?: string;
  
  // --- compat (legacy) ---
  itemId?: string;
  lotNumber?: string;
  uom?: string;
  qty?: number;
  toLocationId?: string;
  occurredAt?: string;
  ref?: any;
  unitCost?: number;
}

export interface Shipment extends AuditBase {
  id: ID;
  orderId: ID;
  lines: Array<{ sku: string; qty: number }>;
  status: 'DRAFT' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  carrier?: string;
  trackingCode?: string;
  labelUrl?: Url;
  fromWarehouseId: ID;
  toAddress: Address;
  cost?: Decimal;

  // --- compat (legacy) ---
  partyId?: ID;
  deliveryNoteId?: ID;
  checks?: { visualOk?: boolean };
  mode?: 'PARCEL' | 'PALLET';
  weightKg?: number;
  dimsCm?: { l: number; w: number; h: number };
  trackingUrl?: string;
  customerName?: string;
  addressLine1?: string; // redundante con toAddress.street
  postalCode?: string;   // redundante con toAddress.postalCode
  city?: string;         // redundante con toAddress.city
  country?: string;      // redundante con toAddress.country
}

//// -------------------------------------------------------------------
//// 8) Producción, lotes y calidad
//// -------------------------------------------------------------------

export interface ProductionOrder extends AuditBase {
  id: ID;
  code?: string;
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  recipeId: ID;
  outputSku: string;
  outputQty: number;
  uom: Uom;
  plannedAt?: ISODate;
  startedAt?: ISODate;
  finishedAt?: ISODate;
  bom: Array<{ sku: string; qty: number; uom: Uom }>; // snapshot receta
  notes?: string;
}

export interface BillOfMaterial extends AuditBase {
  id: ID;
  name: string;
  outputItemId: string;
  batchSize: number;
  baseUnit: Uom;
  stage?: 'PRODUCCION' | 'ENVASADO';
  items: Array<{
    itemId: string;
    qty: number;
    uom: Uom;
    role?: 'FORMULA' | 'PACKAGING' | 'COST_ONLY';
  }>;
  version?: number;
  isActive?: boolean;
  validFrom?: ISODate;
  supersedesId?: ID;
  changeNote?: string;
}

export interface Lot extends AuditBase {
  id: ID;
  lotNumber: string;
  sku: string;
  qtyMade: number;
  uom: Uom;
  mfgDate: ISODate;
  expDate?: ISODate;
  bestBeforeMonths?: number;
  qcStatus: QcFinal;
  warehouseId?: ID;
  eanBatchCode?: string;
  genealogy?: { parents?: string[]; children?: string[] };

  // --- compat (legacy meta) ---
  itemName?: string;
  status?: string;              // en v7 es qcStatus
  receivedAt?: ISODate;
  producedByOrderId?: string;
  parentLotNumber?: string;
}

export interface QcTest extends AuditBase {
  id: ID;
  lotNumber: string;
  sku: string;
  kind: QcTestKind;
  result: QcTestResult;
  value?: number | string;
  units?: string;
  takenAt: ISODate;
  byUserId?: ID;
  notes?: string;
}

export interface QcBatchResult extends AuditBase {
  id: ID;
  lotNumber: string;
  final: QcFinal;
  decidedAt?: ISODate;
  decidedById?: ID;
  notes?: string;
}

export interface QcParameter extends AuditBase {
  id: ID;
  sku: string;
  name: string;
  code?: string;
  unit?: string;
  range?: { min?: number; max?: number };
  method?: string;
}

export interface QcPlan extends AuditBase {
  id: ID;
  sku: string;
  name: string;
  specs: Array<{ id: string; parameterId: string; point: 'RECEPCION' | 'PROCESO' | 'ENVASADO' }>;
}

export interface QcProtocol extends AuditBase {
  id: ID;
  title: string;
  priority?: 'PRP' | 'PCC' | 'OTHER';
  active: boolean;
  checklist?: string[];
}

//// -------------------------------------------------------------------
//// 9) Finanzas (mirror) — reconciliación con Holded
//// -------------------------------------------------------------------

export interface PaymentMirror extends AuditBase {
  id: ID;
  date: ISODate;
  amount: Decimal;
  type: 'income' | 'expense';
  method?: string;
  documentId?: string;      // Holded document id
  contactId?: string;       // Holded contact id
  status?: string;
  reconciled?: boolean;
  notes?: string;
}

//// -------------------------------------------------------------------
//// 10) RRHH
//// -------------------------------------------------------------------

export interface Employee extends AuditBase {
  id: ID;
  userId?: ID;              // vinculación con TeamMember si aplica
  fullName: string;
  email?: string;
  phone?: string;
  hireDate?: ISODate;
  leaveDate?: ISODate;
  role: string;
  department: Department;
  managerId?: ID;
  payrollRef?: string;
  costCenter?: string;
  baseLocation?: string;
}

export interface TimeOff extends AuditBase {
  id: ID;
  employeeId: ID;
  kind: 'VAC' | 'SICK' | 'OTHER';
  from: ISODate;
  to: ISODate;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface Commission extends AuditBase {
  id: ID;
  employeeId: ID;
  period: { year: number; month: number };
  basis: 'REVENUE' | 'MARGIN';
  pct: Percentage;
  computedAt?: ISODate;
  amount?: Decimal;
}

//// -------------------------------------------------------------------
//// 11) Integraciones, espejos y jobs
//// -------------------------------------------------------------------

export interface HoldedContactMirror extends AuditBase {
  id: ID;                // mirror doc id
  holdedId: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
  name: string;
  vat?: string;
  email?: string;
  phone?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  raw?: Record<string, any>;
}

export interface HoldedProductMirror extends AuditBase {
  id: ID;
  holdedId: string;
  sku: string;
  barcode?: string;
  unit?: string;
  trackSerials?: boolean;
  trackBatches?: boolean;
  raw?: Record<string, any>;
}

export interface HoldedDocumentMirror extends AuditBase {
  id: ID;
  holdedId: string;
  type: 'estimate' | 'salesorder' | 'deliverynote' | 'invoice';
  number?: string;
  contactId?: string;               // Holded contact id
  date?: ISODate;
  status?: string;
  total?: Decimal;
  items?: Array<{ sku?: string; name?: string; qty: number; price: Decimal; tax?: Percentage; discount?: Percentage; warehouseId?: string }>;
  raw?: Record<string, any>;
}

export interface HoldedPaymentMirror extends AuditBase {
  id: ID;
  holdedId: string;
  date: ISODate;
  amount: Decimal;
  method?: string;
  documentId?: string;
  contactId?: string;
  status?: string;
  reconciled?: boolean;
  raw?: Record<string, any>;
}

export interface IntegrationJob extends AuditBase {
  id: ID;
  kind: 'HOLDED_CONTACTS' | 'HOLDED_PRODUCTS' | 'HOLDED_DOCUMENTS' | 'HOLDED_PAYMENTS' | 'GOOGLE_PLACES' | 'SCRAPE';
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  attempts?: number;
  lastRunAt?: ISODate;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  errorMsg?: string;
}

export interface EnrichmentJob extends AuditBase {
  id: ID;
  kind: 'GOOGLE_PLACES' | 'SCRAPE';
  target: 'account' | 'contact';
  targetId: ID;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  payload?: any;
  result?: any;
  lastRunAt?: ISODate;
  errorMsg?: string;
}

export interface AuditLog {
  id: ID;
  actorId?: ID;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'SYNC';
  entity: 'orders' | 'accounts' | 'items' | 'plv_material' | 'stockMoves' | 'lots' | 'events' | 'tasks' | string;
  entityId: ID;
  diff?: any;
  createdAt: ISODate;
}

//// -------------------------------------------------------------------
//// 12) Relaciones (para referencia en servicios/repos)
//// -------------------------------------------------------------------
/*
- orders.accountId → accounts.id
- orders.distributorId → accounts.id (tipo DISTRIBUIDOR/IMPORTADOR)
- orderSellOut.distributorId → accounts.id
- interactions/tasks/events.accountId → accounts.id
- plv_material/activations/posTactics.accountId → accounts.id
- accountPriceOverrides.accountId → accounts.id
- shipments.orderId → orders.id
- stockMoves.documentRef → { kind, id }
- lots.sku → items.id; qc* por lotNumber
- warehouses.kind==='CONSIGNA' → consignment.ownerAccountId → accounts.id
*/

//// -------------------------------------------------------------------
//// 13) Exports agrupados (opcional)
//// -------------------------------------------------------------------

export type Collections = {
  accounts: Account;
  contacts: Contact;
  teamMembers: TeamMember;
  items: Item;
  priceLists: PriceList;
  accountPriceOverrides: AccountPriceOverride;
  promotions: Promotion;
  orders: Order;
  ordersSellOut: OrderSellOut;
  interactions: Interaction;
  tasks: Task;
  events: Event;
  plv_material: PlvMaterial;
  activations: Activation;
  posCostCatalog: PosCostCatalog;
  posTactics: PosTactic;
  warehouses: Warehouse;
  onHand: OnHand;
  stockMoves: StockMove;
  shipments: Shipment;
  productionOrders: ProductionOrder;
  billOfMaterials: BillOfMaterial;
  lots: Lot;
  qcTests: QcTest;
  qcBatchResults: QcBatchResult;
  qcParameters: QcParameter;
  qcPlans: QcPlan;
  qcProtocols: QcProtocol;
  payments_mirror: PaymentMirror;
  holded_contacts_mirror: HoldedContactMirror;
  holded_products_mirror: HoldedProductMirror;
  holded_documents_mirror: HoldedDocumentMirror;
  holded_payments_mirror: HoldedPaymentMirror;
  integration_jobs: IntegrationJob;
  enrichmentJobs: EnrichmentJob;
  auditLogs: AuditLog;
};

// SantaData type: runtime data structure with arrays
export type SantaData = {
  [K in keyof Collections]: Collections[K][];
};

//// -------------------------------------------------------------------
//// 14) Additional Constants for UI and Compatibility
//// -------------------------------------------------------------------

export const SANTA_DATA_COLLECTIONS = [
  'accounts',
  'contacts',
  'teamMembers',
  'items',
  'priceLists',
  'accountPriceOverrides',
  'promotions',
  'orders',
  'ordersSellOut',
  'interactions',
  'tasks',
  'events',
  'plv_material',
  'activations',
  'posCostCatalog',
  'posTactics',
  'warehouses',
  'onHand',
  'stockMoves',
  'shipments',
  'productionOrders',
  'billOfMaterials',
  'lots',
  'qcTests',
  'qcBatchResults',
  'qcParameters',
  'qcPlans',
  'qcProtocols',
  'payments_mirror',
  'holded_contacts_mirror',
  'holded_products_mirror',
  'holded_documents_mirror',
  'holded_payments_mirror',
  'integration_jobs',
  'enrichmentJobs',
  'auditLogs',
] as const;

// Module accent colors for UI theming (HSL format for Tailwind CSS)
export const MODULE_ACCENTS = {
  personal: '330 81% 60%',    // pink-500
  ventas: '217 91% 60%',      // blue-500
  marketing: '258 90% 66%',   // purple-500
  ops: '142 76% 36%',         // emerald-600
  produccion: '38 92% 50%',   // amber-500
  almacen: '172 66% 50%',     // teal-500
  calidad: '239 84% 67%',     // indigo-500
  finanzas: '0 84% 60%',      // red-500
  admin: '220 9% 46%',        // gray-600
  rrhh: '239 84% 67%',        // indigo-500
} as const;

export const DEPT_META = {
  VENTAS: { label: 'Ventas', color: '#3b82f6', textColor: '#ffffff' },
  MARKETING: { label: 'Marketing', color: '#8b5cf6', textColor: '#ffffff' },
  OPS: { label: 'Ops', color: '#10b981', textColor: '#ffffff' },
  PRODUCCION: { label: 'Producción', color: '#f59e0b', textColor: '#ffffff' },
  CALIDAD: { label: 'Calidad', color: '#6366f1', textColor: '#ffffff' },
  FIN: { label: 'Finanzas', color: '#ef4444', textColor: '#ffffff' },
  HR: { label: 'RRHH', color: '#6366f1', textColor: '#ffffff' },
  OTRO: { label: 'Otro', color: '#6b7280', textColor: '#ffffff' },
};

export const SB_COLORS = {
  brand: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    neutral900: '#1f2937',
    neutral50: '#f9fafb',
  },
  state: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
};

//// -------------------------------------------------------------------
//// 15) Aliases de compatibilidad (solo tipado) — TEMPORAL
//// -------------------------------------------------------------------
// Mantienen compilación en acciones/workers legacy.
// RETIRAR progresivamente cuando se migren los módulos.

export type QcStatus = QcFinal;   // muchos módulos importan QcStatus
export type OnHandView = OnHand;  // legacy usaba "view"

// Usado solo como "shape" ligero en acciones legacy
export interface Party {
  id: ID;
  name?: string;
  billingAddress?: Address;  // compat: algunos componentes esperan esto
}

// Metadatos de stages (UI)
export const ACCOUNT_STAGE_META: Record<AccountStage, { label: string; color: string }> = {
  POTENCIAL: { label: 'Potencial', color: '#D7713E' },
  SEGUIMIENTO: { label: 'Seguimiento', color: '#F7D15F' },
  ACTIVA: { label: 'Activa', color: '#A7D8D9' },
  FALLIDA: { label: 'Fallida', color: '#618E8F' },
  CERRADA: { label: 'Cerrada', color: '#9ca3af' },
  BAJA: { label: 'Baja', color: '#9ca3af' },
};
