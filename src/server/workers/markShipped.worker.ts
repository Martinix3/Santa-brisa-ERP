// src/server/workers/markShipped.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Shipment } from '@/domain/ssot';

export async function run({ shipmentId }: { shipmentId: string }) {
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
        throw new Error(`Shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentSnap.data() as Shipment;

    // Preconditions
    if (shipment.mode === 'PARCEL' && !shipment.trackingCode) {
        throw new Error("Cannot mark as shipped: missing tracking code for parcel.");
    }
    if (shipment.mode === 'PALLET' && !shipment.labelUrl) {
        throw new Error("Cannot mark as shipped: missing label for pallet.");
    }

    if (shipment.status === 'shipped' || shipment.status === 'delivered') {
        console.log(`Shipment ${shipmentId} is already shipped or delivered.`);
        return;
    }

    await shipmentRef.update({
        status: 'shipped',
        updatedAt: Timestamp.now(),
    });

    console.log(`Shipment ${shipmentId} marked as shipped.`);
}
