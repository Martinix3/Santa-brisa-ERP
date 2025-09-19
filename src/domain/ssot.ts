
// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - TIPOS DE DATOS CANÓNICOS
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'PROVEEDOR' | 'ONLINE' | 'OTRO';
export type Currency = 'EUR';

// -----------------------------------------------------------------
// 2. Entidades Principales (Personas y Organizaciones)
// -----------------------------------------------------------------

export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
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

export interface Account {
  id: string;
  name: string;
  city?: string;
  type: AccountType;
  stage: Stage;
  ownerId: string;
  billerId: string; 
  
  address?: string;
  phone?: string;
  cif?: string;
  mainContactName?: string;
  mainContactPhone?: string;
  mainContactEmail?: string;
  createdAt: string;
  lastInteractionAt?: string;
  orderCount?: number;
  subType?: string;
  tags?: string[];
  notes?: string;
  openingHours?: string;
  deliveryInstructions?: string;
  paymentTermsDays?: number;
  paymentMethod?: string;
  billingEmail?: string;
  updatedAt?: string;
}
export type AccountRef = { id:string; name:string; city?:string; type?:AccountType };

export interface Distributor { id: string; name: string; city?: string; cif?: string; country?: string; }
export interface Supplier { id: string; name: string; country: string; }

// -----------------------------------------------------------------
// 3. Productos, Materiales e Inventario
// -----------------------------------------------------------------

export interface Product {
  id: string;
  sku: string;
  name: string;
  kind?: 'FG' | 'RM' | 'MERCH';
  uom?: Uom;
  bottleMl?: number;
  caseUnits?: number;
  casesPerPallet?: number;
  active: boolean;      
  materialId?: string;
  category?: string;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  unit?: Uom;
  standardCost?: number;
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising';
}

export interface Lot {
  id: string;
  sku: string;
  createdAt: string;
  expDate?: string;
  quantity: number; 
  quality: { qcStatus: 'hold' | 'release' | 'reject', results: Record<string, QCResult> };
  orderId?: string; // Production order ID
  supplierId?: string; // For received raw materials
  receivedAt?: string;
  kind?: 'RM' | 'SFG' | 'FG';
  status: LotStatus;
  qty?: { onHand: number; reserved: number; uom: Uom };
  dates?: { producedAt?: string; receivedAt?: string; approvedAt?: string; rejectedAt?: string; expDate?: string; };
  trace?: { parentBatchId?: string };
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  lotNumber?: string;
  uom: Uom;
  qty: number;
  locationId: string;
  updatedAt: string;
  expDate?: string;
}

export interface StockMove {
  id: string;
  sku: string;
  uom: Uom;
  qty: number;
  reason: 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'SHIP';
  fromLocation?: string;
  toLocation?: string;
  lotId?: string;
  occurredAt: string;
  createdAt: string;
  ref?: {
    orderId?: string;
    shipmentId?: string;
    prodOrderId?: string;
    goodsReceiptId?: string;
  };
}

// -----------------------------------------------------------------
// 4. Ventas y Logística
// -----------------------------------------------------------------

export interface OrderLine { 
  sku: string; 
  qty: number; 
  unit: 'uds';
  priceUnit: number;
  discount?: number;
  lotIds?: string[];
  lotNumber?: string;
  description?: string;
}

export interface OrderSellOut {
  id: string; 
  accountId: string; 
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  lines: OrderLine[]; 
  createdAt: string;
  status: OrderStatus;
  currency: 'EUR';
  closedAt?: string;
  notes?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentTermDays?: number;
  invoiceId?: string;
  externalRef?: string;
}

export interface Interaction {
  id: string;
  userId: string;
  involvedUserIds?: string[];
  accountId?: string;
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  durationMin?: number;
  sentiment?: 'pos' | 'neu' | 'neg';
  dept?: Department;
  status: InteractionStatus;
  
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'Campaign' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction';
    id: string;
  };
  tags?: string[];
  
  resultNote?: string;
  nextAction?: {
      date?: string;
      note?: string;
  };
}

export interface ShipmentLine { sku: string; qty: number; lotNumber?: string; unit: 'uds'; name: string; }
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';

export interface Shipment {
  id: string;
  orderId: string;
  accountId: string;
  createdAt: string;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  customerName: string;
  city: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  carrier?: string;
  labelUrl?: string;
  tracking?: string;
  packedById?: string;
  checks?: { visualOk?: boolean };
}

// -----------------------------------------------------------------
// 5. Producción y Calidad
// -----------------------------------------------------------------

export type QCResult = {
  value?: number | string | boolean;
  notes?: string;
  status: 'ok' | 'ko';
};

export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };

export type LotStatus = 'OPEN' | 'QUARANTINE' | 'APPROVED' | 'REJECTED' | 'CONSUMED' | 'CLOSED';
export type CheckResult = 'PASS' | 'FAIL' | 'CONDITIONAL';

export interface QACheck {
    id: string;
    lotId: string;
    scope: 'INBOUND' | 'INPROCESS' | 'RELEASE' | 'RETEST';
    checklist: {
        code: string;
        name: string;
        type: 'NUM' | 'BOOL' | 'TEXT' | 'IMG';
        uom?: string;
        valueNum?: number;
        valueBool?: boolean;
        valueText?: string;
        photoUrl?: string;
    }[];
    result: CheckResult;
    reviewerId: string;
    reviewedAt: string;
    createdAt: string;
}

export interface BillOfMaterialItem { materialId: string; quantity: number; unit?: string; }
export interface BillOfMaterial { id: string; sku: string; name: string; items: BillOfMaterialItem[]; batchSize: number; baseUnit?: string; }

export interface ProductionOrder {
  id: string;
  sku: string;
  bomId: string;
  targetQuantity: number;
  status: 'pending' |'released'| 'wip' | 'done' | 'cancelled';
  createdAt: string;
  lotId?: string;
  scheduledFor?: string;
  responsibleId?: string;
  protocolChecks?: any[];
  incidents?: any[];
  inputs?: any[];
  outputs?: any[];
  checks?: ExecCheck[];
  shortages?: Shortage[];
  reservations?: Reservation[];
  actuals?: ActualConsumption[];
  execution?: any;
  costing?: any;
}
export interface Shortage { materialId: string; name: string; required: number; available: number; uom: Uom; }
export interface Reservation { materialId: string; fromLot: string; reservedQty: number; uom: Uom }
export interface ActualConsumption { materialId: string; name: string; fromLot?: string; theoreticalQty: number; actualQty: number; uom: Uom; costPerUom: number; }

export type GenealogyLink = { fromLotId: string; toLotId: string };
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type TraceEventKind =
  | 'FARM_DATA' | 'SUPPLIER_PO'
  | 'ARRIVED' | 'BOOKED'
  | 'CHECK_PASS' | 'CHECK_FAIL' 
  | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT'
  | 'PACK_START' | 'PACK_END'
  | 'MOVE' | 'RESERVE'
  | 'ORDER_ALLOC' | 'SHIPMENT_PICKED'
  | 'SHIPPED' | 'DELIVERED';
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

export interface GoodsReceiptLine {
    materialId: string;
    sku: string;
    lotId: string;
    qty: number;
    uom: Uom;
}
export interface GoodsReceipt {
    id: string;
    supplierId: string;
    deliveryNote: string; // Número de albarán del proveedor
    receivedAt: string;
    lines: GoodsReceiptLine[];
    status: 'pending_qc' | 'completed' | 'partial';
}


// -----------------------------------------------------------------
// 6. Marketing
// -----------------------------------------------------------------

export interface EventMarketing {
  id: string;
  title: string;
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'POPUP' | 'OTRO';
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  startAt: string;
  endAt?: string;
  city?: string;
  venue?: string;
  goal?: { sampling: number; leads: number; salesBoxes: number; };
  spend?: number;
  plv?: Array<{ sku: string; qty: number; }>;
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
  metrics?: {
    impressions: number;
    clicks: number;
    ctr?: number;
    conversions?: number;
    cpa?: number;
    roas?: number;
  };
}
export interface Activation { id: string; }

export interface Creator {
    id: string;
    name: string;
    handle?: string;
    platform: 'Instagram'|'TikTok'|'YouTube'|'Twitch'|'Blog'|'Otro';
    tier: 'nano'|'micro'|'mid'|'macro';
    audience?: number;
    country?: string; city?: string;
    email?: string; phone?: string;
    shippingAddress?: string;
    tags?: string[];
    createdAt: string; updatedAt: string;
}

export interface InfluencerCollab {
    id: string;
    creatorId: string;
    creatorName: string;
    handle?: string;
    platform: 'Instagram'|'TikTok'|'YouTube'|'Twitch'|'Blog'|'Otro';
    tier: 'nano'|'micro'|'mid'|'macro';
    status: 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
    ownerUserId?: string;
    couponCode?: string;
    utmCampaign?: string;
    landingUrl?: string;
    deliverables: { kind: 'post' | 'story' | 'reel' | 'short' | 'video_long' | 'stream' | 'blogpost'; qty: number; dueAt?: string }[];
    compensation: { type: 'gift' | 'flat' | 'cpa' | 'cpc' | 'revshare'; amount?: number; currency?: 'EUR'; notes?: string; };
    costs?: { productCost?: number; shippingCost?: number; cashPaid?: number; otherCost?: number };
    tracking?: {
        clicks?: number; orders?: number; revenue?: number;
        impressions?: number; views?: number;
        likes?: number; comments?: number; saves?: number; shares?: number;
        updatedAt?: string;
    };
    dates?: { outreachAt?: string; agreedAt?: string; goLiveAt?: string; deadlineAt?: string; completedAt?: string; };
    sampleOrderId?: string;
    eventIds?: string[];
    notes?: string;
    createdAt: string; updatedAt: string;
}

// -----------------------------------------------------------------
// 7. Finanzas
// -----------------------------------------------------------------

export interface CashflowSettings {
  currency: 'EUR';
  openingBalance: number;
  defaultTermsDays: number;
  termsByChannel?: Partial<Record<AccountType, number>>;
  lagByPaymentMethod?: Partial<Record<'contado'|'transferencia'|'tarjeta'|'paypal'|'domiciliado', number>>;
  includeConfidence: { high: boolean; medium: boolean; low: boolean };
  vatMode: 'net'|'gross';
  vatSettlementDay?: 20;
  fxRates?: Record<string, number>;
  payoutFeePctOnline?: number;
  bankFeePct?: number;
  agingLagDays?: number;
  bucket: 'day'|'week'|'month';
}

// -----------------------------------------------------------------
// 8. Dataset Canónico (El gran objeto de datos)
// -----------------------------------------------------------------

export interface SantaData {
  users: User[];
  accounts: Account[];
  distributors: Distributor[];
  products: Product[];
  materials: Material[];
  billOfMaterials: BillOfMaterial[];
  
  interactions: Interaction[];
  ordersSellOut: OrderSellOut[];
  shipments: Shipment[];
  
  lots: Lot[];
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  productionOrders: ProductionOrder[];
  qaChecks: QACheck[];
  
  mktEvents: EventMarketing[];
  onlineCampaigns: OnlineCampaign[];
  activations: Activation[];
  creators: Creator[];
  influencerCollabs: InfluencerCollab[];

  suppliers: Supplier[];
  goodsReceipts: GoodsReceipt[];
  
  // Antiguos o menos usados (revisar)
  traceEvents: TraceEvent[];
  
  // Placeholder para colecciones futuras o no modeladas aun
  receipts: any[];
  purchaseOrders: any[];
  priceLists: any[];
  nonConformities: any[];
  supplierBills: any[];
  payments: any[];
}
export type { RecipeBomExec } from './production.exec';

// Lista de colecciones válidas para persistencia.
// Se genera dinámicamente para asegurar que siempre esté completa.
const _: { [K in keyof SantaData]: true } = {
    users: true, accounts: true, distributors: true, products: true, materials: true, billOfMaterials: true,
    interactions: true, ordersSellOut: true, shipments: true, lots: true, inventory: true, 
    stockMoves: true, productionOrders: true, qaChecks: true, suppliers: true, traceEvents: true, 
    goodsReceipts: true, mktEvents: true, onlineCampaigns: true, creators: true, influencerCollabs: true,
    activations: true, receipts: true, purchaseOrders: true, priceLists: true, nonConformities: true,
    supplierBills: true, payments: true,
};
export const SANTA_DATA_COLLECTIONS = Object.keys(_) as (keyof SantaData)[];


// -----------------------------------------------------------------
// 9. Helpers y Constantes Globales
// -----------------------------------------------------------------

export function inWindow(iso: string, start: number|Date, end: number|Date) {
  const t = +new Date(iso);
  const s = +new Date(start);
  const e = +new Date(end);
  return t >= s && t <= e;
}

export function orderTotal(o: { totalAmount?: number; lines: { priceUnit:number; qty:number; discount?:number }[] }) {
  if (typeof o.totalAmount === 'number') return o.totalAmount;
  if (!o || !o.lines) return 0;
  return o.lines.reduce((s, l) => s + l.priceUnit * l.qty * (1 - (l.discount || 0)), 0);
}

export const MATERIAL_CATEGORIES: Material['category'][] = ['raw', 'packaging', 'label', 'consumable', 'intermediate', 'finished_good', 'merchandising'];

export const SB_COLORS = {
  primary: "#F7D15F",
  accent: "#618E8F",
  sales: "#D7713E",
  marketing: "#D7713E",
  warehouse: "#A7D8D9",
  production: "#618E8F",
  finance: "#618E8F",
  analytics: "#618E8F",
  admin: "#618E8F",
  quality: "#F7D15F",
  general: "#618E8F",
  sun: "#F7D15F",
  cobre: "#D7713E",
  agua: "#A7D8D9",
  verde_mar: "#618E8F",
};

export const DEPT_META: Record<
  Department,
  { label: string; color: string; textColor: string }
> = {
  VENTAS: { label: 'Ventas', color: SB_COLORS.cobre, textColor: '#fff' },
  PRODUCCION: { label: 'Producción', color: SB_COLORS.verde_mar, textColor: '#fff' },
  ALMACEN:    { label: 'Almacén',    color: SB_COLORS.agua, textColor: SB_COLORS.verde_mar },
  MARKETING:  { label: 'Marketing',  color: SB_COLORS.sun, textColor: SB_COLORS.cobre },
  FINANZAS:   { label: 'Finanzas',   color: '#CCCCCC', textColor: '#333333' },
};
