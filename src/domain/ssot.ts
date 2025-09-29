// src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL v5 (Directa vs Colocación)
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

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
export type AccountMode = 'DIRECTA' | 'COLOCACION';
export type Segment = 'HORECA' | 'RETAIL' | 'ONLINE' | 'PRIVADA';
export type Stage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA';

export interface Account {
  id: string;
  partyId: string;
  mode: AccountMode;
  segment: Segment;
  name: string;
  ownerId?: string;
  stage: Stage;
  distributorId?: string; // requerido si COLOCACION
  priceListId?: string; // solo DIRECTA
  createdAt: string;
  updatedAt: string;
}

// --- Pedidos de venta propia (incluye online) ---
export interface OrderSellIn {
  id: string;
  accountId: string; // account.mode = DIRECTA
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
  accountId: string; // account.mode = COLOCACION
  distributorId: string; // redundante para filtro rápido
  date: string;
  lines: { sku: string; qty: number; unitPriceReported?: number; }[];
  totalReported?: number;
  currency?: 'EUR';
  createdAt: string;
  updatedAt: string;
}

// --- Logística/finanzas (solo DIRECTA) ---
export interface Shipment {
  id: string;
  orderId: string;
  status: 'pending' | 'picking' | 'ready' | 'shipped' | 'cancelled';
  labelUrl?: string;
  trackingCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  number: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  amount: number;
  createdAt: string;
  updatedAt: string;
}

// --- Precios (solo DIRECTA) ---
export interface PriceList {
  id: string;
  name: string;
  currency: 'EUR';
  lines: { sku: string; price: number; }[];
  validFrom?: string;
  validTo?: string;
}

export interface AccountPriceOverride {
  id: string;
  accountId: string;
  sku: string;
  price: number;
  currency: 'EUR';
}

// --- Marketing (aplica en DIRECTA si procede) ---
export interface PlvMaterial {
  id: string;
  accountId: string;
  kind: string;
  status: 'SOLICITADO' | 'ENTREGADO' | 'INSTALADO' | 'RETIRADO';
  photoUrl?: string;
  installedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activation {
  id: string;
  accountId: string;
  description: string;
  status: 'planned' | 'active' | 'closed';
  startDate: string;
  endDate?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  name: string;
  validFrom: string;
  validTo: string;
  mechanic: 'PCT' | 'BOGO' | '5+1' | 'VALUE';
  data?: any;
}


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
  PosTactic,
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
  PaymentLink
} from './ssot.v4';
import type { SantaDataV4, SB_THEME } from './ssot.v4';

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
}

export { SB_THEME };
export * from './ssot.metas';
