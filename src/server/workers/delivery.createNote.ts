// src/server/workers/delivery.createNote.ts
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote'; // tu util del MVP
import { saveBufferToStorage } from '@/server/storage';            // helper que sube a Storage
import type { Shipment, Party, OrderSellOut, DeliveryNote } from '@/domain/ssot';
import { Timestamp } from 'firebase-admin/firestore';


function nextDnId(series: 'ONLINE'|'B2B'|'INTERNAL' = 'B2B') {
  const y = new Date().getFullYear();
  const rnd = Math.floor(Math.random()*90000 + 10000);
  return `DN-${series}-${y}-${rnd}`;
}

export async function handleCreateDeliveryNoteCRM({ shipmentId }: { shipmentId: string }) {
  const sRef = adminDb.collection('shipments').doc(shipmentId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) throw new Error('Shipment not found');
  const s = sSnap.data() as Shipment;

  if (s.deliveryNoteId) return; // idempotencia
  if (!s.checks?.visualOk) throw new Error('Visual OK requerido antes de generar albarán');

  const order = (await adminDb.collection('ordersSellOut').doc(s.orderId).get()).data() as OrderSellOut | undefined;
  if (!order) throw new Error('Order not found');

  const party = (await adminDb.collection('parties').doc(s.partyId).get()).data() as Party | undefined;
  if (!party) throw new Error('Party not found');

  const series: 'ONLINE'|'B2B'|'INTERNAL' = order.source === 'SHOPIFY' ? 'ONLINE' : 'B2B';
  const dnId = nextDnId(series);

  // Render PDF
  const pdfBytes = await renderDeliveryNotePdf({
    id: dnId,
    dateISO: new Date().toISOString(),
    orderId: s.orderId,
    soldTo: { name: party.tradeName || party.legalName, vat: party.vat },
    shipTo: {
      name: party.tradeName || party.legalName,
      address: party.addresses?.[0]?.street || '',
      zip: party.addresses?.[0]?.postalCode || '',
      city: party.addresses?.[0]?.city || '',
      country: party.addresses?.[0]?.country || 'España',
    },
    lines: (s.lines||[]).map((l:any)=>({ sku:l.sku, description:l.name || l.sku, qty:l.qty, uom:l.uom || 'ud' })),
    company: {
      name: 'Santa Brisa',
      vat: 'B00000000',
      address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España'
    }
  });

  const pdfUrl = await saveBufferToStorage(`deliveryNotes/${dnId}.pdf`, Buffer.from(pdfBytes), 'application/pdf');

  const note: DeliveryNote = {
    id: dnId,
    orderId: s.orderId,
    shipmentId,
    partyId: s.partyId,
    series,
    date: new Date().toISOString(),
    pdfUrl,
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
    lines: (s.lines||[]).map((l:any)=>({ sku:l.sku, description:l.name||l.sku, qty:l.qty, uom:l.uom||'ud', lotNumbers: l.lotNumber?[l.lotNumber]:[] })),
    soldTo: { name: party.tradeName || party.legalName, vat: party.vat },
    shipTo: {
      name: party.tradeName || party.legalName,
      address: party.addresses?.[0]?.street || '',
      zip: party.addresses?.[0]?.postalCode || '',
      city: party.addresses?.[0]?.city || '',
      country: party.addresses?.[0]?.country || 'España',
    },
    company: { name: 'Santa Brisa', vat: 'B00000000' }
  };

  await adminDb.collection('deliveryNotes').doc(dnId).set(note);
  await sRef.set({ deliveryNoteId: dnId, updatedAt: Timestamp.now() }, { merge: true });
}
