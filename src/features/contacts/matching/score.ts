import type { Party } from '@/domain/ssot';
import { normEmail } from '@/lib/norm/email';
import { normPhone } from '@/lib/norm/phone';
import { normVat, isLikelyVat } from '@/lib/norm/cif';
import { sim } from './similarity';

export type Candidate = Pick<Party, 'id'|'legalName'|'tradeName'|'vat'|'emails'|'phones'| 'billingAddress'|'shippingAddress'>;

export function scorePartyMatch(incoming: Partial<Candidate>, existing: Candidate): number {
  let score = 0;
  // VAT fuerte
  if (incoming.vat && existing.vat && normVat(incoming.vat) === normVat(existing.vat)) score += 100;

  // Phone
  const inPhones = (incoming.phones ?? []).map(p => normPhone(p.value));
  const exPhones = (existing.phones ?? []).map(p => normPhone(p.value));
  if (inPhones.length && exPhones.some(p => inPhones.includes(p))) score += 70;

  // Email
  const inEmails = (incoming.emails ?? []).map(e => normEmail(e.value));
  const exEmails = (existing.emails ?? []).map(e => normEmail(e.value));
  if (inEmails.length && exEmails.some(e => inEmails.includes(e))) score += 70;

  // Nombre legal + ciudad
  const cityIn = incoming.billingAddress?.city ?? incoming.shippingAddress?.city;
  const cityEx = existing.billingAddress?.city ?? existing.shippingAddress?.city;
  const nameSim = Math.max(sim(incoming.legalName, existing.legalName), sim(incoming.tradeName, existing.tradeName));
  if (nameSim >= 0.9 && cityIn && cityEx && cityIn.toLowerCase() === cityEx.toLowerCase()) score += 50;

  // Comercial parecido
  if (sim(incoming.tradeName, existing.tradeName) >= 0.9) score += 35;

  // Bonus si incoming trae VAT bien formado pero distinto (posible cambio): no sumar, sino forzar revisión
  if (incoming.vat && isLikelyVat(incoming.vat) && existing.vat && normVat(incoming.vat) !== normVat(existing.vat)) score = Math.min(score, 59);

  return score;
}

export const SCORE_AUTO = 80;
export const SCORE_SUGGEST = 60;
