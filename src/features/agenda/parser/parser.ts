// =================================================================
// == Santa Brain v1.0.0
// == Motor de Parseo de Lenguaje Natural para Operaciones
// =================================================================


import { DEPT_RULES } from './rules';
import { SantaData, Department, Account, CommercialFlow } from './ssot';
// -----------------------------------------------------------------
// 1. Expresiones Regulares
// -----------------------------------------------------------------

// Entidades principales
const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i;
const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i;

// Referencias temporales
const RE_TIME = /\b(\d{1,2}):(\d{2})\b/;
const RE_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const RE_TOMORROW = /\b(mañana|tomorrow)\b/i;

// Intenciones y modificadores
const RE_PLACEMENT = /\b(colocaci[oó]n|sell-out|en dep[oó]sito|dejar|puesta)\b/i;
const RE_REJECTION = /\b(no\s*le\s*interesa|no\s*quiere|rechaza|lo\s*descarta|dice\s*que\s*no)\b/i;
const RE_POS = /\b(pos|plv|evento|activaci[oó]n|degustaci[oó]n)\b/i;

// Motivos de rechazo
const REASON_PRICE = /\b(caro|precio|coste)\b/i;
const REASON_FIT = /\b(no\s*encaja|no\s*es\s*para\s*nosotros|otro\s*estilo)\b/i;
const REASON_COMPETITOR = /\b(ya\s*tienen|trabajan\s*con\s*otro)\b/i;

// -----------------------------------------------------------------
// 2. Tipos de Resultado del Parseo
// -----------------------------------------------------------------

export type LeadLostReason = 'PRECIO' | 'PRODUCTO_NO_ENCAJA' | 'COMPETENCIA' | 'SIN_INFORMACION';

export type ParseResult =
  | { kind: 'PEDIDO'; accountId: string; partyId: string; accountName: string; itemId?: string; qtyCases: number; flow: CommercialFlow; whenISO?: string }
  | { kind: 'VISITA'; accountId: string; partyId: string; accountName: string; whenISO: string }
  | { kind: 'POS_EVT'; accountId: string; partyId: string; accountName: string; description: string; whenISO?: string }
  | { kind: 'POS_PLV'; accountId: string; partyId: string; accountName: string; description: string; whenISO?: string }
  | { kind: 'LEAD_LOST'; accountId: string; partyId: string; accountName: string; reason: LeadLostReason; summary: string }
  | { kind: 'NOTA'; summary: string; accountId?: string; partyId?: string; accountName?: string };

// -----------------------------------------------------------------
// 3. Funciones de Soporte
// -----------------------------------------------------------------

/**
 * Infiere el departamento más probable basándose en palabras clave.
 */
export function inferDepartment(text: string, fallback: Department = 'VENTAS'): Department {
  for (const r of DEPT_RULES) {
    if (r.keywords.test(text)) return r.dept;
  }
  return fallback;
}

/**
 * Calcula una fecha a partir del texto si hay una referencia temporal explícita.
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
      const day = +md[1], mon = +md[2] - 1;
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
 * Busca una cuenta en el texto y la valida contra el SSOT para obtener el objeto Account.
 */
function findAccountInText(text: string, data: SantaData): Account | undefined {
  const potentialMatch = text.match(RE_ACCOUNT);
  if (!potentialMatch) return undefined;

  const searchText = potentialMatch[1].trim().toLowerCase();
  
  // Búsqueda por nombre de cuenta, nombre de party, nombre legal o comercial
  for (const account of data.accounts) {
    const party = data.parties.find(p => p.id === account.partyId);
    if (!party) continue;

    const namesToSearch = [
      account.name.toLowerCase(),
      party.name.toLowerCase(),
      party.legalName?.toLowerCase(),
      party.tradeName?.toLowerCase(),
    ].filter(Boolean) as string[];

    if (namesToSearch.some(name => name.includes(searchText))) {
      return account;
    }
  }

  return undefined;
}


// -----------------------------------------------------------------
// 4. Función Principal del Parser: Santa Brain
// -----------------------------------------------------------------

/**
 * Parsea una nota de texto plano y la convierte en una acción de negocio estructurada,
 * validando y enriqueciendo la información con el SSOT (SantaData).
 * @param text El texto de la nota a parsear.
 * @param data El objeto SantaData que contiene el estado actual del negocio (SSOT).
 * @returns Un objeto `ParseResult` con la acción inferida.
 */
export function parseNoteToAction(text: string, data: SantaData): ParseResult {
  const account = findAccountInText(text, data);
  
  // --- PRIORIDAD 1: Intención de Rechazo (Lead Perdido) ---
  if (account && RE_REJECTION.test(text)) {
    let reason: LeadLostReason = 'SIN_INFORMACION';
    if (REASON_PRICE.test(text)) reason = 'PRECIO';
    if (REASON_FIT.test(text)) reason = 'PRODUCTO_NO_ENCAJA';
    if (REASON_COMPETITOR.test(text)) reason = 'COMPETENCIA';
    
    return {
      kind: 'LEAD_LOST',
      accountId: account.id,
      partyId: account.partyId,
      accountName: account.name,
      reason: reason,
      summary: text
    };
  }

  const qtyMatch = text.match(RE_QTY);
  const hasTimeReference = RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text);
  const hasPosKeyword = RE_POS.test(text);

  // --- PRIORIDAD 2: Pedido ---
  if (account && qtyMatch) {
    let flow: CommercialFlow = account.flow || 'DIRECT';
    if (RE_PLACEMENT.test(text)) {
      flow = 'PLACEMENT'; // La intención explícita anula el defecto
    }
    
    // TODO: Implementar búsqueda de producto en `data.items`
    const foundItemId = undefined;

    return {
      kind: 'PEDIDO',
      accountId: account.id,
      partyId: account.partyId,
      accountName: account.name,
      itemId: foundItemId,
      qtyCases: parseInt(qtyMatch[1], 10),
      flow: flow,
      whenISO: nextDateFrom(text)
    };
  }
  
  // --- PRIORIDAD 3: Visita / Agendamiento ---
  if (account && hasTimeReference) {
    return {
      kind: 'VISITA',
      accountId: account.id,
      partyId: account.partyId,
      accountName: account.name,
      whenISO: nextDateFrom(text)!
    };
  }

  // --- PRIORIDAD 4: Evento / Acción de Marketing en Punto de Venta ---
  if (account && hasPosKeyword) {
    const kind = /evento|degustaci[oó]n/.test(text) ? 'POS_EVT' : 'POS_PLV';
    const description = text.replace(RE_ACCOUNT, '').replace(RE_POS, '').trim();

    return {
      kind,
      accountId: account.id,
      partyId: account.partyId,
      accountName: account.name,
      description,
      whenISO: nextDateFrom(text)
    };
  }

  // --- FALLBACK: Nota Simple ---
  return { 
    kind: 'NOTA',
    summary: text.trim(),
    accountId: account?.id,
    partyId: account?.partyId,
    accountName: account?.name
  };
}