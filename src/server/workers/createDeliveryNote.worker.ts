// src/server/workers/createDeliveryNote.worker.ts
'use server';
import { adminDb as db } from '@/server/firebase';
import type { DeliveryNote, Shipment, OrderSellOut, Party, Uom } from '@/domain/ssot';
import { Timestamp } from 'firebase-admin/firestore';
import { makeDeliveryNoteCode } from '@/lib/codes';

export async function run({ shipmentId }: { shipmentId: string }) {
    const shipmentRef = db.collection('shipments').doc(shipmentId);
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

    const orderSnap = await db.collection('ordersSellOut').doc(shipment.orderId).get();
    if (!orderSnap.exists) throw new Error(`Order ${shipment.orderId} not found.`);
    const order = orderSnap.data() as OrderSellOut;

    const partySnap = await db.collection('parties').doc(shipment.partyId).get();
    if (!partySnap.exists) throw new Error(`Party ${shipment.partyId} not found.`);
    const party = partySnap.data() as Party;

    const series: 'ONLINE'|'B2B'|'INTERNAL' = order.source === 'SHOPIFY' ? 'ONLINE' : 'B2B';
    const allDeliveryNotes = (await db.collection('deliveryNotes').select('id').get()).docs.map(d => d.id);
    const dnId = makeDeliveryNoteCode(allDeliveryNotes, new Date());


    const deliveryNoteData: Partial<DeliveryNote> = {
        id: dnId,
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
            itemId: l.itemId,
            description: l.name ?? '',
            qty: l.qty,
            uom: 'unit' as Uom,
            lotNumbers: l.lotNumber ? [l.lotNumber] : [],
        })),
        company: { name: 'Santa Brisa', vat: 'B00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' }
    };
    
    await db.collection('deliveryNotes').doc(dnId).set({ 
        ...deliveryNoteData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    
    await shipmentRef.update({ deliveryNoteId: dnId, updatedAt: Timestamp.now() });
    
    console.log(`Created delivery note ${dnId} for shipment ${shipmentId}.`);
}
