// Tipos mínimos compartidos por el motor
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
  mechanic: PromoMechanic;     // 'PCT' => porcentaje; 'FIXED' => descuento fijo por unidad
  value?: number;              // valor del descuento
  skuScope?: string[];         // si no se indica, aplica a todas las líneas del pedido
  validFrom?: ISO;
  validTo?: ISO;
  minQty?: number;             // cantidad mínima (pedido o línea, según tu uso)
  channels?: PromoChannel[];   // canales donde aplica
}

// Reexporta los tipos canónicos del dominio para evitar duplicidades o versiones reducidas.
export type {
  SantaData,
  Account,
  Order,
  Activation,
} from "@/domain/ssot";

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
  | { kind: 'EVENTO_MKT'; accountId?: string; description?: string; budget?: number; when?: ISO }
  | { kind: 'UNKNOWN'; summary: string };

export type BrainContext = {
  currentUser: { id: string; name?: string; email?: string };
};
