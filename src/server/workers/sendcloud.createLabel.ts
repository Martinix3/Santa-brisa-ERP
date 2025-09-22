// src/server/workers/sendcloud.createLabel.ts
import { adminDb } from '@/server/firebaseAdmin';
import { callSendcloudApi } from '../integrations/sendcloud/client';
import type { Shipment, Account, Party } from '@/domain/ssot';

export async function handleCreateSendcloudLabel({ shipmentId }: { shipmentId: string }) {
    const shipmentSnap = await adminDb.collection('shipments').doc(shipmentId).get();
    if (!shipmentSnap.exists) throw new Error(`Shipment ${shipmentId} not found.`);
    const shipment = shipmentSnap.data() as Shipment;

    // Idempotency: if label already exists, just return it
    if (shipment.labelUrl && shipment.tracking) {
        return { labelUrl: shipment.labelUrl, tracking: shipment.tracking };
    }

    const accountSnap = await adminDb.collection('accounts').doc(shipment.accountId).get();
    const account = accountSnap.data() as Account;
    const partySnap = await adminDb.collection('parties').doc(account.partyId).get();
    const party = partySnap.data() as Party;
    const address = party.addresses.find(a => a.isPrimary || a.type === 'shipping') || party.addresses[0];

    const parcelPayload = {
        parcel: {
            name: shipment.customerName,
            address: address.street,
            city: address.city,
            postal_code: address.postalCode,
            country: address.country.toUpperCase(), // Sendcloud requires ISO 2 codes
            email: party.contacts.find(c => c.type === 'email')?.value,
            telephone: party.contacts.find(c => c.type === 'phone')?.value,
            order_number: shipment.orderId,
            shipping_method: 8, // Example: SEUR DPD Shop (lookup required)
            parcel_items: shipment.lines.map(line => ({
                description: line.name,
                quantity: line.qty,
                weight: "0.5", // Needs real weight data
                sku: line.sku,
                value: "15.00" // Needs real value data
            })),
        }
    };

    const createdParcel = await callSendcloudApi('/parcels', 'POST', parcelPayload);

    const labelUrl = createdParcel.parcel.label.label_printer;
    const trackingNumber = createdParcel.parcel.tracking_number;

    await shipmentSnap.ref.update({
        labelUrl: labelUrl,
        tracking: trackingNumber,
        status: 'ready_to_ship'
    });

    console.log(`Generated Sendcloud label for shipment ${shipmentId}. Tracking: ${trackingNumber}`);
    return { labelUrl, tracking: trackingNumber };
}
