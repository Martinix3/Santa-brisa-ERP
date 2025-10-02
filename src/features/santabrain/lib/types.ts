
// src/features/santabrain/lib/types.ts
// Reexporta los tipos canónicos del dominio para evitar duplicidades o versiones reducidas.
export type {
  SantaData,
  Account,
  OrderSellOut as Order, // Renombra OrderSellOut a Order
  Activation,
} from "@/domain/ssot";


// Si aquí defines tipos *propios* de Santabrain (Period, Filters, BrainContext, ParseResult, etc.),
// mantenlos, pero NO vuelvas a declarar SantaData/Account/Order con formas “reducidas”.
export type ISO = string;

export type PromoMechanic = 'PCT' | 'FIXED';
export type PromoChannel =
  | 'ONLINE'
  | 'PRIVADA'
  | 'HORECA'
  | 'RETAIL'
  | 'DISTRIBUIDOR'
  | 'IMPORTADOR';

export interface Promotion {
  id: string;
  name?: string;
  // Ventana temporal
  validFrom?: ISO;
  validTo?: ISO;
  // Segmentación por canal
  channels?: PromoChannel[];
  // Ámbito de SKUs
  skuScope?: string[];
  // Mecánica
  mechanic: PromoMechanic; // 'PCT' => porcentaje; 'FIXED' => descuento fijo por unidad
  value?: number;      // valor del descuento
  // Requisitos
  minQty?: number;     // unidades mínimas (dentro del scope)
}


// Tipos locales de Santabrain
export type PeriodView = 'WEEK'|'MONTH'|'YEAR';
export type Period = { start: ISO; end: ISO };
export type Filters = {
  salesRepId?: string;
  region?: string;
  channel?: Array<'ONLINE'|'PRIVADA'|'HORECA'|'RETAIL'>;
  accountType?: string[];
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

export type ParseResult =
  | { kind: 'PEDIDO'; accountId?: string; accountName: string; isNewAccount: boolean; qtyCases: number; itemId?: string; location?: string; distributorName?: string; summary: string }
  | { kind: 'VISITA'; accountId?: string; when?: ISO; summary?: string }
  | { kind: 'EVENTO_MKT'; accountId?: string; description?: string; budget?: number; when?: ISO; subKind?: 'LEAD_LOST' | 'POS_ACTIVITY'; reason?: 'PRECIO' | 'PRODUCTO_NO_ENCAJA' | 'COMPETENCIA' | 'SIN_INFORMACION' }
  | { kind: 'UNKNOWN'; summary: string };

export type BrainContext = {
  currentUser: { id: string; name?: string; email?: string };
};
