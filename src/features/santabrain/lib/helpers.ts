/**
 * Helpers — funciones puras + normalizaciones
 */
import type { ISO, Order, Account } from "./types";
import type { SantaData } from '@/domain/ssot';

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


// --- helpers de similitud y geodist ---

const STOPWORDS = new Set([
  'bar','bars',','cafeteria','cafetería','restaurante','restaurant',
  'pub','taberna','cerveceria','cervecería','la','el','los','las','de','del'
]);

export function tokenizeName(s: string) {
  return normalizeName(s)
    .split(' ')
    .filter(t => t && !STOPWORDS.has(t));
}

// Jaccard de tokens (simple y robusto para nombres de locales)
export function nameSimilarity(a: string, b: string) {
  const A = new Set(tokenizeName(a));
  const B = new Set(tokenizeName(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return inter / union; // 0..1
}

// Haversine (metros)
export function distanceMeters(a: {lat:number,lng:number}, b: {lat:number,lng:number}) {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI/180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type SimilarAccountHit = {
  accountId: string;
  accountName: string;
  partyId?: string;
  similarity: number;     // 0..1 (nombre)
  distanceM?: number;     // en metros si hay coordenadas
};

// Busca candidatos en memoria (SSOT) por nombre/proximidad.
export function findSimilarAccounts(opts: {
  data: { accounts: Array<{id:string; name:string; partyId:string}>, parties: Array<{id:string; name:string; location?: {lat:number; lng:number}}>}
  candidateName: string;
  candidateLoc?: { lat:number; lng:number } | null;
  // umbrales
  minNameSim?: number;        // p.ej. 0.45
  radiusM?: number;           // p.ej. 1200
}): SimilarAccountHit[] {
  const { data, candidateName, candidateLoc, minNameSim = 0.45, radiusM = 1200 } = opts;
  const hits: SimilarAccountHit[] = [];

  for (const acc of data.accounts) {
    const party = data.parties.find(p => p.id === acc.partyId);
    const sim = nameSimilarity(candidateName, acc.name);
    if (sim < minNameSim) continue;

    let dist: number | undefined;
    if (candidateLoc && party?.location) {
      dist = distanceMeters(candidateLoc, party.location);
      if (dist > radiusM) continue; // si hay loc, filtra por radio
    }

    hits.push({
      accountId: acc.id,
      accountName: acc.name,
      partyId: acc.partyId,
      similarity: sim,
      distanceM: dist
    });
  }

  // ordena por mejor coincidencia (nombre fuerte + más cerca)
  return hits.sort((a, b) => {
    const bySim = b.similarity - a.similarity;
    if (bySim !== 0) return bySim;
    const da = a.distanceM ?? Number.POSITIVE_INFINITY;
    const db = b.distanceM ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

export type DuplicateDecision =
  | { action: 'BLOCK_AUTO_CREATE'; reason: string; matches: SimilarAccountHit[] }
  | { action: 'WARN'; reason: string; matches: SimilarAccountHit[] }
  | { action: 'PROCEED' };

export function assessDuplicateRisk(
  matches: SimilarAccountHit[]
): DuplicateDecision {
  if (!matches.length) return { action: 'PROCEED' };

  const top = matches[0];
  const near = (top.distanceM ?? 999999);

  // Regla dura: si nombre muy parecido y < 300 m → bloquear
  if (top.similarity >= 0.75 && near <= 300) {
    return {
      action: 'BLOCK_AUTO_CREATE',
      reason: `Coincidencia muy fuerte (“${top.accountName}”, ${(top.similarity*100)|0}% a ${near|0}m)`,
      matches: matches.slice(0, 5)
    };
  }

  // Regla intermedia: nombre razonable o < 600 m → avisar
  if (top.similarity >= 0.55 || near <= 600) {
    return {
      action: 'WARN',
      reason: `Podría ser duplicado (“${top.accountName}”, ${(top.similarity*100)|0}% a ${near|0}m)`,
      matches: matches.slice(0, 5)
    };
  }

  return { action: 'PROCEED' };
}

export function makeBoundingBox(center:{lat:number;lng:number}, radiusM:number){
  const latR = radiusM / 111320; // ~ metros por grado lat
  const lngR = radiusM / (111320 * Math.cos(center.lat * Math.PI/180));
  return {
    minLat: center.lat - latR, maxLat: center.lat + latR,
    minLng: center.lng - lngR, maxLng: center.lng + lngR
  };
}
