// src/features/santabrain/lib/rules.ts
import { normalizeName, findSimilarAccounts } from "./helpers";
import type { SantaData, Account } from "@/domain/ssot";
import type { ParseResult, Promotion, ISO, Order, PromoChannel } from "./types";


// Regex base
const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i;
const RE_TIME = /\b(\d{1,2}):(\d{2})\b/;
const RE_DATE = /\b(\d{1,2})\/(\d{2,4})(?:\/(\d{2,4}))?\b/;
const RE_TOMORROW = /\b(mañana|tomorrow)\b/i;
const RE_PLACEMENT = /\b(colocaci[oó]n|sell-out|en dep[oó]sito|dejar|puesta)\b/i;
const RE_REJECTION = /\b(no\s*le\s*interesa|no\s*quiere|rechaza|lo\s*descarta|dice\s*que\s*no)\b/i;
const RE_POS = /\b(pos|plv|evento|activaci[oó]n|degustaci[oó]n)\b/i;
const REASON_PRICE = /\b(caro|precio|coste)\b/i;
const REASON_FIT = /\b(no\s*encaja|no\s*es\s*para\s*nosotros|otro\s*estilo)\b/i;
const REASON_COMPETITOR = /\b(ya\s*tienen|trabajan\s*con\s*otro)\b/i;

// --- Helpers de Parseo ---
const findAccountInText = (text: string, data: SantaData): Account | null => {
  const m = text.match(RE_ACCOUNT);
  if (!m) return null;
  const needle = normalizeName(m[1]);
  let best: { acc: Account; score: number } | null = null;

  for (const a of data.accounts) {
    const norm = normalizeName(a.name);
    // scoring simple: exact > startsWith > includes
    let score = 0;
    if (norm === needle) score = 3;
    else if (norm.startsWith(needle)) score = 2;
    else if (norm.includes(needle)) score = 1;

    if (score && (!best || score > best.score)) best = { acc: a, score };
    if (score === 3) break; // corto por lo sano si es exacto
  }
  return best?.acc ?? null;
};

const nextDateFrom = (text: string): string | undefined => {
  const now = new Date();

  // 1) ¿"mañana"?
  const hasTomorrow = RE_TOMORROW.test(text);

  // 2) ¿fecha explícita dd/mm(/yy)?
  const dm = text.match(RE_DATE);
  if (dm) {
    const [, dd, mm, yyyy] = dm;
    const y = yyyy ? (yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy)) : now.getFullYear();
    const d = new Date(y, Number(mm) - 1, Number(dd));
    // ¿hay hora?
    const tm = text.match(RE_TIME);
    if (tm) {
      const [, hh, mi] = tm;
      d.setHours(Number(hh), Number(mi), 0, 0);
    }
    return d.toISOString();
  }

  // 3) ¿solo hora?
  const tm = text.match(RE_TIME);
  if (tm) {
    const [, hh, mi] = tm;
    const d = new Date(now);
    d.setHours(Number(hh), Number(mi), 0, 0);
    if (hasTomorrow || d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString();
  }

  // 4) "mañana" sin hora → mañana a 10:00 por defecto (elige tu hora default)
  if (hasTomorrow) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  }

  return undefined;
};


// --- Motor de Reglas ---
export interface ActionRule {
  name: string;
  priority: number;
  condition: (text: string, data: SantaData) => boolean;
  execute: (text: string, data: SantaData) => ParseResult;
}

export const RULES: ActionRule[] = [
  // 1) Lead Perdido -> mapear a EVENTO_MKT (legacy)
  {
    name: 'LEAD_LOST',
    priority: 100,
    condition: (text, data) => !!findAccountInText(text, data) && RE_REJECTION.test(text),
    execute: (text, data) => {
      const account = findAccountInText(text, data)!;
      let reason: 'PRECIO'|'PRODUCTO_NO_ENCAJA'|'COMPETENCIA'|'SIN_INFORMACION' = 'SIN_INFORMACION';
      if (REASON_PRICE.test(text)) reason = 'PRECIO';
      else if (REASON_FIT.test(text)) reason = 'PRODUCTO_NO_ENCAJA';
      else if (REASON_COMPETITOR.test(text)) reason = 'COMPETENCIA';

      return {
        kind: 'EVENTO_MKT',
        subKind: 'LEAD_LOST',
        reason: reason,
        accountId: account.id,
        description: text,
        when: nextDateFrom(text) // opcional
      };
    }
  },

  // 2) Pedido
  {
    name: 'ORDER',
    priority: 90,
    condition: (text, data) => !!findAccountInText(text, data) && RE_QTY.test(text),
    execute: (text, data) => {
      const account = findAccountInText(text, data);
      const qty = parseInt(text.match(RE_QTY)![1], 10);
      return {
        kind: 'PEDIDO',
        accountId: account?.id,
        accountName: account?.name || text.match(RE_ACCOUNT)![1].trim(),
        isNewAccount: !account,
        qtyCases: qty,
        itemId: undefined,
        summary: text
      };
    }
  },

  // 3) Visita
  {
    name: 'VISIT',
    priority: 80,
    condition: (text, data) => !!findAccountInText(text, data) && (RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text)),
    execute: (text, data) => {
      const account = findAccountInText(text, data)!;
      return {
        kind: 'VISITA',
        accountId: account.id,
        when: nextDateFrom(text) ?? new Date().toISOString(),
        summary: text
      };
    }
  },

  // 4) POS / Evento Marketing -> EVENTO_MKT (legacy)
  {
    name: 'POS_EVT/PLV',
    priority: 70,
    condition: (text, data) => !!findAccountInText(text, data) && RE_POS.test(text),
    execute: (text, data) => {
      const account = findAccountInText(text, data)!;
      const description = text.replace(RE_ACCOUNT, '').replace(RE_POS, '').trim();
      return {
        kind: 'EVENTO_MKT',
        subKind: 'POS_ACTIVITY',
        accountId: account.id,
        description,
        when: nextDateFrom(text)
      };
    }
  },

  // 5) Fallback -> UNKNOWN
  {
    name: 'FALLBACK_UNKNOWN',
    priority: 0,
    condition: () => true,
    execute: (text) => ({ kind: 'UNKNOWN', summary: text.trim() })
  }
];


// --- Adaptador compatible con engine.ts ---

export function isPromotionApplicable(order: Order, promo: Promotion, nowISO?: ISO): boolean {
  const now = nowISO ? new Date(nowISO) : new Date();

  // vent. temporal
  if (promo.validFrom && now < new Date(promo.validFrom)) return false;
  if (promo.validTo && now > new Date(promo.validTo)) return false;

  // qty en scope
  const qtyInScope = (order.lines || []).reduce((acc: number, l: { sku?: string; qty: number; itemId: string }) => {
    const inScope = !promo.skuScope || promo.skuScope.includes(l.itemId);
    return acc + (inScope ? (l.qty ?? 0) : 0);
  }, 0);
  if (promo.minQty && qtyInScope < promo.minQty) return false;

  // canal (si lo tienes en el pedido)
  const channel = (order as any).channel as PromoChannel | undefined;
  if (promo.channels?.length && channel && !promo.channels.includes(channel)) return false;

  return true;
}

// Renombra tu función actual para reutilizarla arriba
export function isPromotionApplicableCtx(promo: Promotion, ctx: {
  nowISO?: string;
  channel?: PromoChannel;
  orderQty?: number;
}) {
  const now = ctx.nowISO ? new Date(ctx.nowISO) : new Date();
  if (promo.validFrom && now < new Date(promo.validFrom)) return false;
  if (promo.validTo && now > new Date(promo.validTo)) return false;
  if (promo.minQty && (ctx.orderQty ?? 0) < promo.minQty) return false;
  if (promo.channels?.length && ctx.channel && !promo.channels.includes(ctx.channel)) return false;
  return true;
}
