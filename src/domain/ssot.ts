
// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL v5 (Directa vs Colocación)
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type CommercialFlow = 'DIRECT' | 'PLACEMENT';

// --- Núcleo legal (único por CIF) ---
export type Address = { street: string; city: string; zip: string; province?: string; country: string; };

export type Party = {
  id: string;
  legalName: string;
  cif?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  contacts?: { name: string; email?: string; phone?: string; }[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

// --- Vista comercial ---
export type Segment = 'HORECA' | 'RETAIL' | 'ONLINE' | 'PRIVADA';
export type Stage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA';

export interface Account {
  id: string;
  partyId: string;
  mode: AccountMode; // Kept for compatibility, should be deprecated in favor of flow
  flow: CommercialFlow; // The new source of truth for the flow
  segment: Segment;
  name: string;
  ownerId?: string;
  stage: Stage;
  distributorPartyId?: string; // Requerido si flow es PLACEMENT
  priceListId?: string; // solo DIRECTA
  createdAt: string;
  updatedAt: string;
}

// --- Pedidos de venta propia (incluye online) ---
export interface OrderSellIn {
  id: string;
  accountId: string; // account.flow = DIRECT
  channel: 'FIELD' | 'ONLINE'; // ONLINE si viene de Shopify
  status: 'draft' | 'open' | 'confirmed' | 'fulfilled' | 'invoiced' | 'paid' | 'cancelled';
  lines: { sku: string; qty: number; unitPrice: number; discountPct?: number; }[];
  total?: number;
  currency: 'EUR';
  shipmentId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Pedidos reportados (distribuidor) ---
export interface OrderSellOut {
  id: string;
  orderNumber?: string; // Added for consistency
  accountId: string; // account.flow = PLACEMENT
  flow: 'PLACEMENT'; // Fixed value
  distributorPartyId: string; // redundante para filtro rápido
  date: string;
  status: 'invoiced'|'shipped'|'open'|'cancelled';
  currency: 'EUR';
  totalAmount: number;
  lines: { itemId: string; qty: number; unitPrice?: number }[];
  createdAt: string;
  updatedAt: string;
}

// --- Logística/finanzas (solo DIRECTA) ---
export interface Shipment { id: string; orderId: string; status:'pending'|'picking'|'ready'|'shipped'|'cancelled'; labelUrl?: string; trackingCode?: string; createdAt:string; updatedAt:string };
export interface Invoice  { id: string; orderId: string; number: string; status:'draft'|'issued'|'paid'|'cancelled'; amount:number; createdAt:string; updatedAt:string };

// --- Precios (solo DIRECTA) ---
export interface PriceList { id: string; name: string; currency:'EUR'; lines: { sku:string; price:number }[]; validFrom?:string; validTo?:string };
export interface AccountPriceOverride { id:string; accountId:string; sku:string; price:number; currency:'EUR' };

// --- Marketing (aplica en DIRECTA si procede) ---
export interface PlvMaterial { id:string; accountId:string; kind:string; status:'SOLICITADO'|'ENTREGADO'|'INSTALADO'|'RETIRADO'; photoUrl?:string; installedAt?:string; createdAt:string; updatedAt:string };
export interface Activation  { id:string; accountId:string; description:string; status:'planned'|'active'|'closed'; startDate:string; endDate?:string; ownerId?:string; createdAt:string; updatedAt:string };
export interface Promotion   { id:string; name:string; validFrom:string; validTo:string; mechanic:'PCT'|'BOGO'|'5+1'|'VALUE'; data?:any };

// --- Marketing POS Refactorizado ---
export type PosCatalogItem = {
  id: string;
  name: string;                        // "Camarero 3h", "Cubitera", "Margarita Day (pack)", "Reforma barra"
  family: 'MATERIAL'|'SERVICIO'|'EVENTO'|'PACK'|'OTRO';
  unit?: 'ud'|'h'|'kit';
  defaultCost?: number;
  // Cómo se completa:
  fulfillmentMode: 'DELIVERY_QTY'|'EVENT_KPIS'|'SERVICE_KPIS'|'CUSTOM_DEFERRED';
  // Qué tipo de tarea programar (si se planifica):
  defaultTaskKind?: 'ENTREGA_PLV'|'EVENTO_POS'|'SERVICIO_POS';
  // KPIs / campos sugeridos por defecto (plantilla)
  defaultKpisTemplate?: {
    askAttendees?: boolean;
    askSamples?: boolean;
    askUpliftPct?: boolean;
    askPhotos?: boolean;
    extraFields?: { key:string; label:string; type:'number'|'text' }[];
  };
  // Si es un PACK: componentes (para coste/stock/visibilidad)
  components?: Array<{ catalogItemId: string; qty: number }>;
};

export type PosTactic = {
  id: string;
  accountId: string;
  catalogItemId?: string;              // si viene de catálogo
  qtyPlanned?: number;                 // para MATERIAL/PLV
  customDesc?: string;                 // si es custom
  visibility?: 'ALTA'|'MEDIA'|'BAJA';
  estCost?: number;                    // puede sobrescribir defaultCost

  status: 'APPROVED'|'SCHEDULED'|'DELIVERED'|'CLOSED';
  // vínculo con agenda
  taskId?: string;                     // una tarea de agenda (entrega/servicio/evento)
  // datos de cierre
  qtyDelivered?: number;
  kpis?: Record<string, number|string|undefined>; // resultado siguiendo plantilla
  photos?: string[];

  createdAt: string; updatedAt: string; createdById?: string;
};

// --- Otras entidades necesarias para la compilación ---
export type {
  User,
  Item,
  BillOfMaterial,
  ProductionOrder,
  StockMove,
  GoodsReceipt,
  OnHandView,
  PartyRole,
  Interaction,
  MarketingEvent,
  OnlineCampaign,
  InfluencerCollab,
  PosTacticItem,
  PosCostCatalogEntry,
  Lot,
  QcTest,
  QcPlanBySku,
  ParameterBySku,
  Protocol,
  Timestamp,
  LotNumber,
  ISO,
  UnitOfMass,
  UnitOfVolume,
  SalesUnit,
  Uom,
  Currency,
  Department,
  PartyRoleType,
  AccountType,
  Stage as AccountStage,
  UserRole,
  InteractionStatus,
  OrderStatus as OriginalOrderStatus,
  ShipmentStatus,
  ProductionStatus,
  ProductionStage,
  ItemCategory,
  QcStatus,
  LotStatus,
  LotBucket,
  InteractionKind,
  EventKind,
  PosTacticStatus,
  TraceEventKind,
  TraceEventPhase,
  DeliveryNote,
  FinanceLink,
  PaymentLink,
  AccountMode, // Keep for compatibility
} from './ssot.v4';
import type { SantaDataV4 } from './ssot.v4';
import { SANTA_DATA_COLLECTIONS as SANTA_DATA_COLLECTIONS_V4 } from './ssot.v4';

// Exportar un tipo unificado para la data
export interface SantaData extends SantaDataV4 {
    parties: Party[];
    accounts: Account[];
    ordersSellIn: OrderSellIn[];
    ordersSellOut: OrderSellOut[];
    shipments: Shipment[];
    invoices: Invoice[];
    priceLists: PriceList[];
    accountPriceOverrides: AccountPriceOverride[];
    plvMaterials: PlvMaterial[];
    activations: Activation[];
    promotions: Promotion[];
    posCatalog: PosCatalogItem[];
    posTactics: PosTactic[];
}

export function qcToBucket(s: QcStatus): 'HOLD' | 'RELEASED' | 'REJECTED' {
  const norm = String(s ?? 'PENDING').toUpperCase();
  if (norm === 'PASSED' || norm === 'WAIVED' || norm === 'RELEASED' || norm === 'OK' || norm === 'APPROVED') return 'RELEASED';
  if (norm === 'FAILED' || norm === 'REJECTED') return 'REJECTED';
  return 'HOLD'; // PENDING, HOLD, QC_HOLD, etc.
};

export const SANTA_DATA_COLLECTIONS = SANTA_DATA_COLLECTIONS_V4;

export * from './ssot.metas';
