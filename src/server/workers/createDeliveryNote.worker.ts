'use server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf, toDataUri } from '@/server/pdf/deliveryNote';
import type { Shipment, DeliveryNote, OrderSellOut, Party } from '@/domain/ssot';
import { saveBufferToStorage } from '../storage';

async function uploadPdfToStorage(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  console.log(`[WORKER-STUB] "Uploading" ${fileName} to storage.`);
  return saveBufferToStorage(fileName, Buffer.from(pdfBytes), 'application/pdf');
}

export async function handleCreateDeliveryNoteCrm({ shipmentId }: { shipmentId: string }) {
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) throw new Error(`Shipment ${shipmentId} not found.`);
    const shipment = shipmentSnap.data() as Shipment;

    if (shipment.status !== 'ready_to_ship' || !shipment.checks?.visualOk) {
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

    // Generate a simple delivery note ID
    const dnId = `DN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const deliveryNoteData: DeliveryNote = {
        id: dnId,
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        partyId: shipment.partyId,
        series: order.source === 'SHOPIFY' ? 'ONLINE' : 'B2B',
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
            description: l.name || l.sku,
            qty: l.qty,
            uom: l.uom,
            lotNumbers: l.lotNumber ? [l.lotNumber] : [],
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const pdfBytes = await renderDeliveryNotePdf({
        id: dnId,
        dateISO: deliveryNoteData.date,
        orderId: deliveryNoteData.orderId,
        soldTo: deliveryNoteData.soldTo,
        shipTo: deliveryNoteData.shipTo,
        lines: deliveryNoteData.lines,
        company: { name: 'Santa Brisa', vat: 'B00000000' } // Should come from settings
    });

    const pdfUrl = await uploadPdfToStorage(pdfBytes, `${dnId}.pdf`);

    await adminDb.collection('deliveryNotes').doc(dnId).set({ ...deliveryNoteData, pdfUrl });
    await shipmentRef.update({ deliveryNoteId: dnId, updatedAt: new Date().toISOString() });
    
    console.log(`Created delivery note ${dnId} for shipment ${shipmentId}.`);
}
