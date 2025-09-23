import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';

type HoldedContact = {
  id: string;
  name?: string;
  tradeName?: string;
  code?: string; // vatnumber in some API versions, code in others
  vatnumber?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  type?: 'client'|'supplier'|'lead'|string;
  billAddress?: { address?: string; city?: string; postalCode?: string; province?: string; country?: string; countryCode?: string; };
  shippingAddresses?: Array<{ address?: string; city?: string; postalCode?: string; province?: string; country?: string; countryCode?: string; }>;
  createdAt?: number;
  updatedAt?: number;
};

function toRole(t?: string): Array<'CUSTOMER'|'SUPPLIER'|'OTHER'> {
  const v = (t||'').toLowerCase();
  if (v === 'client') return ['CUSTOMER'];
  if (v === 'supplier') return ['SUPPLIER'];
  return ['OTHER'];
}

export async function handleSyncHoldedContacts({ page = 1, dryRun = false }: { page?: number; dryRun?: boolean }) {
  // GET contacts (paginado). Ajusta 'limit' si tu tenant permite otros tamaños.
  const contacts: HoldedContact[] = await callHoldedApi(`/invoicing/v1/contacts?limit=200&page=${page}`, 'GET') as HoldedContact[];

  for (const c of contacts) {
    // 1) buscar party por holdedContactId
    const q = await adminDb.collection('parties').where('external.holdedContactId', '==', c.id).limit(1).get();
    const ref = q.empty ? adminDb.collection('parties').doc() : q.docs[0].ref;
    const current = q.empty ? {} as any : q.docs[0].data();

    // 2) roles (merge)
    const roles = new Set<string>(current.roles || []);
    toRole(c.type).forEach(r => roles.add(r));

    // 3) direcciones
    const billing = c.billAddress || {};
    const ship = (c.shippingAddresses && c.shippingAddresses[0]) || undefined;

    const partyData = {
      legalName: c.name || c.tradeName || current.legalName || 'Contacto Holded',
      tradeName: c.tradeName || current.tradeName || undefined,
      vat: c.vatnumber || c.code || current.vat || undefined,
      emails: c.email ? Array.from(new Set([...(current.emails||[]), c.email])) : (current.emails||[]),
      phones: Array.from(new Set([...(current.phones||[]), ...(c.mobile?[c.mobile]:[]), ...(c.phone?[c.phone]:[])])),
      billingAddress: {
        address: billing.address, city: billing.city, zip: billing.postalCode,
        province: billing.province, country: billing.country, countryCode: billing.countryCode
      },
      shippingAddress: ship ? {
        address: ship.address, city: ship.city, zip: ship.postalCode,
        province: ship.province, country: ship.country, countryCode: ship.countryCode
      } : current.shippingAddress,
      roles: Array.from(roles),
      external: { ...(current.external||{}), holdedContactId: c.id },
      updatedAt: Timestamp.now(),
      ...(q.empty ? { createdAt: Timestamp.now() } : {})
    };

    if (!dryRun) {
      await ref.set(partyData, { merge: true });
    }
  }

  return { ok: true, count: contacts.length, nextPage: contacts.length === 200 ? page + 1 : null };
}
