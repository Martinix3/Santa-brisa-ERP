// src/server/workers/createSendcloudLabel.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import type { Shipment } from '@/domain/ssot';
import { Timestamp } from 'firebase-admin/firestore';
// import { callSendcloudApi } from '../integrations/sendcloud/client';

export async function run({ shipmentId }: { shipmentId: string }) {
    console.log(`[WORKER] Received job to create Sendcloud label for shipment ${shipmentId}`);
    
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
        throw new Error(`Shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentSnap.data() as Shipment;

    // Precondition checks
    if (!shipment.deliveryNoteId || !shipment.carrier || !shipment.weightKg || !shipment.dimsCm) {
        throw new Error("Missing preconditions: delivery note, carrier, weight or dimensions.");
    }
    if (shipment.labelUrl) {
        console.log(`Label for ${shipmentId} already exists. Skipping.`);
        return;
    }

    // In a real implementation, you would call callSendcloudApi here
    // const parcelPayload = { ... };
    // const sendcloudResponse = await callSendcloudApi('/parcels', 'POST', parcelPayload);

    // Mocking the Sendcloud response
    const mockTrackingCode = `SC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const mockLabelUrl = `https://labels.sendcloud.sc/mock-label-${shipmentId}.pdf`;

    await shipmentRef.update({
        labelUrl: mockLabelUrl,
        trackingCode: mockTrackingCode,
        trackingUrl: `https://mock.tracking.link/${mockTrackingCode}`,
        updatedAt: Timestamp.now(),
    });

    console.log(`[WORKER] Generated Sendcloud label for ${shipmentId}. Tracking: ${mockTrackingCode}`);
}
