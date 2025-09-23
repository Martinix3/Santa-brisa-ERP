import { db } from '@/lib/firebase/admin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import type { Party } from '@/domain/ssot';

type Opts = { since?: string };

export async function pullHoldedContacts({ since }: Opts = {}) {
  let page = 1, total = 0;
  while (true) {
    const url = since
      ? `/invoicing/v1/contacts?limit=200&page=${page}&updatedFrom=${encodeURIComponent(since)}`
      : `/invoicing/v1/contacts?limit=200&page=${page}`;

    const res = await callHoldedApi(url, 'GET') as any;
    const items: any[] = Array.isArray(res?.data ?? res) ? (res.data || res) : [];
    if (!items.length) break;

    const batch = db.batch();
    for (const c of items) {
      const id = c.id || c._id || c.contactId;
      const partyId = `HOL-${id}`;
      batch.set(db.collection('parties').doc(partyId), {
        id: partyId,
        legalName: c.name || c.legalName || '',
        tradeName: c.tradeName || c.commercialName || undefined,
        vat: c.vat || c.taxId || undefined,
        emails: c.email ? [{ value: c.email, isPrimary: true }] : [],
        phones: c.phone ? [{ value: c.phone, isPrimary: true }] : [],
        billingAddress: {
          address: c.billAddress?.street || '',
          city: c.billAddress?.city || '',
          zip: c.billAddress?.postalCode || '',
          country: c.billAddress?.country || 'España',
        },
        roles: c.type === 'provider' ? ['SUPPLIER'] : ['CUSTOMER'],
        external: { holdedContactId: String(id) },
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    total += items.length;
    page++;
  }
  return { ok: true, imported: total };
}
