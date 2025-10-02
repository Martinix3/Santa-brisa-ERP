/**
 * Santa Brain — Types (Unified)
 * - Enums normalizados (SSOT-aligned)
 * - Fechas como ISO string
 * - Resultados de KPIs centralizados
 */

// =========================
// Enums canónicos (SSOT)
// =========================
export type PlvStatus = 'SOLICITADO' | 'ENTREGADO' | 'INSTALADO' | 'RETIRADO';
export type ActivationStatus = 'planned' | 'active' | 'closed' | 'cancelled';
export type PromotionStatus = 'draft' | 'active' | 'expired';
export type OrderStatus = 'BORRADOR' | 'ABIERTO' | 'EN_PROCESO' | 'SERVIDO' | 'FACTURADO' | 'PAGADO' | 'CANCELADO';
export type InteractionKind = 'LLAMADA' | 'VISITA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
export type InteractionStatus = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';

// =========================
// Tipos base (SSOT compacto)
// =========================
export type ISO = string;
export type Currency = 'EUR';

export type Account = {
  id: string;
  name: string;
  accountType: 'CLIENTE_FINAL'|'DISTRIBUIDOR'|'IMPORTADOR'|'HORECA'|'RETAIL'|'OTRO';
  channel?: 'Online'|'Horeca'|'Retail'|'Privada'|string;
  salesRepId?: string;
  createdAt: ISO;
  updatedAt?: ISO;
};

export type OrderLine = {
  sku: string;
  qty: number;
  unitPrice?: number;
  discountPct?: number;
};

export type Order = {
  id: string;
  accountId: string;
  date: ISO;
  status: OrderStatus;
  amount?: number; // calculado
  currency: Currency;
  source?: 'Shopify'|string;
  linkedPromotions?: string[];
  items: OrderLine[];
  notes?: string;
  createdAt: ISO;
  updatedAt?: ISO;
};

export type Promotion = {
  id: string;
  name?: string;
  // ventana temporal
  validFrom?: string; // ISO
  validTo?: string;   // ISO
  // segmentación
  channels?: Array<'ONLINE'|'PRIVADA'|'HORECA'|'RETAIL'|'DISTRIBUIDOR'|'IMPORTADOR'>;
  skuScope?: string[]; // <— necesario para filtrar líneas en apply/applicable
  // mecánica
  mechanic?: 'PCT' | 'FIXED';
  value?: number;      // % o importe según mechanic
  minQty?: number;     // unidades mínimas en scope
};

export type PlvMaterial = {
  id: string;
  accountId: string;
  kind: 'SHELF_TALKER'|'STANDEE'|'FRIDGE_STICKER'|'HANGING'|'GONDOLA'|'OTHER'|string;
  quantity?: number;
  status: PlvStatus;
  photoUrl?: string;
  installedAt?: ISO;
  createdAt: ISO;
  updatedAt?: ISO;
};

export type Activation = {
    id: string;
    accountId: string;
    startDate: ISO;
    endDate?: ISO;
    status: 'active' | 'paused' | 'ended';
};

export type SantaData = {
    accounts: Account[];
    orders: Order[];
    promotions: Promotion[];
    plv: PlvMaterial[];
    activations: Activation[];
    interactions: Interaction[];
};


export type Interaction = {
  id: string;
  accountId: string;
  when: ISO;
  kind: InteractionKind;
  status: InteractionStatus;
  result?: string;
  summary?: string;
  createdAt: ISO;
  updatedAt?: ISO;
};

// =========================
// KPI / Period / Filtros
// =========================
export type PeriodView = 'WEEK'|'MONTH'|'YEAR';
export type Period = { start: ISO; end: ISO };
export type Filters = {
  salesRepId?: string;
  region?: string;
  channel?: Array<'ONLINE'|'PRIVADA'|'HORECA'|'RETAIL'>;
  accountType?: Account['accountType'][];
};

export type SalesKpiResult = {
  pedidosAbiertos: number;
  importeSellIn: number;
  pctRecompra: number;
  medianaDiasSinPedido: number;
  tasaContacto: number;
  pctExitoVisitaPedido: number;
  penetracionPLV: number;
  promoAdoptionPct: number;
  upliftPromoPct: number;
  ventasAtribuiblesActivaciones: number;
  roiMarketingGlobal: number;
  rankingComercial: Array<{ salesRepId: string; importe: number; visitasOk?: number }>;
};

export type MarketingKpiResult = {
  spendTotal: number;
  budgetBurnPct: number;
  revenueAtribuido: number;
  roiGlobal: number;
  accionesTotales: number;
};

export type AccountRollup = {
  accountId: string;
  hasPLVInstalled: boolean;
  lastPLVInstalledAt?: ISO;
  activeActivations: number;
  lastActivationAt?: ISO;
  activePromotionIds: string[];
  ordersWithPromoInPeriod: number;
  attributedSalesInPeriod: number;
};

// =========================
// Santa Brain parsing
// =========================
export type ParseResult =
  | { kind: 'PEDIDO'; accountId?: string; accountName: string; isNewAccount: boolean; qtyCases: number; itemId?: string; location?: string; distributorName?: string; summary: string }
  | { kind: 'VISITA'; accountId?: string; when?: ISO; summary?: string }
  | { kind: 'EVENTO_MKT'; accountId?: string; description?: string; budget?: number; when?: ISO }
  | { kind: 'UNKNOWN'; summary: string };

export type BrainContext = {
  currentUser: { id: string; name?: string; email?: string };
};
