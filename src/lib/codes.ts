
/**
 * Santa Brisa — Codes Helpers (SKUs, Lotes, Pedidos, PLV)
 * --------------------------------------------------------
 * Reglas resumidas:
 *  - SKU:    [CATEG]-[PRODUCTO]-[PRESENTACION?]         (p.ej. PT-GIN-0700, PT-MARG-0330-6PK, RM-LIME-CONC, PLV-GLASS)
 *  - LOTE:   [YYMMDD]-[SKU]-[NN]                         (p.ej. 250915-PT-GIN-0700-01)
 *  - PEDIDO: ORD-[CANAL]-[YYYYMMDD]-[####]               (p.ej. ORD-SB-20250915-0042)
 *  - PLV:    PLV-[TIPO]-[YYYY]-[####]                    (p.ej. PLV-KIT-2025-0031)
 *
 *  Todo en MAYÚSCULAS, separadores '-'; secuenciales con padding fijo.
 */
import type { AccountType } from '@/domain/ssot';

// =====================================================
// Types
// =====================================================
export type Category = 'PT' | 'RM' | 'PLV';
export type PlvType = 'GLASS' | 'POSTER' | 'KIT' | 'MUESTRA' | 'STAND' | 'ROLLUP' | 'OTRO';

export type SkuParts = { category: Category; product: string; presentation?: string };
export type LotParts = { date: Date; sku: string; seq: number };
export type OrderParts = { channel: AccountType; date: Date; seq: number };
export type PlvParts = { type: PlvType; year: number; seq: number };

// =====================================================
// Utilities
// =====================================================
const pad = (n: number, w: number) => n.toString().padStart(w, '0');
const onlyAscii = (s: string) => s
  .normalize('NFD')
  .replace(/\p{Diacritic}+/gu, '')
  .replace(/[^A-Za-z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');
const upper = (s: string) => onlyAscii(s).toUpperCase();

const toYYMMDD = (d: Date) => `${pad(d.getFullYear() % 100, 2)}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
const toYYYYMMDD = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;

// Generic prefix-based next sequence calculator
export function nextSeq(existing: string[], prefix: string, width = 2): number {
  const re = new RegExp(`^${prefix}(\\d{${width}})$`);
  const max = existing.reduce((m, code) => {
    const mm = code.match(re);
    if (!mm) return m;
    const n = parseInt(mm[1], 10);
    return n > m ? n : m;
  }, 0);
  return max + 1;
}

// =====================================================
// SKU
// =====================================================
export const SKU_RE = /^(PT|RM|PLV)-([A-Z0-9]+)(?:-([A-Z0-9]+))?$/;

export function makeSku({ category, product, presentation }: SkuParts): string {
  const cat = category;
  const prod = upper(product);
  const pres = presentation ? upper(presentation) : undefined;
  return pres ? `${cat}-${prod}-${pres}` : `${cat}-${prod}`;
}

export function parseSku(sku: string): SkuParts | null {
  const m = upper(sku).match(SKU_RE);
  if (!m) return null;
  const [, category, product, presentation] = m;
  return { category: category as Category, product, presentation };
}

export const isValidSku = (sku: string) => SKU_RE.test(upper(sku));

// =====================================================
// Lote
// =====================================================
export const LOT_RE = /^(\d{6})-((?:PT|RM|PLV)-[A-Z0-9-]+)-(\d{2})$/;

export function makeLot({ date, sku, seq }: LotParts): string {
  const d = toYYMMDD(date);
  const s = upper(sku);
  if (!isValidSku(s)) throw new Error(`SKU inválido: ${sku}`);
  return `${d}-${s}-${pad(seq, 2)}`;
}

export function parseLot(code: string): { date: Date; sku: string; seq: number } | null {
  const m = upper(code).match(LOT_RE);
  if (!m) return null;
  const [, yymmdd, sku, seq] = m;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10) - 1;
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  const fullYear = 2000 + yy + (yy < 50 ? 0 : 0); // simple pivot; ajustar si se necesita 1950–2049
  const date = new Date(fullYear, mm, dd);
  return { date, sku, seq: parseInt(seq, 10) };
}

export const isValidLot = (code: string) => LOT_RE.test(upper(code));

export function nextLotSeqForDate(existingLotCodes: string[], date: Date, sku: string): number {
  const prefix = `${toYYMMDD(date)}-${upper(sku)}-`;
  return nextSeq(existingLotCodes, prefix, 2);
}

// =====================================================
// Pedido (Order Code)
// =====================================================
export const ORDER_RE = /^ORD-([A-Z]+)-(\d{8})-(\d{4})$/;

export function makeOrderCode({ channel, date, seq }: OrderParts): string {
  return `ORD-${channel.substring(0,4).toUpperCase()}-${toYYYYMMDD(date)}-${pad(seq, 4)}`;
}

export function parseOrderCode(code: string): { channel: string; date: Date; seq: number } | null {
  const m = upper(code).match(ORDER_RE);
  if (!m) return null;
  const [, channel, yyyymmdd, seq] = m;
  const yyyy = parseInt(yyyymmdd.slice(0, 4), 10);
  const mm = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
  const dd = parseInt(yyyymmdd.slice(6, 8), 10);
  return { channel: channel, date: new Date(yyyy, mm, dd), seq: parseInt(seq, 10) };
}

export const isValidOrderCode = (code: string) => ORDER_RE.test(upper(code));

export function nextOrderSeqForDay(existingOrderCodes: string[], channel: AccountType, date: Date): number {
  const prefix = `ORD-${channel.substring(0,4).toUpperCase()}-${toYYYYMMDD(date)}-`;
  return nextSeq(existingOrderCodes, prefix, 4);
}

// =====================================================
// PLV Codes
// =====================================================
export const PLV_RE = /^PLV-([A-Z0-9]+)-(\d{4})-(\d{4})$/;

export function makePlvCode({ type, year, seq }: PlvParts): string {
  return `PLV-${type}-${year}-${pad(seq, 4)}`;
}

export function parsePlvCode(code: string): { type: PlvType | string; year: number; seq: number } | null {
  const m = upper(code).match(PLV_RE);
  if (!m) return null;
  const [, type, yyyy, seq] = m;
  return { type: type as PlvType, year: parseInt(yyyy, 10), seq: parseInt(seq, 10) };
}

export const isValidPlvCode = (code: string) => PLV_RE.test(upper(code));

export function nextPlvSeqForYear(existingPlvCodes: string[], type: PlvType, year: number): number {
  const prefix = `PLV-${type}-${year}-`;
  return nextSeq(existingPlvCodes, prefix, 4);
}

// =====================================================
// Convenience: Generadores deterministas con listas existentes
// =====================================================
export function generateNextLot(existingLots: string[], date: Date, sku: string) {
  const seq = nextLotSeqForDate(existingLots, date, sku);
  return makeLot({ date, sku, seq });
}

export function generateNextOrder(existingOrders: string[], channel: AccountType, date: Date) {
  const seq = nextOrderSeqForDay(existingOrders, channel, date);
  return makeOrderCode({ channel, date, seq });
}

export function generateNextPlv(existingPlv: string[], type: PlvType, year: number) {
  const seq = nextPlvSeqForYear(existingPlv, type, year);
  return makePlvCode({ type, year, seq });
}

// =====================================================
// Quick self-tests (dev time)
// =====================================================
export function __selfTest() {
  const sku1 = makeSku({ category: 'PT', product: 'gin', presentation: '0700' });
  if (sku1 !== 'PT-GIN-0700') throw new Error('SKU fail');
  if (!isValidSku(sku1) || !parseSku(sku1)) throw new Error('SKU parse fail');

  const lot = makeLot({ date: new Date(2025, 8, 15), sku: sku1, seq: 1 });
  if (lot !== '250915-PT-GIN-0700-01') throw new Error('LOT fail');
  if (!isValidLot(lot) || !parseLot(lot)) throw new Error('LOT parse fail');

  const ord = makeOrderCode({ channel: 'HORECA', date: new Date(2025, 8, 15), seq: 42 });
  if (ord !== 'ORD-HORE-20250915-0042') throw new Error('ORDER fail');
  if (!isValidOrderCode(ord) || !parseOrderCode(ord)) throw new Error('ORDER parse fail');

  const plv = makePlvCode({ type: 'KIT', year: 2025, seq: 31 });
  if (plv !== 'PLV-KIT-2025-0031') throw new Error('PLV fail');
  if (!isValidPlvCode(plv) || !parsePlvCode(plv)) throw new Error('PLV parse fail');

  return true;
}

// =====================================================
// Adaptadores (opcional): helpers para SSOT
// =====================================================
export function suggestSkuForProduct(name: string, category: Category): string {
  // Heurística simple: toma primeras 6 letras del token más informativo
  const tokens = upper(name).split(/[-\s_]+/).filter(Boolean);
  const base = (tokens.find(t => t.length >= 3) || tokens[0] || 'SKU').slice(0, 6);
  return makeSku({ category, product: base });
}

export function ensureSkuPresentation(sku: string, presentation: string): string {
  const p = parseSku(sku);
  if (!p) throw new Error('SKU inválido');
  return makeSku({ category: p.category, product: p.product, presentation });
}

// Pretty-print utilities
export const formatLotHuman = (code: string) => {
  const p = parseLot(code);
  if (!p) return code;
  return `${code} (fecha ${p.date.toISOString().slice(0,10)}, sku ${p.sku}, seq ${p.seq})`;
};

// End of file
