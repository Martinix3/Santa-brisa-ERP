import { holdedFetch } from './client';
import type { Party } from '@/domain/ssot';
import { toHoldedPayload } from './serializeContact';

export async function ensureHoldedContact(p: Party): Promise<{ id: string }> {
  if (p.external?.holdedContactId) return { id: p.external.holdedContactId };
  const payload = toHoldedPayload(p);
  // 1) Intento buscar por VAT/email/phone si tuvieras endpoints de búsqueda.
  // 2) Si no, creo directamente:
  const res = await holdedFetch('/contacts', { method: 'POST', body: JSON.stringify(payload) });
  const data = await res.json();
  return { id: data.id };
}

export async function updateHoldedContact(p: Party): Promise<void> {
  if (!p.external?.holdedContactId) return;
  const payload = toHoldedPayload(p);
  await holdedFetch(`/contacts/${p.external.holdedContactId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
