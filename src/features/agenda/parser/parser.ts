// features/agenda/parser/parser.ts
import { Department, TaskKind } from '@/domain/ssot';
import { DEPT_RULES } from './rules';

const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const RE_TIME = /\b(\d{1,2}):(\d{2})\b/;
const RE_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const RE_TOMORROW = /\b(mañana|tomorrow)\b/i;
const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i;
const RE_PRODUCT = /\b(santa\s*brisa|sb)\b/i;
const RE_POS = /\b(pos|plv|evento|activaci[oó]n)\b/i;

export type ParseResult =
  | { kind:'PEDIDO'; account:string; qtyCases:number; whenISO?:string }
  | { kind:'VISITA'; account:string; whenISO:string }
  | { kind:'POS_PLV'; account:string; description:string; whenISO?:string }
  | { kind:'POS_EVT'; account:string; description:string; whenISO?:string }
  | { kind:'NOTA';    summary:string };

export function inferDepartment(text: string, fallback: Department = 'VENTAS'): Department {
  for (const r of DEPT_RULES) if (r.keywords.test(text)) return r.dept;
  return fallback;
}

function nextDateFrom(text: string) {
  const now = new Date();
  let d = new Date(now);
  const hasDate = RE_DATE.test(text);
  const hasTime = RE_TIME.test(text);

  if (RE_TOMORROW.test(text)) d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);

  const md = text.match(RE_DATE);
  if (md) {
    const day = +md[1], mon = +md[2]-1, year = md[3] ? +md[3] : now.getFullYear();
    d = new Date(year, mon, day);
  }
  if (hasTime) {
    const mt = text.match(RE_TIME)!; d.setHours(+mt[1], +mt[2], 0, 0);
  } else if (!hasDate) {
    // regla: +7 días 10:00 si implica agenda:
    if (RE_TOMORROW.test(text) || RE_POS.test(text) || RE_ACCOUNT.test(text)) {
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+7, 10, 0, 0, 0);
    }
  } else {
    d.setHours(10,0,0,0);
  }
  return d.toISOString();
}

export function parseNoteToAction(text: string): ParseResult {
  const account = (text.match(RE_ACCOUNT)?.[1] || '').trim();
  const qty = text.match(RE_QTY)?.[1];
  const hasProduct = RE_PRODUCT.test(text);
  const whenISO = nextDateFrom(text);

  // prioridad: PEDIDO > VISITA > POS (evt/plv) > NOTA
  if (account && qty && hasProduct) return { kind:'PEDIDO', account, qtyCases: parseInt(qty!,10), whenISO };
  if (account && (RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text))) return { kind:'VISITA', account, whenISO };
  if (account && RE_POS.test(text)) {
    const desc = text.replace(RE_ACCOUNT, '').trim();
    // heurística: si contiene 'evento' → POS_EVT, si 'plv|vasos|cartel' → POS_PLV
    if (/evento/i.test(text)) return { kind:'POS_EVT', account, description: desc || 'Evento' , whenISO };
    return { kind:'POS_PLV', account, description: desc || 'Material PLV', whenISO };
  }
  return { kind:'NOTA', summary: text.trim() };
}
