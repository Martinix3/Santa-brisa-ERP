// src/domain/ssot.ts
import type { Interaction } from './ssot.common';
// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL V2
// =================================================================
export type Timestamp = string; // ISO string for full date-time
export type LotNumber = string;      // alias semántico
export type ISO = string;            // si quieres usarlo en campos no Timestamp


// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------
export type Uom = 'bottle' | 'case' | 'pallet' | 'unit' | 'kg' | 'g' | 'L' | 'mL';

/** @deprecated usar 'unit' */
export type UomLegacy = 'ud' | 'uds';


export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'planned' | 'released' | 'wip' | 'done' | 'cancelled';
export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
export type ActivationStatus = 'active' | 'inactive' | 'pending_renewal';
export type PartyStatus = 'PROVISIONAL'|'ENRIQUECIDO'|'VINCULADO'|'CONFIABLE';
export type ItemCategory = 'fg'|'raw'|'pack'|'intermediate'|'consumable'|'merch';

// Enums para Módulo de Calidad
export type QcPoint = "PRE_PROD" | "RECEIVING" | "IPQC" | "FINAL_QC";
export type QcStatus = "PENDING" | "IN_PROGRESS" | "CONDITIONAL_RELEASE" | "RELEASED" | "REJECTED" | "WAIVED";
export type QcMethod = "DENSIMETER" | "TITRATION" | "HPLC" | "MICROBIO" | "SENSORIAL" | "OTHER";
export type Unit = "pct" | "gpl" | "cfu_ml" | "ntu" | "ph" | "unit";


// -----------------------------------------------------------------
// 2. KERNEL MÍNIMO
// -----------------------------------------------------------------

// 0) Catálogos
export interface Item {
  id: string;           // ← clave única estable
  sku: string;          // ← redundante para mostrar/buscar
  name: string;
  category: ItemCategory;
  imageUrl?: string;
  bomProduccionId?: string; // fabricar intermedio
  bomEnvasadoId?: string;   // embotellar final
  uom: Uom;             // ← siempre obligatorio
  active: boolean;
  // Opcionales propios de SB (solo si aplica al ítem)
  bottleMl?: number;
  caseUnits?: number;
  casesPerPallet?: number;
  stdCost?: number;     // coste estándar (para variances)
}

// 1) Libro de movimientos (append-only)
export type StockReason =
  | 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer'
  | 'adjustment' | 'return_in' | 'return_out' | 'ship'
  | 'consignment_send' | 'consignment_return' | 'consignment_sell'
  | 'sample_send' | 'sample_consume' | 'reserve' | 'unreserve';

export interface StockMove {
  id: string;
  itemId: string;
  qty: number;
  uom: Uom;
  lotNumber?: LotNumber;

  // NUEVO — ids normalizados
  fromLocationId?: string;
  toLocationId?: string;

  /** @deprecated usar fromLocationId */
  fromLocation?: string;
  /** @deprecated usar toLocationId */
  toLocation?: string;

  reason: StockReason;
  occurredAt: Timestamp;
  createdAt: Timestamp;
  unitCost?: number;
  ref?: { prodOrderId?: string; goodsReceiptId?: string; shipmentId?: string; orderId?: string };
}

// 2) Vistas/Materializaciones (derivadas del libro)
export interface OnHandView {
  id: string;           // itemId|lotNumber|locationId
  itemId: string;
  lotNumber?: LotNumber;
  locationId?: string;
  qty: number;
  uom: Uom;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  // Extensión para Calidad
  qcStatus?: QcStatus;
}

export interface ReservationView {
  id: string;           // itemId|lotNumber|refId
  itemId: string;
  lotNumber?: LotNumber;
  qty: number;                  // reservado (+)
  uom: Uom;
  ref: { kind: 'ORDER'|'PROD'|'SHIP'; id: string };
  createdAt: Timestamp;
}

// 3) Producción
export type BomLineRole = 'FORMULA'|'PACKAGING';

export interface BillOfMaterial {
  id: string;
  outputItemId: string;
  name: string;
  batchSize: number;            // en baseUnit
  baseUnit: Uom;                // ← obligatorio
  items: Array<{
    itemId: string;
    qty: number;
    uom: Uom;
    role?: BomLineRole;
  }>;
  yieldPct?: number;
  stdLaborCostPerBatch?: number;
  stdOverheadPerBatch?: number;
  currency?: Currency;
  status?: 'ACTIVA'|'BORRADOR'|'ARCHIVADA';
  version?: number;
  // Extensión para Calidad
  qcPlanId?: string;
  safetyProtocolId?: string;
}

export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  bomId: string;
  outputItemId: string;
  targetQuantity: number;   // en baseUnit
  status: ProductionStatus;
  createdAt: Timestamp;
  scheduledFor?: Timestamp;
  batchCode?: LotNumber;
  responsibleId?: string;

  // Operativo (opcionales)
  checks?: ExecCheck[];
  incidents?: { id: string; when: Timestamp; severity: 'BAJA'|'MEDIA'|'ALTA'; text: string }[];
  reservations?: ReservationView[];
  shortages?: any[];

  actuals?: Array<{
    itemId: string;
    name?: string;
    lotNumber?: LotNumber;
    theoreticalQty: number;
    actualQty: number;
    uom: Uom;
    costPerUom?: number;
  }>;

  execution?: {
    startedAt?: Timestamp;
    finishedAt?: Timestamp;
    durationHours?: number;
    finalYield?: number;
    yieldUom?: 'L' | 'unit' | UomLegacy;
    goodUnits?: number;
    scrapUnits?: number;
  };

  costing?: {
    stdCostPerUom?: number;
    actual?: { materials: number; labor?: number; overhead?: number; other?: number; total: number; perUnit?: number; yieldLossPct?: number; };
    variance?: { materials?: number; labor?: number; overhead?: number; total?: number; };
    updatedAt?: Timestamp;
  };
  // Extensión para Calidad
  qcStatus?: QcStatus;
  qcPlanOverrideId?: string;
  protocolOverrideId?: string;
}

// 4) Calidad (unifica QACheck/Lot/QCResult en un sujeto genérico)
export type QCSubject = { kind: 'RECEIPT'|'PROCESS'|'RELEASE'|'PROD_BATCH'|'LOT'; id: string };
export type QCResult = { value?: number | string | boolean; notes?: string; status: 'ok' | 'ko'; };
export interface QACheck {
  id: string;
  subject: QCSubject;
  checklist?: Array<{ name: string; result: 'ok' | 'ko'; value?: number|string|boolean; notes?: string }>;
  summaryStatus: 'ok' | 'ko';
  reviewedById?: string;
  reviewedAt?: Timestamp;
  notes?: string;
  links?: { goodsReceiptId?: string; traceEventId?: string };
  createdAt: Timestamp;
}
export interface Lot {
  lotNumber: string;
  itemId: string;
  quantity: number;
  createdAt: Timestamp;
  orderId?: string; // Production Order ID
  supplierId?: string; // For raw materials
  qcStatus: QcStatus;
  qcPlanId?: string; // plan final usado para ese lote
  evidenceIds?: string[];
  expDate?: Timestamp;
  receivedAt?: Timestamp;
}

// -----------------------------------------------------------------
// 5. Documentos Operativos (Generan `StockMove`s)
// -----------------------------------------------------------------
export interface GoodsReceipt {
  id: string;
  receiptNumber?: string;
  supplierPartyId: string;
  receivedAt: Timestamp;
  deliveryNote?: string;
  status: 'pending_qc'|'completed'|'partial';
  currency?: Currency; fxRate?: number;
  lines: Array<{
    itemId: string;
    qty: number; uom: Uom;
    unitCost: number;
    lotNumber?: LotNumber;
    overTolerancePct?: number; underTolerancePct?: number;
  }>;
  landedCosts?: Array<{ kind: 'freight'|'duty'|'insurance'|'other'; amount: number; allocation: 'by_value'|'by_weight'|'by_qty'; notes?: string }>;
  attachments?: string[];
  incidentIds?: string[];
  notes?: string;
  createdById?: string; approvedById?: string;
  auditLog?: Array<{ at: Timestamp; userId: string; action: string; details?: any }>;
}

export interface ShipmentLine {
  itemId: string;
  name?: string;
  qty: number;
  uom: Uom;
  lotNumber?: LotNumber;
}

export interface Shipment {
  id: string;
  shipmentNumber?: string;
  orderId: string;
  accountId: string;
  partyId: string;
  mode: 'PARCEL'|'PALLET';
  createdAt: Timestamp; updatedAt: Timestamp;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  // Resto de metadatos que ya tenías
  customerName: string; city: string; addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string; labelUrl?: string; trackingCode?: string; tracking?: string; notes?: string;
  packedById?: string; checks?: { visualOk?: boolean }; isSample?: boolean; samplePurpose?: 'sales'|'qc'|'mkt'|'other';
  sampleNotes?: string; weightKg?: number; dimsCm?: { l:number; w:number; h:number };
  pallets?: Array<{ type:'EURO'|'AMERICAN'|'OTHER'; count:number; notes?:string }>; trackingUrl?: string;
  deliveryNoteId?: string; holdedDeliveryId?: string; holdedInvoiceId?: string;
}

export interface DeliveryNote {
  id: string;
  orderId: string;
  shipmentId: string;
  partyId: string;
  series: 'ONLINE'|'B2B'|'INTERNAL';
  date: ISO;
  soldTo: { name: string; vat?: string };
  shipTo: { name: string; address: string; zip: string; city: string; country: string };
  lines: Array<{
    itemId:string;
    description:string;
    qty:number;
    uom?: Uom;
    lotNumbers?: LotNumber[];
  }>;
  pdfUrl?: string;
  company: { name: string; vat: string; address?: string; city?: string; zip?: string; country?: string };
  createdAt: Timestamp; updatedAt: Timestamp;
}

// -----------------------------------------------------------------
// 6. Entidades de Calidad (Nuevas)
// -----------------------------------------------------------------
export type ParameterCatalog = { id: string; label: string; unit: Unit; method: QcMethod; notes?: string };
export type Range = { min?: number; max?: number; target?: number; tolerance?: number };
export type QcTestSpec = {
  parameterId: string;   // FK -> ParameterCatalog
  required: boolean;
  point: QcPoint;        // dónde se mide
  targetRange: Range;    // validación
};
export type QcPlan = {
  id: string; name: string; specs: QcTestSpec[]; active: boolean; notes?: string;
  createdAt: Timestamp; updatedAt: Timestamp;
};
export type SafetyProtocol = {
  id: string; title: string; category: "PRODUCCION"|"HIGIENE"|"LIMPIEZA"|"OTRO";
  items: Array<{ id: string; text: string; mandatory: boolean }>;
  active: boolean;
  createdAt: Timestamp; updatedAt: Timestamp;
};
export type QcTestResult = {
  specId: string;        // “parameterId@point” para unicidad o {parameterId, point}
  value: number | null; unit: Unit; passed: boolean | null;
  testedAt?: Timestamp; testedBy?: string; notes?: string; evidenceIds?: string[];
};
export type Inspection = {
  id: string;
  point: QcPoint;
  entity: { kind: "order"|"lot"|"shipment"; id: string };
  planId?: string;                 // plan efectivo en ese punto
  protocolId?: string;
  status: "OPEN"|"IN_PROGRESS"|"DONE"|"BLOCKING";
  results?: QcTestResult[];        // para puntos con analítica
  checklist?: Array<{ itemId: string; checked: boolean; mandatory: boolean }>;
  decision?: "RELEASED"|"CONDITIONAL"|"REJECTED"|"NA";
  decisionNote?: string;
  evidenceIds?: string[];
  createdAt: Timestamp; createdBy?: string; updatedAt: Timestamp;
};


// -----------------------------------------------------------------
// 7. Entidades de CRM, Marketing y otras (Sin cambios grandes)
// -----------------------------------------------------------------
export type Address = { address?: string; city?: string; zip?: string; province?: string; country?: string; countryCode?: string };
export type CommItem = { value: string; isPrimary?: boolean; verified?: boolean; source?: 'CRM'|'HOLDED'|'IMPORT'|'USER'; updatedAt?: Timestamp; optOut?: boolean; };
export interface PartyPerson { name: string; role?: string; email?: CommItem; phone?: CommItem; updatedAt?: Timestamp; }

export interface Party {
  id: string;
  legalName: string;
  tradeName?: string;
  vat?: string;
  emails?: CommItem[];
  phones?: CommItem[];
  billingAddress?: Address;
  shippingAddress?: Address;
  external?: { holdedContactId?: string; holdedUpdatedAt?: Timestamp; shopifyCustomerId?: string; };
  status?: PartyStatus;
  people?: PartyPerson[];
  flags?: { needsReview?: boolean; issues?: string[]; };
  quality?: { lastAuditAt?: Timestamp; score?: number; };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  name: string; // Mantener por ahora
  kind: 'ORG' | 'PERSON';
  taxId?: string;
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  tags?: string[];
}

export interface PartyRole {
    id: string; partyId: string; role: PartyRoleType; isActive: boolean;
    data: CustomerData | SupplierData | InfluencerData | EmployeeData; createdAt: Timestamp;
}
export interface PartyDuplicate {
  id: string; primaryPartyId: string; duplicatePartyId: string;
  reason: 'SAME_VAT'|'SAME_EMAIL'|'FUZZY_NAME_CITY'|'SAME_PHONE';
  score: number; status: 'OPEN'|'MERGED'|'IGNORED'; createdAt: Timestamp; resolvedAt?: Timestamp;
}
export interface CustomerData { priceListId?: string; paymentTermsDays?: number; salesRepId: string; billerId: string; }
export interface SupplierData { paymentTermsDays?: number; bankAccountNumber?: string; }
export interface InfluencerData { tier: 'nano' | 'micro' | 'mid' | 'macro'; audienceSize?: number; }
export interface EmployeeData { department: Department; managerId?: string; startDate: ISO; }

export interface User {
  id: string; name: string; email?: string; role: UserRole; active: boolean; managerId?: string;
  kpiBaseline?: { revenue?: number; unitsSold?: number; visits?: number; }
}
export interface Account {
  id: string; code?: string; partyId: string; name: string; type: AccountType; stage: Stage; subType?: string;
  ownerId: string; createdAt: Timestamp; updatedAt?: Timestamp; lastInteractionAt?: Timestamp; notes?: string;
  external?: { shopifyCustomerId?: string; holdedContactId?: string; vat?: string; }
}

export type BillingStatus = 'PENDING'|'INVOICING'|'INVOICED'|'PAID'|'FAILED';
export interface OrderSellOut {
  id: string;
  docNumber?: string;
  partyId: string;
  accountId: string;
  source: 'CRM'|'SHOPIFY'|'OTHER' | 'MANUAL' | 'HOLDED';
  createdAt: Timestamp;
  currency: Currency;
  lines: Array<{
    itemId: string;
    name?: string;
    qty: number;
    priceUnit: number;
    taxRate?: number;
    discountPct?: number;
    uom?: Uom;
    lotNumbers?: LotNumber[];
  }>;
  notes?: string;
  billingStatus?: BillingStatus;
  status: OrderStatus;
  totalAmount?: number;
  external?: { shopifyOrderId?: string; holdedInvoiceId?: string; };
}
// ... Resto de interfaces como Interaction, etc. se mantienen igual pero referenciarán `itemId` donde sea necesario ...
export * from './ssot.common'; // Importa el resto de tipos que no han cambiado

// -----------------------------------------------------------------
// 8. Lista de Colecciones de la Base de Datos
// -----------------------------------------------------------------
export interface SantaData {
  // Catálogos principales
  items: Item[];
  // Transacciones
  stockMoves: StockMove[];
  productionOrders: ProductionOrder[];
  ordersSellOut: OrderSellOut[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  qaChecks: QACheck[];
  // Vistas (Materializaciones)
  onHand: OnHandView[];
  reservations: ReservationView[];
  // CRM y otros
  parties: Party[];
  partyRoles: PartyRole[];
  accounts: Account[];
  users: User[];
  interactions: Interaction[];
  billOfMaterials: BillOfMaterial[];
  deliveryNotes: DeliveryNote[];
  lots: Lot[]; // Añadida por coherencia, aunque puede ser una vista
  // Marketing
  partyDuplicates: PartyDuplicate[];
  activations: any[]; // Placeholder, replace with actual type
  promotions: any[]; // Placeholder
  marketingEvents: any[]; // Placeholder
  onlineCampaigns: any[]; // Placeholder
  influencerCollabs: any[]; // Placeholder
  posTactics: any[]; // Placeholder
  posCostCatalog: any[]; // Placeholder
  plv_material: any[]; // Placeholder
  materialCosts: any[]; // Placeholder
  financeLinks: any[]; // Placeholder
  paymentLinks: any[]; // Placeholder
  traceEvents: any[]; // Placeholder
  incidents: any[]; // Placeholder
  codeAliases: any[]; // Placeholder
  integrations?: any;
  jobs?: any[];
  dead_letters?: any[];
  expenses: any[];
  // QC
  parameter_catalog: ParameterCatalog[];
  qc_plans: QcPlan[];
  safety_protocols: SafetyProtocol[];
  inspections: Inspection[];
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
    'items', 'stockMoves', 'productionOrders', 'ordersSellOut', 'shipments', 'goodsReceipts', 'qaChecks',
    'onHand', 'reservations', 'parties', 'partyRoles', 'accounts', 'users', 'interactions', 'billOfMaterials',
    'deliveryNotes', 'partyDuplicates', 'activations', 'promotions', 'marketingEvents', 'onlineCampaigns',
    'influencerCollabs', 'posTactics', 'posCostCatalog', 'plv_material', 'materialCosts', 'financeLinks',
    'paymentLinks', 'traceEvents', 'incidents', 'codeAliases', 'integrations', 'jobs', 'dead_letters', 'expenses',
    'lots', 'parameter_catalog', 'qc_plans', 'safety_protocols', 'inspections'
];

export * from './ssot.metas';
