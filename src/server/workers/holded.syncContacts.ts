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

  // --- INICIO DE LA MODIFICACIÓN ---
  // Capturamos la lista completa de nombres para el informe.
  const processedNames = contacts.map(c => c.name || 'Sin Nombre').filter(Boolean);
  // --- FIN DE LA MODIFICACIÓN ---

  for (const c of contacts) {
    // ... (toda la lógica de sincronización existente se mantiene igual) ...
    
    let existingParty: Party | null = null;
    let existingRef: FirebaseFirestore.DocumentReference | null = null;
    // ...
    // Lógica de match y upsert
        if (!c.name) continue;

    const contactTaxId = (c.code || '').trim().toUpperCase();
    if (contactTaxId) existingParty = (await adminDb.collection('parties').where('taxId', '==', contactTaxId).limit(1).get()).docs[0]?.data() as Party | null;
    if (!existingParty) existingParty = (await adminDb.collection('parties').where('name', '==', c.name.trim()).limit(1).get()).docs[0]?.data() as Party | null;
      
      const proposedData: Partial<Party> = {
        name: c.name,
        taxId: c.code || undefined,
        addresses: c.billAddress ? [{
            type: 'billing',
            street: c.billAddress.address,
            city: c.billAddress.city,
            postalCode: c.billAddress.postalCode,
            country: c.billAddress.country,
        }] : [],
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

  // --- LÍNEA MODIFICADA ---
  // Devolvemos la lista completa en el resultado del worker.
  return { ok: true, count: contacts.length, nextPage: contacts.length === 50 ? page + 1 : null, dryRun, processedNames };
}
