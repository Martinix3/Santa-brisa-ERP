
// --- Santa Brisa: lógica de negocio (sell-out a botellas, agregados y KPIs) ---
import type {
  Account, Distributor, OrderSellOut, OrderLine, Product, User, SantaData
} from '@/domain/ssot';
import { inWindow, orderTotal } from '@/domain/ssot';

export type ResolvedAccountMode = 'PROPIA_SB' | 'COLOCACION' | 'DISTRIB_PARTNER';

// ===== 0) Lógica de negocio sobre el modelo de cuenta =====

/**
 * Deriva el modo de operación de una cuenta ('PROPIA_SB', 'COLOCACION', 'DISTRIB_PARTNER')
 * a partir de su `ownerId` y `billerId`. Esta es ahora la única fuente de verdad para el modo.
 */
export function computeAccountMode(account: Account): ResolvedAccountMode {
  // `ownerId` puede ser un `userId` (u_...) o un `distributorId` (d_...)
  // `billerId` puede ser 'SB' o un `distributorId` (d_...)

  const isOwnerUser = account.ownerId.startsWith('u_');
  const isBillerSB = account.billerId === 'SB';

  if (isOwnerUser && isBillerSB) {
    return 'PROPIA_SB';
  }
  if (isOwnerUser && !isBillerSB) {
    return 'COLOCACION';
  }
  if (!isOwnerUser && !isBillerSB) {
    return 'DISTRIB_PARTNER';
  }

  // Fallback por si hay una combinación inesperada (p.ej. owner de distribuidor pero factura SB)
  // Devolvemos el modo más restrictivo.
  return 'PROPIA_SB';
}


// ===== 1) Display Helpers =====
export function accountOwnerDisplay(
  acc: Account,
  users: User[],
  distributors: Distributor[]
): string {
  if (!acc.ownerId) return '—';

  const user = users.find(u => u.id === acc.ownerId);
  if (user) return user.name;

  const dist = distributors.find(d => d.id === acc.ownerId);
  if (dist) return dist.name;
  
  return acc.ownerId; // Fallback al ID si no se encuentra
}

// ===== 2) Conversion a botellas =====
export type BottlesOpts = {
  casesPerPallet?: number | Record<string, number>; // palet -> nº de CAJAS
  countNonBottleSkusAsZero?: boolean;               // por defecto true
};

function lineToBottles(line: OrderLine, product: Product | undefined, opts: BottlesOpts = {}): number {
  const isBottleSku = !!product?.bottleMl;
  if (!isBottleSku) return opts.countNonBottleSkusAsZero === false ? line.qty : 0;

  switch (line.unit) {
    case 'ud':   return line.qty;
    case 'caja': return (product.caseUnits ?? 0) * line.qty;
    case 'palet': {
      const cpp = typeof opts.casesPerPallet === 'number'
        ? opts.casesPerPallet
        : typeof opts.casesPerPallet === 'object'
          ? (opts.casesPerPallet?.[product.id] ?? 0)
          : 0;
      const cu = product.caseUnits ?? 0;
      return cpp > 0 && cu > 0 ? line.qty * cpp * cu : 0;
    }
    default: return 0;
  }
}

export function orderToBottles(order: OrderSellOut, products: Product[], opts?: BottlesOpts): number {
  return order.lines.reduce((s, l) => {
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

  const start = +new Date(startIso), end = +new Date(endIso);
  const orders = data.ordersSellOut.filter(o =>
    o.accountId === accountId && o.status === 'confirmed' && inWindow(o.createdAt, start, end)
  );

  const interactions = data.interactions.filter(i => i.accountId === accountId && inWindow(i.createdAt, start, end));

  // Find user to apply baseline
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

  const lastOrder = data.ordersSellOut
    .filter(o => o.accountId === accountId && o.status === 'confirmed')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const lastVisit = data.interactions
    .filter(i => i.accountId === accountId && i.kind==='VISITA')
    .sort((a,b)=> +new Date(b.createdAt) - +new Date(a.createdAt))[0];

  const now = new Date(end);
  const daysSinceLastOrder = lastOrder ? Math.max(0, Math.round((now.getTime() - +new Date(lastOrder.createdAt))/(1000*3600*24))) : undefined;
  const daysSinceLastVisit = lastVisit ? Math.max(0, Math.round((now.getTime() - +new Date(lastVisit.createdAt))/(1000*3600*24))) : undefined;

  return { accountId, unitsSold, orderCount, avgTicket, visitsCount, visitToOrderRate, daysSinceLastOrder, daysSinceLastVisit };
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
  const start = +new Date(startIso), end = +new Date(endIso);

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
  const avgTicketAll = totalOrders ? ordersInWin.map(orderTotal).reduce((a, b) => a + b, 0) / totalOrders : 0;

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
