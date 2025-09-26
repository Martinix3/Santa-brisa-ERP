// src/server/workers/createManualShipment.worker.ts
'use server';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Shipment } from '@/domain/ssot';

export async function run(payload: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>) {
    const shipmentRef = db.collection('shipments').doc(); // Auto-generate ID
    
    const newShipment: Shipment = {
        ...payload,
        id: shipmentRef.id,
        status: 'pending', // Always start as pending
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
    };

    await shipmentRef.set(newShipment as any);
    console.log(`[Worker] Manual shipment ${shipmentRef.id} created successfully.`);
}
