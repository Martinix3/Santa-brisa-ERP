
// --- Santa Brisa: lógica de negocio (sell-out a botellas, agregados y KPIs) ---
import type {
  Account, Party, PartyRole, CustomerData, OrderSellOut, Product, User, SantaData, Activation, AccountRollup
} from '@/domain';

export const inWindow = (dateStr: string, start: Date, end: Date): boolean => {
  if (!dateStr) return false;
  const time = +new Date(dateStr);
  return time >= start.getTime() && time <= end.getTime();
};

export const orderTotal = (order: OrderSellOut): number => {
    return (order.lines || []).reduce((sum, line) => sum + (line.qty * line.priceUnit * (1 - (line.discount || 0))), 0);
}

export type ResolvedAccountMode = 'PROPIA_SB' | 'COLOCACION' | 'DISTRIB_PARTNER';

// ===== 0) Lógica de negocio sobre el modelo de cuenta =====

export function getDistributorForAccount(account: Account, partyRoles: PartyRole[], parties: Party[]): Party | null {
    if (!account || !partyRoles || !parties) return null;
    const customerRole = partyRoles.find(pr => pr.partyId === account.partyId && pr.role === 'CUSTOMER');
    if (!customerRole) return null;
    const billerId = (customerRole.data as CustomerData)?.billerId;
    if (!billerId || billerId === 'SB') return null;

    const distributorPartyRole = partyRoles.find(pr => pr.partyId === billerId && pr.role === 'DISTRIBUTOR');
    if (!distributorPartyRole) return null;

    return parties.find(p => p.id === distributorPartyRole.partyId) || null;
}

/**
 * Deriva el modo de operación de una cuenta ('PROPIA_SB', 'COLOCACION', 'DISTRIB_PARTNER')
 * a partir de su `ownerId` y `billerId`. Esta es ahora la única fuente de verdad para el modo.
 */
export function computeAccountMode(account: Account, customerRoleData?: CustomerData): ResolvedAccountMode {
  const isOwnerUser = account.ownerId.startsWith('u_');
  const isBillerSB = customerRoleData?.billerId === 'SB';

  if (isOwnerUser && isBillerSB) {
    return 'PROPIA_SB';
  }
  if (isOwnerUser && !isBillerSB) {
    return 'COLOCACION';
  }
  if (!isOwnerUser && !isBillerSB) {
    return 'DISTRIB_PARTNER';
  }
  return 'PROPIA_SB';
}


// ===== 1) Display Helpers =====
export function accountOwnerDisplay(
  acc: Account,
  users: User[],
  partyRoles: PartyRole[]
): string {
  if (!acc || !acc.ownerId) return '—';

  const user = (users || []).find(u => u.id === acc.ownerId);
  if (user) return user.name;

  const distRole = (partyRoles || []).find(pr => pr.partyId === acc.ownerId && pr.role === 'DISTRIBUTOR');
  if (distRole) return distRole.partyId; // Should resolve to party name
  
  return acc.ownerId; // Fallback al ID si no se encuentra
}

// ===== 2) Conversion a botellas =====
export type BottlesOpts = {
  casesPerPallet?: number | Record<string, number>; // palet -> nº de CAJAS
  countNonBottleSkusAsZero?: boolean;               // por defecto true
};

function lineToBottles(line: OrderSellOut['lines'][0], product: Product | undefined, opts: BottlesOpts = {}): number {
  const isBottleSku = !!product?.bottleMl;
  if (!isBottleSku) return opts.countNonBottleSkusAsZero === false ? line.qty : 0;

  switch (line.uom) {
    case 'uds':   return line.qty;
    default: return 0;
  }
}

export function orderToBottles(order: OrderSellOut, products: Product[], opts?: BottlesOpts): number {
  return (order.lines || []).reduce((s, l) => {
    const p = products.find(x => x.sku === l.sku);
    return s + lineToBottles(l, p, opts);
  }, 0);
}

// ===== 3) KPIs (unitsSold = BOTELLAS) =====
export type AccountKPIs = {
  accountId: string;
  unitsSold: number;       // botellas
  orderCount: number;
  avgTicket: number;       // €
  visitsCount: number;
  visitToOrderRate?: number;
  daysSinceLastOrder?: number;
  daysSinceLastVisit?: number;
};

export function computeAccountKPIs(params: {
  data: SantaData;
  accountId: string; startIso: string; endIso: string;
  lookbackDaysForConversion?: number;
}): AccountKPIs {
  const { data, accountId, startIso, endIso, lookbackDaysForConversion = 14 } = params;

  const start = new Date(startIso);
  const end = new Date(endIso);
  const orders = (data.ordersSellOut || []).filter(o =>
    o.accountId === accountId && o.status === 'confirmed' && inWindow(o.createdAt, start, end)
  );

  const interactions = (data.interactions || []).filter(i => i.accountId === accountId && inWindow(i.createdAt, start, end));

  const account = data.accounts.find(a => a.id === accountId);
  const ownerId = account?.ownerId;
  const user = ownerId ? data.users.find(u => u.id === ownerId) : undefined;
  const baseline = user?.kpiBaseline;

  const unitsSold = (baseline?.unitsSold || 0) + orders.reduce((s, o) => s + orderToBottles(o, data.products), 0);
  const orderCount = orders.length;
  
  const revenueFromOrders = orders.map(o => orderTotal(o)).reduce((a, b) => a + b, 0);
  const totalRevenue = (baseline?.revenue || 0) + revenueFromOrders;
  
  const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;
  
  const visitsCount = (baseline?.visits || 0) + interactions.filter(i => i.kind === 'VISITA').length;
  const visitsInWindow = interactions.filter(i => i.kind === 'VISITA');
  
  const ordersTimes = orders.map(o => +new Date(o.createdAt));
  const lookN = lookbackDaysForConversion * 24 * 3600 * 1000;
  const convertedVisits = visitsInWindow.filter(v => {
    const tv = +new Date(v.createdAt);
    return ordersTimes.some(to => to >= tv && to <= tv + lookN);
  }).length;
  const visitToOrderRate = visitsInWindow.length ? Number(((convertedVisits / visitsInWindow.length) * 100).toFixed(1)) : undefined;

  const lastOrder = (data.ordersSellOut || [])
    .filter(o => o.accountId === accountId && o.status === 'confirmed')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const lastVisit = (data.interactions || [])
    .filter(i => i.accountId === accountId && i.kind==='VISITA')
    .sort((a,b)=> +new Date(b.createdAt) - +new Date(a.createdAt))[0];

  const now = new Date(end);
  const daysSinceLastOrder = lastOrder ? Math.max(0, Math.round((now.getTime() - +new Date(lastOrder.createdAt))/(1000*3600*24))) : undefined;
  const daysSinceLastVisit = lastVisit ? Math.max(0, Math.round((now.getTime() - +new Date(lastVisit.createdAt))/(1000*3600*24))) : undefined;

  return { accountId, unitsSold, orderCount, avgTicket, visitsCount, visitToOrderRate, daysSinceLastOrder, daysSinceLastVisit };
}

// 4) Rollup por cuenta
export function computeAccountRollup(accountId: string, data: SantaData, periodStartIso: string, periodEndIso: string): AccountRollup {
    const start = new Date(periodStartIso);
    const end = new Date(periodEndIso);

    const accountActivations = (data.activations || []).filter(a => a.accountId === accountId);
    const activeActivations = accountActivations.filter(a => a.status === 'active');
    
    // Simplificación para PLV, en un caso real se usaría una entidad `plv_material`
    const plvVisit = (data.interactions || [])
        .filter(i => i.accountId === accountId && i.note?.toLowerCase().includes('plv'))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];

    const promotions = data.promotions || [];
    const now = new Date();
    const activePromotions = promotions.filter(p => now >= new Date(p.validFrom) && now <= new Date(p.validTo));

    // Lógica de atribución simplificada
    const ordersInPeriod = (data.ordersSellOut || []).filter(o => o.accountId === accountId && inWindow(o.createdAt, start, end));
    const attributedSalesInPeriod = ordersInPeriod.reduce((sum, order) => sum + orderTotal(order), 0);
    const ordersWithPromoInPeriod = ordersInPeriod.filter(o => o.notes?.toLowerCase().includes('promo')).length;

    return {
        accountId,
        hasPLVInstalled: !!plvVisit,
        lastPLVInstalledAt: plvVisit?.createdAt,
        activeActivations: activeActivations.length,
        lastActivationAt: activeActivations.sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate))[0]?.startDate,
        activePromotionIds: activePromotions.map(p => p.id),
        ordersWithPromoInPeriod: ordersWithPromoInPeriod,
        attributedSalesInPeriod: attributedSalesInPeriod,
    };
}

export type FleetKPIs = {
  horecaAccounts: number;
  activeWithOrders: number;
  coveragePct: number;
  totalUnits: number;  // botellas
  totalOrders: number;
  avgTicketAll: number;
  repurchaseRatePct: number;
  avgDaysBetweenOrders?: number;
};

export function computeFleetKPIs(params: {
  data: { products: Product[]; ordersSellOut: OrderSellOut[]; accounts: Account[]; };
  startIso: string; endIso: string;
}): FleetKPIs {
  const { data, startIso, endIso } = params;
  const start = new Date(startIso);
  const end = new Date(endIso);

  const horecaIds = data.accounts.filter(a => a.type === 'HORECA').map(a => a.id);
  const ordersInWin = data.ordersSellOut.filter(o =>
    o.status === 'confirmed' && inWindow(o.createdAt, start, end) && horecaIds.includes(o.accountId)
  );

  const byAccOrders = new Map<string, OrderSellOut[]>();
  horecaIds.forEach(id => byAccOrders.set(id, []));
  ordersInWin.forEach(o => byAccOrders.set(o.accountId, [...(byAccOrders.get(o.accountId) || []), o]));

  const activeWithOrders = Array.from(byAccOrders.values()).filter(arr => (arr?.length || 0) > 0).length;

  const totalUnits = ordersInWin.reduce((s, o) => s + orderToBottles(o, data.products), 0);
  const totalOrders = ordersInWin.length;
  const avgTicketAll = totalOrders ? ordersInWin.map(o => orderTotal(o)).reduce((a: number, b: number) => a + b, 0) / totalOrders : 0;

  const repurchaseRatePct = horecaIds.length
    ? (Array.from(byAccOrders.values()).filter(arr => (arr?.length || 0) >= 2).length / horecaIds.length) * 100
    : 0;

  const perAccDeltaDays: number[] = [];
  byAccOrders.forEach(arr => {
    if ((arr?.length || 0) >= 2) {
      const sorted = arr.map(o => +new Date(o.createdAt)).sort((a, b) => a - b);
      const deltas = sorted.slice(1).map((t, i) => (t - sorted[i]) / (1000 * 3600 * 24));
      perAccDeltaDays.push(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    }
  });
  const avgDaysBetweenOrders = perAccDeltaDays.length
    ? perAccDeltaDays.reduce((a, b) => a + b, 0) / perAccDeltaDays.length
    : undefined;

  return {
    horecaAccounts: horecaIds.length,
    activeWithOrders,
    coveragePct: horecaIds.length ? (activeWithOrders / horecaIds.length) * 100 : 0,
    totalUnits, totalOrders, avgTicketAll, repurchaseRatePct, avgDaysBetweenOrders
  };
}
