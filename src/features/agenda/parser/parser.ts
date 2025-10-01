// features/agenda/parser/parser.ts

// NOTA: Asegúrate de que las rutas y los tipos sean correctos para tu proyecto.
import { Department } from '@/domain/ssot';
import { DEPT_RULES } from './rules';

// --- Expresiones Regulares para la extracción de entidades ---
const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const RE_TIME = /\b(\d{1,2}):(\d{2})\b/;
const RE_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const RE_TOMORROW = /\b(mañana|tomorrow)\b/i;
const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i;
const RE_PRODUCT = /\b(santa\s*brisa|sb)\b/i;
const RE_POS = /\b(pos|plv|evento|activaci[oó]n)\b/i;

// --- Tipos de resultado del parseo ---
export type ParseResult =
  | { kind: 'PEDIDO'; account: string; qtyCases: number; whenISO?: string }
  | { kind: 'VISITA'; account: string; whenISO: string }
  | { kind: 'POS_PLV'; account: string; description: string; whenISO?: string }
  | { kind: 'POS_EVT'; account: string; description: string; whenISO?: string }
  | { kind: 'NOTA'; summary: string };

/**
 * Infiere el departamento más probable basándose en palabras clave en el texto.
 * Utiliza las reglas definidas en `rules.ts`.
 * @param text El texto de entrada.
 * @param fallback Departamento por defecto si no se encuentra ninguna coincidencia.
 * @returns El `Department` inferido.
 */
export function inferDepartment(text: string, fallback: Department = 'VENTAS'): Department {
  for (const r of DEPT_RULES) {
    if (r.keywords.test(text)) return r.dept;
  }
  return fallback;
}

/**
 * Calcula una fecha a partir del texto, pero solo si hay una referencia temporal explícita.
 * Si no hay ninguna, devuelve `undefined`.
 * @param text El texto de entrada.
 * @returns La fecha en formato ISO string, o undefined.
 */
function nextDateFrom(text: string): string | undefined {
  const now = new Date();
  
  const hasExplicitDate = RE_DATE.test(text);
  const hasExplicitTime = RE_TIME.test(text);
  const hasTomorrow = RE_TOMORROW.test(text);

  if (!hasExplicitDate && !hasExplicitTime && !hasTomorrow) {
    return undefined;
  }

  let d = new Date(now);

  if (hasTomorrow) {
    d.setDate(d.getDate() + 1);
  }

  if (hasExplicitDate) {
    const md = text.match(RE_DATE)!;
    const day = +md[1];
    const mon = +md[2] - 1;
    const yearStr = md[3];
    const year = yearStr ? (yearStr.length === 2 ? 2000 + +yearStr : +yearStr) : now.getFullYear();
    d.setFullYear(year, mon, day);
  }

  if (hasExplicitTime) {
    const mt = text.match(RE_TIME)!;
    d.setHours(+mt[1], +mt[2], 0, 0);
  } else {
    d.setHours(10, 0, 0, 0);
  }
  
  return d.toISOString();
}

/**
 * Parsea una nota de texto plano y la convierte en una acción estructurada.
 * Sigue una lógica de prioridades: PEDIDO > VISITA > POS > NOTA.
 * @param text El texto de la nota a parsear.
 * @returns Un objeto `ParseResult` con la acción inferida.
 */
export function parseNoteToAction(text: string): ParseResult {
  const accountMatch = text.match(RE_ACCOUNT);
  const account = accountMatch?.[1].trim() ?? '';
  
  const qtyMatch = text.match(RE_QTY);
  const qty = qtyMatch?.[1];

  const hasProduct = RE_PRODUCT.test(text);
  const hasPosKeyword = RE_POS.test(text);
  const hasTimeReference = RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text);

  if (account && qty && hasProduct) {
    return {
      kind: 'PEDIDO',
      account,
      qtyCases: parseInt(qty, 10),
      whenISO: nextDateFrom(text),
    };
  }

  if (account && hasTimeReference) {
    return {
      kind: 'VISITA',
      account,
      whenISO: nextDateFrom(text)!,
    };
  }

  if (account && hasPosKeyword) {
    const description = text
      .replace(RE_ACCOUNT, '')
      .replace(RE_POS, '')
      .replace(RE_DATE, '')
      .replace(RE_TIME, '')
      .replace(RE_TOMORROW, '')
      .replace(/\s\s+/g, ' ')
      .trim() || 'Gestionar material PLV/evento';

    const kind = /evento/i.test(text) ? 'POS_EVT' : 'POS_PLV';
    
    return {
      kind,
      account,
      description,
      whenISO: nextDateFrom(text),
    };
  }
  
  return { kind: 'NOTA', summary: text.trim() };
}