/**
 * Helpers — funciones puras + normalizaciones
 */
import type { ISO, Order, Account } from "./types";

export const toISO = (d: Date|string|number): ISO => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString();
};

export const daysSinceISO = (iso: ISO): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
};

export function orderTotal(order: Order): number {
  const sum = order.items.reduce((acc: number, l: Order['items'][number]) => {
    const price = l.unitPrice ?? 0;
    const disc = (l.discountPct ?? 0) / 100;
    return acc + (price * l.qty) * (1 - disc);
  }, 0);
  return Math.max(0, Math.round(sum * 100) / 100);
}

export const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const arr = [...xs].sort((a,b)=>a-b);
  const mid = Math.floor(arr.length/2);
  return arr.length % 2 ? arr[mid] : (arr[mid-1]+arr[mid])/2;
};

export function groupByPeriod(orders: Order[], start: ISO, end: ISO, granularity: 'day'|'week'|'month') {
  const res: Record<string, number> = {};
  for (const o of orders) {
    const t = new Date(o.date);
    const ts = t.getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (ts < s || ts > e) continue;
    let key = '';
    const y = t.getUTCFullYear();
    const m = t.getUTCMonth()+1;
    const d = t.getUTCDate();
    if (granularity === 'day') key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    else if (granularity === 'week') {
      const firstJan = new Date(Date.UTC(y,0,1));
      const week = Math.ceil((((t.getTime()-firstJan.getTime())/86400000)+firstJan.getUTCDay()+1)/7);
      key = `${y}-W${String(week).padStart(2,'0')}`;
    } else {
      key = `${y}-${String(m).padStart(2,'0')}`;
    }
    res[key] = (res[key] ?? 0) + (o.amount ?? orderTotal(o));
  }
  return Object.entries(res).map(([x, amount]) => ({ x, amount }));
}

export function computeChannelMix(orders: Order[], accounts: Account[]) {
  const byId = new Map(accounts.map((a: Account) => [a.id, a]));
  const mix = { ONLINE: 0, PRIVADA: 0, HORECA: 0, RETAIL: 0 } as Record<'ONLINE'|'PRIVADA'|'HORECA'|'RETAIL', number>;
  for (const o of orders) {
    const acc = byId.get(o.accountId);
    const isOnline = o.source === 'Shopify' || acc?.channel === 'Online';
    const isPrivada = acc?.accountType === 'CLIENTE_FINAL' && (acc as any).segment === 'Privada';
    const isHoreca = acc?.channel === 'Horeca';
    const isRetail = acc?.channel === 'Retail';
    const amount = o.amount ?? orderTotal(o);
    if (isOnline) mix.ONLINE += amount;
    else if (isPrivada) mix.PRIVADA += amount;
    else if (isHoreca) mix.HORECA += amount;
    else if (isRetail) mix.RETAIL += amount;
  }
  const total = Object.values(mix).reduce((a,b)=>a+b,0) || 1;
  const pct = Object.fromEntries(Object.entries(mix).map(([k,v]) => [k, Math.round((v/total)*1000)/10]));
  return { amounts: mix, percents: pct as Record<string, number>, total };
}

// ===== Normalizaciones =====
export function normalizeName(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}
