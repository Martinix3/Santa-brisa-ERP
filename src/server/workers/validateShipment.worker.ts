// src/server/workers/validateShipment.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore'; // Importar Timestamp
import type { Shipment, ShipmentLine } from '@/domain/ssot';

export async function run(payload: {
    shipmentId: string;
    visualOk: boolean;
    carrier?: string;
    weightKg?: number;
    dimsCm?: { l: number; w: number; h: number };
    lotMap?: Record<string, { lotId: string; qty: number }[]>;
}) {
    const { shipmentId, ...updateData } = payload;
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
        throw new Error(`Shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentSnap.data() as Shipment;

    const updatedLines = [...shipment.lines];
    if (updateData.lotMap) {
        for (const line of updatedLines) {
            const lotsForSku = updateData.lotMap[line.sku];
            if (lotsForSku && lotsForSku.length > 0) {
                // For simplicity, we'll just take the first lot. A real system might handle multiple lots per line.
                line.lotNumber = lotsForSku[0].lotId;
            }
        }
    }

    const patch: Partial<Shipment> = {
        checks: { ...shipment.checks, visualOk: updateData.visualOk },
        carrier: updateData.carrier || shipment.carrier,
        weightKg: updateData.weightKg || shipment.weightKg,
        dimsCm: updateData.dimsCm || shipment.dimsCm,
        lines: updatedLines as ShipmentLine[],
        updatedAt: Timestamp.now() as any, // <-- CORRECCIÓN APLICADA
    };

    if (updateData.visualOk) {
        patch.status = 'ready_to_ship';
    }


    await shipmentRef.update(patch as any); // Cast to any to avoid deep type issues
    console.log(`Shipment ${shipmentId} validated. New status: ${patch.status}`);
}
