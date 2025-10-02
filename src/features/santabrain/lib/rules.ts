import type { SantaData, Account, CommercialFlow } from '@/domain/ssot';
import type { ParseResult } from './types';

// Regex base
const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i;
const RE_TIME = /\b(\d{1,2}):(\d{2})\b/;
const RE_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
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
  const name = m[1].trim().toLowerCase();
  // Busca por nombre exacto o parcial
  return data.accounts.find(a => a.name.toLowerCase().includes(name)) || null;
};

const nextDateFrom = (text: string): string | undefined => {
  const tomorrow = text.match(RE_TOMORROW);
  if (tomorrow) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  const dateMatch = text.match(RE_DATE);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const y = year ? (year.length === 2 ? 2000 + Number(year) : Number(year)) : new Date().getFullYear();
    const d = new Date(y, Number(month) - 1, Number(day));
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
      // ParseResult legacy: usar EVENTO_MKT y trasladar el motivo a description
      return {
        kind: 'EVENTO_MKT',
        accountId: account.id,
        description: `LEAD_LOST:${reason}`,
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
      const account = findAccountInText(text, data)!;
      const qty = parseInt(text.match(RE_QTY)![1], 10);
      // ParseResult legacy exige isNewAccount y summary
      return {
        kind: 'PEDIDO',
        accountId: account.id,
        accountName: account.name,
        isNewAccount: false,
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
