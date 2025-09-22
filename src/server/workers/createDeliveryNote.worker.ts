// src/server/workers/createDeliveryNote.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { Shipment, DeliveryNote, OrderSellOut, Party } from '@/domain/ssot';
import { saveBufferToStorage } from '../storage';
import { Timestamp } from 'firebase-admin/firestore';

function nextDnId(series: 'ONLINE'|'B2B'|'INTERNAL' = 'B2B') {
  const y = new Date().getFullYear();
  const rnd = Math.floor(Math.random()*90000 + 10000);
  return `DN-${series}-${y}-${rnd}`;
}

export async function run({ shipmentId }: { shipmentId: string }) {
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) throw new Error(`Shipment ${shipmentId} not found.`);
    const shipment = shipmentSnap.data() as Shipment;

    if (shipment.status !== 'ready_to_ship' && !shipment.checks?.visualOk) {
        throw new Error('Shipment not ready or visual check not passed.');
    }
    if (shipment.deliveryNoteId) {
        console.log(`Delivery note for shipment ${shipmentId} already exists.`);
        return;
    }

    const orderSnap = await adminDb.collection('ordersSellOut').doc(shipment.orderId).get();
    if (!orderSnap.exists) throw new Error(`Order ${shipment.orderId} not found.`);
    const order = orderSnap.data() as OrderSellOut;

    const partySnap = await adminDb.collection('parties').doc(shipment.partyId).get();
    if (!partySnap.exists) throw new Error(`Party ${shipment.partyId} not found.`);
    const party = partySnap.data() as Party;

    const series: 'ONLINE'|'B2B'|'INTERNAL' = order.source === 'SHOPIFY' ? 'ONLINE' : 'B2B';
    const dnId = nextDnId(series);

    const deliveryNoteData: DeliveryNote = {
        id: dnId,
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        partyId: shipment.partyId,
        series: series,
        date: new Date().toISOString(),
        soldTo: { name: party.legalName, vat: party.vat || party.taxId },
        shipTo: {
            name: shipment.customerName,
            address: shipment.addressLine1 || '',
            zip: shipment.postalCode || '',
            city: shipment.city,
            country: shipment.country || 'España',
        },
        lines: shipment.lines.map(l => ({
            sku: l.sku,
            description: l.name,
            qty: l.qty,
            uom: 'uds',
            lotNumbers: l.lotNumber ? [l.lotNumber] : [],
        })),
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
    };

    const pdfBytes = await renderDeliveryNotePdf({
        id: dnId,
        dateISO: deliveryNoteData.date,
        orderId: deliveryNoteData.orderId,
        soldTo: deliveryNoteData.soldTo,
        shipTo: deliveryNoteData.shipTo,
        lines: deliveryNoteData.lines,
        company: { name: 'Santa Brisa', vat: 'B00000000' }
    });

    const pdfUrl = await saveBufferToStorage(`deliveryNotes/${dnId}.pdf`, Buffer.from(pdfBytes), 'application/pdf');

    await adminDb.collection('deliveryNotes').doc(dnId).set({ ...deliveryNoteData, pdfUrl });
    await shipmentRef.update({ deliveryNoteId: dnId, updatedAt: Timestamp.now() });
    
    console.log(`Created delivery note ${dnId} for shipment ${shipmentId}.`);
}
