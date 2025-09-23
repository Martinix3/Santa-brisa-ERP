import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, PartyDuplicate, Address } from '@/domain/ssot';

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

  const processedNames = contacts.map(c => c.name || 'Sin Nombre').filter(Boolean);

  for (const c of contacts) {
    if (!c.name) continue;

    const contactTaxId = (c.code || '').trim().toUpperCase();
    let existingParty: Party | null = null;
    if (contactTaxId) {
        const querySnapshot = await adminDb.collection('parties').where('taxId', '==', contactTaxId).limit(1).get();
        if (!querySnapshot.empty) {
            existingParty = querySnapshot.docs[0].data() as Party;
        }
    }
    if (!existingParty) {
        const querySnapshot = await adminDb.collection('parties').where('name', '==', c.name.trim()).limit(1).get();
        if (!querySnapshot.empty) {
            existingParty = querySnapshot.docs[0].data() as Party;
        }
    }
      
      const billAddress = c.billAddress;
      const proposedAddresses: Address[] =
        billAddress && (billAddress.address || billAddress.city || billAddress.country) ? [{
          address: billAddress.address ?? '',
          city: billAddress.city ?? '',
          zip: billAddress.postalCode ?? '',
          province: billAddress.province ?? '',
          country: billAddress.country ?? '',
          countryCode: billAddress.countryCode ?? undefined,
        }] : [];
      
      const proposedData: Partial<Party> = {
        name: c.name,
        taxId: c.code || undefined,
        addresses: proposedAddresses as any,
        contacts: c.phone ? [{ type: 'phone', value: c.phone, isPrimary: true, description: 'Principal' }] : [],
        kind: 'ORG',
      };
      
      if (!dryRun) {
        if(existingParty) {
            await adminDb.collection('parties').doc(existingParty.id).set(proposedData, { merge: true });
        } else {
            const newPartyRef = adminDb.collection('parties').doc();
            await newPartyRef.set({ ...proposedData, id: newPartyRef.id, createdAt: Timestamp.now() });
        }
      }
  }

  return { ok: true, count: contacts.length, nextPage: contacts.length === 50 ? page + 1 : null, dryRun, processedNames };
}
