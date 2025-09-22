// src/server/integrations/holded/syncPurchases.ts
import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '@/server/integrations/holded/client';
import { Timestamp } from 'firebase-admin/firestore';

type HoldedPurchase = {
  id: string; contactId: string; contactName?: string; email?: string; code?: string; // code is vat
  status?: string; date?: string; dueDate?: string; currency?: string;
  total?: number; totalTax?: number; tax?: number;
  lines?: Array<{ description?: string; name?: string; itemName?: string; quantity?: number; price?: number; taxPercent?: number }>;
};

function mapStatus(s?: string): 'DRAFT'|'APPROVED'|'PAID'|'CANCELLED' {
  const t = (s||'').toLowerCase();
  if (t.includes('paid')||t.includes('pag')) return 'PAID';
  if (t.includes('cancel')) return 'CANCELLED';
  if (t.includes('draft')||t.includes('borrador')) return 'DRAFT';
  return 'APPROVED';
}

async function upsertSupplierParty(p: { contactId: string; name?: string; vat?: string; email?: string }) {
  // Por holdedContactId
  const q = await adminDb.collection('parties').where('external.holdedContactId', '==', p.contactId).limit(1).get();
  const ref = q.empty ? adminDb.collection('parties').doc() : q.docs[0].ref;
  const data = q.empty ? {} as any : q.docs[0].data();

  const roles = new Set<string>([...(data.roles || [])]);
  roles.add('SUPPLIER');

  await ref.set({
    legalName: p.name || p.vat || 'Proveedor',
    vat: p.vat || data.vat || null,
    emails: p.email ? [p.email] : (data.emails || []),
    roles: Array.from(roles),
    external: { ...(data.external||{}), holdedContactId: p.contactId },
    updatedAt: Timestamp.now(),
    ...(q.empty ? { createdAt: Timestamp.now() } : {})
  }, { merge: true });

  return ref.id;
}

export async function handleSyncHoldedPurchases({ page = 1 }: { page?: number }) {
  // Endpoint de compras (ajústalo si tu cuenta usa ruta distinta)
  const purchases: HoldedPurchase[] = await callHoldedApi(`/documents/purchaseinvoice?limit=200&page=${page}`, 'GET') as HoldedPurchase[];

  for (const p of purchases) {
    const supplierPartyId = await upsertSupplierParty({
      contactId: p.contactId,
      name: p.contactName,
      vat: p.code,
      email: p.email
    });

    const lines = (p.lines||[]).map(l => ({
      description: l.description || l.name || l.itemName || '',
      qty: Number(l.quantity || 1),
      unitPrice: Number(l.price || 0),
      taxRate: l.taxPercent != null ? Number(l.taxPercent) : undefined
    }));

    const expenseId = `holded-${p.id}`;
    await adminDb.collection('expenses').doc(expenseId).set({
      id: expenseId,
      partyId: supplierPartyId,
      date: p.date || new Date().toISOString(),
      dueDate: p.dueDate || null,
      status: mapStatus(p.status),
      amountTotal: Number(p.total ?? 0),
      amountTax: Number((p.totalTax ?? p.tax) ?? 0),
      currency: (p.currency || 'EUR').toUpperCase(),
      lines,
      external: { holdedPurchaseId: p.id },
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    }, { merge: true });
  }
}
