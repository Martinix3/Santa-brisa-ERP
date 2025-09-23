import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, PartyDuplicate } from '@/domain/ssot';

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

// --- Normalization Helpers ---
const normalizeVat = (vat?: string) => (vat || '').replace(/[\s-]/g, '').toUpperCase();
const normalizeEmail = (email?: string) => (email || '').trim().toLowerCase();
const normalizePhone = (phone?: string) => {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('34') && digits.length === 11) return `+${digits}`;
    if (digits.length === 9) return `+34${digits}`;
    return phone; // Fallback
};

function toRole(t?: string): Array<'CUSTOMER'|'SUPPLIER'|'OTHER'> {
  const v = (t||'').toLowerCase();
  if (v === 'client') return ['CUSTOMER'];
  if (v === 'supplier') return ['SUPPLIER'];
  return ['OTHER'];
}

async function recordDuplicate(primaryPartyId: string, duplicatePartyId: string, reason: PartyDuplicate['reason'], score: number) {
    const id = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await adminDb.collection('partyDuplicates').doc(id).set({
        id,
        primaryPartyId,
        duplicatePartyId,
        reason,
        score,
        status: 'OPEN',
        createdAt: Timestamp.now(),
    });
}

export async function handleSyncHoldedContacts({ page = 1, dryRun = false }: { page?: number; dryRun?: boolean }) {
  const contacts: HoldedContact[] = await callHoldedApi(`/invoicing/v1/contacts?limit=50&page=${page}`, 'GET') as HoldedContact[];

  for (const c of contacts) {
    // --- Match ---
    let existingParty: Party | null = null;
    let existingRef: FirebaseFirestore.DocumentReference | null = null;

    // 1. By externalId
    const byExtId = await adminDb.collection('parties').where('external.holdedContactId', '==', c.id).limit(1).get();
    if (!byExtId.empty) {
        existingParty = byExtId.docs[0].data() as Party;
        existingRef = byExtId.docs[0].ref;
    }
    
    // 2. By VAT
    const normVat = normalizeVat(c.code || c.vatnumber);
    if (!existingParty && normVat) {
        const byVat = await adminDb.collection('parties').where('vat', '==', normVat).limit(1).get();
        if (!byVat.empty) {
            existingParty = byVat.docs[0].data() as Party;
            existingRef = byVat.docs[0].ref;
        }
    }

    // 3. By Email (if no VAT)
    const normEmail = normalizeEmail(c.email);
    if (!existingParty && normEmail) {
        const byEmail = await adminDb.collection('parties').where('emails', 'array-contains', normEmail).get();
        if (byEmail.size === 1) {
            existingParty = byEmail.docs[0].data() as Party;
            existingRef = byEmail.docs[0].ref;
        } else if (byEmail.size > 1 && !dryRun) {
            await recordDuplicate(byEmail.docs[0].id, byEmail.docs[1].id, 'SAME_EMAIL', 0.9);
        }
    }

    // --- Upsert ---
    const ref = existingRef || adminDb.collection('parties').doc();
    const current = existingParty || {} as Partial<Party>;

    const roles = new Set<any>([...(current.roles || []), ...toRole(c.type)]);
    const emails = new Set<string>([...(current.emails || []), ...(normEmail ? [normEmail] : [])]);
    const phones = new Set<string>([...(current.phones || []), ...(normalizePhone(c.phone) ? [normalizePhone(c.phone)!] : []), ...(normalizePhone(c.mobile) ? [normalizePhone(c.mobile)!] : [])]);

    const billing = c.billAddress || {};
    
    const partyData = {
      legalName: c.name || c.tradeName || current.legalName || 'Contacto Holded',
      tradeName: c.tradeName || current.tradeName || undefined,
      vat: normVat || current.vat || undefined,
      emails: Array.from(emails),
      phones: Array.from(phones),
      billingAddress: {
        address: billing.address, city: billing.city, zip: billing.postalCode,
        province: billing.province, country: billing.country, countryCode: billing.countryCode
      },
      roles: Array.from(roles),
      external: { ...(current.external||{}), holdedContactId: c.id },
      updatedAt: Timestamp.now(),
      ...(!existingParty ? { createdAt: Timestamp.now(), name: c.name, kind: 'ORG', contacts: [], addresses: [], partyId: ref.id } : {})
    };

    if (!dryRun) {
      await ref.set(partyData, { merge: true });
    }
  }

  return { ok: true, count: contacts.length, nextPage: contacts.length === 50 ? page + 1 : null, dryRun };
}
