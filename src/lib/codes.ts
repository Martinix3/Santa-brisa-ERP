// src/lib/codes.ts
// === Códigos canónicos Santa Brisa ===================================

export type ISODate = string; // '2025-09-26'
const pad = (n: number, len = 4) => String(n).padStart(len, '0');
const toYYMMDD = (d: Date) =>
  `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
const toYYYYMM = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}`;
const toYYYYMMDD = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;

const UPPER = (s: string) => s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toUpperCase();
const SEG = (s: string) => UPPER(s).replace(/[^A-Z0-9]/g, '').slice(0, 6); // segmento SKU

// ---------------------------------------------------------------------
// 1) SKU  CAT-PROD-PRESENT  (3 × segmentos alfanum de 1–6)
//    Ej: SB-MARG-0700, PT-GIN-0700, TV-VERM-1000
// ---------------------------------------------------------------------
export type SkuParts = { category: string; product: string; presentation: string };

export const SKU_RE = /^[A-Z0-9]{1,6}-[A-Z0-9]{1,6}-[A-Z0-9]{1,6}$/;

export function makeSku(p: SkuParts): string {
  return `${SEG(p.category)}-${SEG(p.product)}-${SEG(p.presentation)}`;
}
export function parseSku(sku: string): SkuParts | null {
  if (!SKU_RE.test(UPPER(sku))) return null;
  const [category, product, presentation] = UPPER(sku).split('-');
  return { category, product, presentation };
}
export const isValidSku = (sku: string) => SKU_RE.test(UPPER(sku));

// Helpers de presentación (p.ej. asegurar 0700)
export function ensureSkuPresentation(sku: string, presentation: string): string {
  const p = parseSku(sku); if (!p) throw new Error(`SKU inválido: ${sku}`);
  return makeSku({ ...p, presentation: SEG(presentation) });
}

// ---------------------------------------------------------------------
// 2) LOTE  YYMMDD-SKU-####  (fecha compacta + SKU + secuencia diaria)
//    Ej: 250926-SB-MARG-0700-0001
// ---------------------------------------------------------------------
export type LotParts = { date: Date; sku: string; seq: number };

export function makeLot({ date, sku, seq }: LotParts): string {
  if (!isValidSku(sku)) throw new Error(`SKU inválido: ${sku}`);
  return `${toYYMMDD(date)}-${UPPER(sku)}-${pad(seq, 4)}`;
}

// FIX: La regex anterior era demasiado específica. Esta usa el SKU_RE para ser flexible.
export const LOT_RE =
  new RegExp(`^([0-9]{6})-(${SKU_RE.source.slice(1, -1)})-([0-9]{4})$`);

export function parseLot(code: string): { date: Date; sku: string; seq: number } | null {
  const m = UPPER(code).match(LOT_RE);
  if (!m) return null;
  const [, yymmdd, sku, seq] = m;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10) - 1;
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  const year = 2000 + yy;
  return { date: new Date(year, mm, dd), sku: UPPER(sku), seq: parseInt(seq, 10) };
}
export const isValidLot = (code: string) => LOT_RE.test(UPPER(code));

export function nextLotSeqForDate(existingLotCodes: string[], date: Date, sku: string): number {
  const prefix = `${toYYMMDD(date)}-${UPPER(sku)}-`;
  const seqs = existingLotCodes
    .filter(code => code.startsWith(prefix))
    .map(code => parseInt(code.slice(-4), 10))
    .filter(n => Number.isFinite(n));
  return (seqs.length ? Math.max(...seqs) : 0) + 1;
}

// ---------------------------------------------------------------------
// 3) Documentos numéricos con prefijo + fecha + secuencia
//    SO (Sell-Out Order), PO (Production Order), SH (Shipment),
//    DN (Delivery Note), GR (Goods Receipt)
// ---------------------------------------------------------------------
type SeqCtx = { prefix: string; date: Date; width?: number; granularity?: 'YYYYMM'|'YYYYMMDD' };
const fmt = (g: 'YYYYMM'|'YYYYMMDD', d: Date) => g === 'YYYYMM' ? toYYYYMM(d) : toYYYYMMDD(d);

export function makeCode({ prefix, date, seq, width = 4, granularity = 'YYYYMM' }:
  { prefix: string; date: Date; seq: number; width?: number; granularity?: 'YYYYMM'|'YYYYMMDD' }) {
  return `${prefix}-${fmt(granularity, date)}-${pad(seq, width)}`;
}
export function codeRe(prefix: string, granularity: 'YYYYMM'|'YYYYMMDD' = 'YYYYMM', width = 4) {
  const datePart = granularity === 'YYYYMM' ? `[0-9]{6}` : `[0-9]{8}`;
  return new RegExp(`^${prefix}-${datePart}-[0-9]{${width}}$`);
}

// Esquemas predefinidos
export const POLICIES = {
  SO: { prefix: 'SO', granularity: 'YYYYMM' as const, width: 4, re: codeRe('SO', 'YYYYMM', 4) },
  PO: { prefix: 'PO', granularity: 'YYYYMM' as const, width: 4, re: codeRe('PO', 'YYYYMM', 4) },
  SH: { prefix: 'SH', granularity: 'YYYYMMDD' as const, width: 4, re: codeRe('SH', 'YYYYMMDD', 4) },
  DN: { prefix: 'DN', granularity: 'YYYYMMDD' as const, width: 4, re: codeRe('DN', 'YYYYMMDD', 4) },
  GR: { prefix: 'GR', granularity: 'YYYYMMDD' as const, width: 4, re: codeRe('GR', 'YYYYMMDD', 4) },
  LOT: { regex: LOT_RE },
  PRODUCT: { regex: SKU_RE },
  ACCOUNT: { regex: /.*/ },
  PARTY: { regex: /.*/ },
  SUPPLIER: { regex: /.*/ },
  LOCATION: { regex: /.*/ },
  PRICE_LIST: { regex: /.*/ },
  PROMOTION: { regex: /.*/ },
};

// Parsers genéricos
export function parseDatedCode(code: string, policy = POLICIES.SO):
  { prefix: string; period: string; seq: number } | null {
  const re = policy.re; if (!re.test(code)) return null;
  const [, period, seq] = code.split('-');
  return { prefix: policy.prefix, period, seq: parseInt(seq, 10) };
}
export const isValidCode = (code: string, policy = POLICIES.SO) => policy.re.test(code);

// Secuenciador (en memoria, DB vacía). Cambiable a Firestore counters.
export function nextSeq(existingCodes: string[], ctx: SeqCtx): number {
  const period = fmt(ctx.granularity ?? 'YYYYMM', ctx.date);
  const prefix = `${ctx.prefix}-${period}-`;
  const seqs = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.slice(- (ctx.width ?? 4)), 10))
    .filter(Number.isFinite);
  return (seqs.length ? Math.max(...seqs) : 0) + 1;
}

// Azúcares para cada documento
export function makeSellOutOrderCode(existing: string[], date = new Date()) {
  const seq = nextSeq(existing, { prefix: 'SO', date, granularity: 'YYYYMM', width: 4 });
  return makeCode({ prefix: 'SO', date, seq, granularity: 'YYYYMM', width: 4 });
}
export function makeProdOrderCode(existing: string[], date = new Date()) {
  const seq = nextSeq(existing, { prefix: 'PO', date, granularity: 'YYYYMM', width: 4 });
  return makeCode({ prefix: 'PO', date, seq, granularity: 'YYYYMM', width: 4 });
}
export function makeShipmentCode(existing: string[], date = new Date()) {
  const seq = nextSeq(existing, { prefix: 'SH', date, granularity: 'YYYYMMDD', width: 4 });
  return makeCode({ prefix: 'SH', date, seq, granularity: 'YYYYMMDD', width: 4 });
}
export function makeDeliveryNoteCode(existing: string[], date = new Date()) {
  const seq = nextSeq(existing, { prefix: 'DN', date, granularity: 'YYYYMMDD', width: 4 });
  return makeCode({ prefix: 'DN', date, seq, granularity: 'YYYYMMDD', width: 4 });
}
export function makeGoodsReceiptCode(existing: string[], date = new Date()) {
  const seq = nextSeq(existing, { prefix: 'GR', date, granularity: 'YYYYMMDD', width: 4 });
  return makeCode({ prefix: 'GR', date, seq, granularity: 'YYYYMMDD', width: 4 });
}
export function generateNextOrder(existing: string[], channel: string, date: Date) {
    return makeSellOutOrderCode(existing, date);
}
