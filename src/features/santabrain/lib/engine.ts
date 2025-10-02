// src/features/santabrain/lib/engine.ts

/**
 * Engine — KPIs + Parsing + Promos (enhanced)
 * - Multi-item parsing: "6 cajas sb-750 y 3 sb-200"
 * - Fuzzy account by name (very light)
 * - Totals & promo application helpers
 */
import type {
  ISO, Period, Filters, SalesKpiResult, MarketingKpiResult,
  AccountRollup, Order, Promotion, Account, ParseResult, BrainContext, SantaData, OrderSellOut, Activation
} from "./types";
import { orderTotal, median, computeChannelMix, daysSinceISO, normalizeName, findSimilarAccounts, nameSimilarity } from "./helpers";
import { RULES, isPromotionApplicable } from "./rules";

// =============================
// KPI — Sales (unchanged from previous corrected version)
// =============================
export function computeSalesKPIs(period: Period, filters: Filters, data: {
  orders: Order[]; interactions: Array<{ accountId: string; when: ISO; kind: string; status: string }>; 
  accounts: Account[]; plv: Array<{ accountId: string; status: string }>; activations: any[];
}): SalesKpiResult {
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();

  const ordersIn = data.orders.filter((o: Order) => {
    const t = new Date(o.orderDate ?? o.createdAt).getTime();
    return t >= start && t <= end;
  });

  const pedidosAbiertos = data.orders.filter((o: Order) => o.status === 'open' || o.status === 'confirmed').length;
  const importeSellIn = Math.round(ordersIn.reduce((a:number,o:Order)=>a + (o.totalAmount ?? orderTotal(o)), 0));

  const byAcc: Record<string, number> = {};
  for (const o of ordersIn) byAcc[o.accountId] = (byAcc[o.accountId] ?? 0) + 1;
  const con1 = Object.values(byAcc).filter((c:number) => c >= 1).length || 1;
  const con2 = Object.values(byAcc).filter((c:number) => c >= 2).length;
  const pctRecompra = Math.round((con2 / con1) * 1000) / 10;

  const lastByAcc: Record<string, ISO> = {};
  for (const o of data.orders.sort((a:Order,b:Order)=>new Date(a.orderDate ?? a.createdAt).getTime()-new Date(b.orderDate ?? b.createdAt).getTime())) {
    lastByAcc[o.accountId] = o.orderDate ?? o.createdAt;
  }
  const dias = Object.values(lastByAcc).map((d: ISO) => daysSinceISO(d));
  const medianaDiasSinPedido = Math.round(median(dias));

  const completed = data.interactions.filter((i) => i.status === 'COMPLETADA' && new Date(i.when).getTime() >= start && new Date(i.when).getTime() <= end).length;
  const cuentasObjetivo = data.accounts.length || 1;
  const tasaContacto = Math.round((completed / cuentasObjetivo) * 1000) / 10;

  const visitasOk = data.interactions.filter((i) => i.kind === 'VISITA' && i.status === 'COMPLETADA' && new Date(i.when).getTime() >= start && new Date(i.when).getTime() <= end).length || 1;
  const pedidosPeriodo = ordersIn.length;
  const pctExitoVisitaPedido = Math.round((pedidosPeriodo / visitasOk) * 1000) / 10;

  const conPLV = new Set(data.plv.filter((p) => p.status === 'INSTALADO').map((p) => p.accountId)).size;
  const activas = data.accounts.length || 1;
  const penetracionPLV = Math.round((conPLV / activas) * 1000) / 10;

  const promoOrders = ordersIn.filter((o: Order) => (o.linkedPromotions?.length ?? 0) > 0).length;
  const promoAdoptionPct = Math.round((promoOrders / Math.max(1, ordersIn.length)) * 1000) / 10;

  const withPromo = ordersIn.filter((o: Order) => (o.linkedPromotions?.length ?? 0) > 0).map((o: Order) => (o.totalAmount ?? orderTotal(o)));
  const withoutPromo = ordersIn.filter((o: Order) => !o.linkedPromotions || o.linkedPromotions.length === 0).map((o: Order) => (o.totalAmount ?? orderTotal(o)));
  const avg = (xs:number[]) => (xs.length ? xs.reduce((a:number,b:number)=>a+b,0) / xs.length : 0);
  const upliftPromoPct = avg(withPromo) && avg(withoutPromo) ? Math.round(((avg(withPromo)/avg(withoutPromo))-1)*1000)/10 : 0;

  const activeAccs = new Set(data.activations.filter((a: any) => a.status === 'active' && new Date(a.startDate).getTime() <= end && (!a.endDate || new Date(a.endDate).getTime() >= start)).map((a: any) => a.accountId));
  const ventasAtribuiblesActivaciones = Math.round(ordersIn.filter((o: Order) => activeAccs.has(o.accountId)).reduce((a:number,o:Order)=>a+(o.totalAmount ?? orderTotal(o)),0));

  const roiMarketingGlobal = 0;
  const rankingComercial: Array<{salesRepId: string; importe: number; visitasOk?: number}> = [];

  return {
    pedidosAbiertos, importeSellIn, pctRecompra, medianaDiasSinPedido, tasaContacto,
    pctExitoVisitaPedido, penetracionPLV, promoAdoptionPct, upliftPromoPct,
    ventasAtribuiblesActivaciones, roiMarketingGlobal, rankingComercial
  };
}

// =============================
// KPI — Marketing (summary)
// =============================
export function computeMarketingKPIs(period: Period, filters: Filters, data: {
  spend: number; budget?: number; revenueAttributed: number; actionsCount: number;
}): MarketingKpiResult {
  const spendTotal = Math.round(data.spend || 0);
  const budget = data.budget || 0;
  const revenueAtribuido = Math.round(data.revenueAttributed || 0);
  const roiGlobal = (spendTotal ? Math.round(((revenueAtribuido - spendTotal) / Math.max(spendTotal, 1))*100)/100 : 0);
  const budgetBurnPct = budget ? Math.round((spendTotal / budget) * 1000)/10 : 0;
  return { spendTotal, budgetBurnPct, revenueAtribuido, roiGlobal, accionesTotales: data.actionsCount };
}

// =============================
// Rollup por cuenta
// =============================
export function computeAccountRollup(accountId: string, period: Period, data: {
  orders: Order[]; promotions: Promotion[]; plv: Array<{ accountId:string; status:string; installedAt?: ISO }>; activations: any[];
}): AccountRollup {
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();

  const plvAcc = data.plv.filter((p) => p.accountId === accountId && p.status === 'INSTALADO');
  const hasPLVInstalled = plvAcc.length > 0;
  const lastPLVInstalledAt = plvAcc.map((p)=>p.installedAt!).filter(Boolean).sort().slice(-1)[0];

  const activeActivations = data.activations.filter((a: any) => a.accountId === accountId && a.status === 'active').length;
  const lastActivationAt = data.activations.filter((a: any) => a.accountId === accountId).map((a)=>a.startDate).sort().slice(-1)[0];

  const ordersIn = data.orders.filter((o: Order) => o.accountId === accountId && new Date(o.orderDate ?? o.createdAt).getTime() >= start && new Date(o.orderDate ?? o.createdAt).getTime() <= end);
  const ordersWithPromoInPeriod = ordersIn.filter((o: Order) => (o.linkedPromotions?.length ?? 0) > 0).length;
  const attributedSalesInPeriod = Math.round(ordersIn.reduce((a:number,o:Order)=>a+(o.totalAmount ?? orderTotal(o)),0));

  const activePromotionIds = Array.from(new Set(ordersIn.flatMap((o: Order) => o.linkedPromotions ?? [])));

  return { accountId, hasPLVInstalled, lastPLVInstalledAt, activeActivations, lastActivationAt, activePromotionIds, ordersWithPromoInPeriod, attributedSalesInPeriod };
}

// =============================
// Promos
// =============================
export function applyPromotionToOrder(order: Order, promo: Promotion, nowISO: ISO): Order {
  if (!isPromotionApplicable(order, promo, nowISO)) return order;
  const lines = (order.lines || []).map((l: Order['lines'][number]) => {
    const inScope = !promo.skuScope || promo.skuScope.includes(l.itemId);
    if (!inScope) return l;
    if (promo.mechanic === 'PCT') {
      const value = Math.max(0, Math.min(100, promo.value ?? 0));
      return { ...l, discountPct: Math.max(value, l.discountPct ?? 0) };
    }
    if (promo.mechanic === 'FIXED') {
      const value = Math.max(0, promo.value ?? 0);
      return { ...l, priceUnit: Math.max(0, (l.priceUnit ?? 0) - value) };
    }
    return l;
  });
  const linked = Array.from(new Set([...(order.linkedPromotions ?? []), promo.id]));
  return { ...order, lines, linkedPromotions: linked };
}

// =============================
// Parsing: nota → acción (multi-item + fuzzy cuenta)
// =============================
const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const qtySkuRe = /(\d+)\s*(?:cajas?|bx|cs|uds?|botellas?)?\s*([a-z0-9\-_/.]+)/gi;
const pedidoRe = /pedido para\s+(.+?)(?:\s+en\s+(.+))?$/i;

// firmas overload arriba del cuerpo
export function parseNoteToAction(note: string, ctx: BrainContext): ParseResult;
export function parseNoteToAction(
  note: string,
  ctx: BrainContext,
  data: { accounts: Account[] }
): ParseResult;

// implementación (tu cuerpo actual) con `data` opcional
export function parseNoteToAction(
  note: string,
  ctx: BrainContext,
  data?: { accounts: Account[] }
): ParseResult {
  const text = note.trim();
  const accounts = data?.accounts ?? []; // <— fallback si llaman con 2 args

  // ... usa `accounts` en lugar de `data.accounts`
  const header = text.match(pedidoRe);
  const maybeAccount = header?.[1]?.trim();
  const maybeLocation = header?.[2]?.trim();

  const items: Array<{qtyCases:number; itemId:string}> = [];
  let m: RegExpExecArray | null;
  while ((m = qtySkuRe.exec(text)) !== null) {
    items.push({ qtyCases: parseInt(m[1],10) || 0, itemId: m[2].toLowerCase() });
  }

  if (items.length > 0 || /\bpedido\b/i.test(text)) {
    const accountName = maybeAccount ?? 'Cuenta sin especificar';
    const found = maybeAccount ? findAccountByNameFuzzy(maybeAccount, accounts) : undefined;
    const first = items[0] ?? { qtyCases: 0, itemId: '' };

    return {
      kind: 'PEDIDO',
      accountId: found?.id,
      accountName,
      isNewAccount: !found,
      qtyCases: first.qtyCases,
      itemId: first.itemId,
      location: maybeLocation || undefined,
      distributorName: '',
      summary: text,
    };
  }

  if (/\bvisita\b/i.test(text)) {
    return { kind: 'VISITA', summary: text };
  }
  if (/evento|activaci[oó]n|activation/i.test(text)) {
    return { kind: 'EVENTO_MKT', description: text, summary: text } as any;
  }
  return { kind: 'UNKNOWN', summary: text };
}

const findAccountByNameFuzzy = (name: string, accounts: Account[]): Account | undefined => {
    const needle = normalizeName(name);
    let best: { acc: Account, score: number } | null = null;
    for (const acc of accounts) {
        const score = nameSimilarity(needle, acc.name);
        if (!best || score > best.score) best = { acc, score };
    }
    return best && best.score > 0.6 ? best.acc : undefined;
};


// =============================
// Order helpers for UI: draft builder and promo pass
// =============================
export function buildDraftOrderFromParsed(input: {
  accountId?: string; accountName: string; items: Array<{ sku: string; qty: number }>; notes?: string;
}): OrderSellOut { // Devuelve el tipo correcto
  const now = new Date().toISOString();
  return {
    id: `draft_${Math.random().toString(36).slice(2)}`,
    accountId: input.accountId ?? 'NEW_ACCOUNT',
    status: 'open', // Usa un estado válido
    currency: 'EUR',
    // Usa 'lines' y asume que 'sku' puede mapearse a 'itemId'
    lines: input.items.map(it => ({ 
        itemId: it.sku, // Asume que el SKU es el itemId
        qty: it.qty,
        uom: 'unit', // Necesitas un valor por defecto
        priceUnit: 0 // Necesitas un valor por defecto
    })),
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyPromotionsChain(order: Order, promotions: Promotion[], nowISO?: ISO): Order {
  const now = nowISO ?? new Date().toISOString();
  return promotions.reduce((o, p) => applyPromotionToOrder(o, p, now), order);
}

export function computeOrderTotalWithPromos(draft: Order, promotions: Promotion[], nowISO?: ISO): number {
  const withPromo = applyPromotionsChain(draft, promotions, nowISO);
  return orderTotal(withPromo);
}
