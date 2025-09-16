
// --- Santa Brisa: lógica de negocio (sell-out a botellas, agregados y KPIs) ---
import type {
  Account, Distributor, OrderSellOut, OrderLine, Product, User, Channel, SantaData
} from '@/domain/ssot';
import { inWindow, orderTotal } from '@/domain/ssot';

// ===== 1) Display Helpers =====
export function accountOwnerDisplay(
  acc: Account,
  users: User[],
  distributors: Distributor[]
): string {
  if (!acc.mode) return '—';
  const m = acc.mode;
  if (!m) return '—';

  switch (m.mode) {
    case 'PROPIA_SB':
    case 'COLOCACION': {
      if ('ownerUserId' in m) {
        return users.find(u => u.id === m.ownerUserId)?.name ?? '—';
      }
      return '—';
    }
    case 'DISTRIB_PARTNER': {
      if ('ownerPartnerId' in m) {
        return distributors.find(d => d.id === m.ownerPartnerId)?.name ?? '—';
      }
      return '—';
    }
    default: {
      // fallback por si aparecen modos nuevos
      const uid = (m as any)?.ownerUserId;
      const pid = (m as any)?.ownerPartnerId;
      const byUser = users.find(u => u.id === uid)?.name;
      const byPartner = distributors.find(d => d.id === pid)?.name;
      return byUser ?? byPartner ?? '—';
    }
  }
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

export function deriveChannel(a: Account): Channel {
  if (!a.mode) return 'propia'; // Fallback
  switch (a.mode.mode) {
    case 'PROPIA_SB':
      if (a.type === 'OTRO') return 'online'; // Asumiendo que 'OTRO' puede ser venta online directa
      return 'propia';
    case 'COLOCACION':
      return 'distribuidor';
    case 'DISTRIB_PARTNER':
      if (a.type === 'IMPORTADOR') return 'importador';
      return 'distribuidor';
    default:
      // Fallback a partir del tipo de cuenta si el modo no es concluyente
      switch(a.type) {
        case 'DISTRIBUIDOR': return 'distribuidor';
        case 'IMPORTADOR': return 'importador';
        case 'RETAIL': return 'online'; // Asumimos que retail online
        default: return 'propia';
      }
  }
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
  const ownerId = account?.mode && (account.mode.mode === 'PROPIA_SB' || account.mode.mode === 'COLOCACION') ? account.mode.ownerUserId : undefined;
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
