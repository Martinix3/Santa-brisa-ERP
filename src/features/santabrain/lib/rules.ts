// src/features/santabrain/lib/rules.ts
import type { SantaData, Account, CommercialFlow } from '@/domain/ssot';
import type { ParseResult } from './types';

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

function nextDateFrom(text: string): string | undefined {
  const now = new Date();
  const hasDate = RE_DATE.test(text);
  const hasTime = RE_TIME.test(text);
  const tomorrow = RE_TOMORROW.test(text);
  if (!hasDate && !hasTime && !tomorrow) return undefined;
  const d = new Date(now);
  if (tomorrow) d.setDate(d.getDate() + 1);
  if (hasDate) {
    const md = text.match(RE_DATE)!;
    const day = +md[1], mon = +md[2] - 1;
    const yearStr = md[3];
    const year = yearStr ? (yearStr.length === 2 ? 2000 + +yearStr : +yearStr) : now.getFullYear();
    d.setFullYear(year, mon, day);
  }
  if (hasTime) {
    const mt = text.match(RE_TIME)!;
    d.setHours(+mt[1], +mt[2], 0, 0);
  } else {
    d.setHours(10, 0, 0, 0);
  }
  return d.toISOString();
}

function findAccountInText(text: string, data: SantaData): Account | undefined {
  const m = text.match(RE_ACCOUNT);
  if (!m) return;
  const search = m[1].trim().toLowerCase();
  for (const account of data.accounts) {
    const party = data.parties.find(p => p.id === account.partyId);
    if (!party) continue;
    const names = [account.name, party.name, party.legalName, party.tradeName]
      .filter(Boolean).map(s => s!.toLowerCase());
    if (names.some(n => n.includes(search))) return account;
  }
  return;
}

export interface ActionRule {
  name: string;
  priority: number;
  condition: (text: string, data: SantaData) => boolean;
  execute: (text: string, data: SantaData) => ParseResult;
}

export const RULES: ActionRule[] = [
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

      // EVENTO_MKT compatible con ParseResult legacy
      return {
        kind: 'EVENTO_MKT',
        accountId: account.id,
        description: `LEAD_LOST:${reason}`,
        when: nextDateFrom(text) // opcional
      };
    }
  },
  {
    name: 'ORDER',
    priority: 90,
    condition: (text, data) => !!findAccountInText(text, data) && RE_QTY.test(text),
    execute: (text, data) => {
      const account = findAccountInText(text, data)!;
      let flow: CommercialFlow = account.flow || 'DIRECT';
      if (RE_PLACEMENT.test(text)) flow = 'PLACEMENT';

      const qty = parseInt(text.match(RE_QTY)![1], 10);

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
        when: nextDateFrom(text) // opcional
      };
    }
  },
  {
    name: 'FALLBACK_UNKNOWN',
    priority: 0,
    condition: () => true,
    execute: (text) => ({ kind: 'UNKNOWN', summary: text.trim() })
  }
];
