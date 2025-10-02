// src/features/santabrain/lib/helpers.ts
import type { Account, Order } from "./types";

// ============================================================================
// 1) Helpers de pedidos / analítica
// ============================================================================

// Tipos ligeros locales para evitar acoplar todo el kernel
export type OrderLike = {
  items: Array<{ sku?: string; qty: number; unitPrice?: number; discountPct?: number }>;
  amount?: number;
};

/** Total de pedido robusto: usa líneas (qty*unitPrice) y respeta discountPct; fallback a order.amount */
export function orderTotal(o: OrderLike): number {
  const items = Array.isArray(o.items) ? o.items : [];
  return items.reduce(
    (
      sum: number,
      l: { qty: number; unitPrice?: number; discountPct?: number }
    ) => {
      const price = Math.max(0, l.unitPrice ?? 0);
      const pct = Math.max(0, Math.min(100, l.discountPct ?? 0));
      return sum + (l.qty || 0) * price * (1 - pct / 100);
    },
    0
  );
}


/** Mediana numérica segura */
export function median(nums: number[]): number {
  if (!nums?.length) return 0;
  const xs = [...nums].sort((a: number, b: number) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
}


/** Días desde un ISO (redondeo hacia abajo) */
export function daysSinceISO(d: string): number {
  const t = new Date(d).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}


/** Mix de canales para dashboard (excluye distribuidores/importadores) */
export function computeChannelMix(orders: Order[], accounts: Account[]) {
  const byId = new Map(accounts.map((a: Account) => [a.id, a]));
  const buckets = { ONLINE: 0, PRIVADA: 0, HORECA: 0, RETAIL: 0 };

  for (const o of orders) {
    const acc = o.accountId ? byId.get(o.accountId) : undefined;
    let ch: keyof typeof buckets | null = null;

    const src = (o as any).source;
    if (src === "Shopify" || acc?.segment === "ONLINE") ch = "ONLINE";
    else if (acc?.segment === "PRIVADA") ch = "PRIVADA";
    else if (acc?.segment === "HORECA") ch = "HORECA";
    else if (acc?.segment === "RETAIL") ch = "RETAIL";

    const isDistributor =
      acc?.segment === "DISTRIBUIDOR";
    if (ch && !isDistributor) buckets[ch] += orderTotal(o);
  }

  return buckets;
}

// ============================================================================
// 2) Helpers de similitud + geodist + duplicados
// ============================================================================

const STOPWORDS = new Set([
  'bar','bars','cafeteria','cafetería','restaurante','restaurant',
  'pub','taberna','cerveceria','cervecería','la','el','los','las','de','del'
]);

export function normalizeName(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')                    // solo letras/números/espacios
    .replace(/\s+/g, ' ')                            // espacios únicos
    .trim();
}

export function tokenizeName(s: string) {
  return normalizeName(s)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t));
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

  // Optimización: indexar parties por id (O(1))
  const partyById = new Map(data.parties.map((p) => [p.id, p]));

  for (const acc of data.accounts) {
    const party = partyById.get(acc.partyId);
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
