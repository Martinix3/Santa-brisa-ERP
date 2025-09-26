// src/server/workers/validateShipment.worker.ts
'use server';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Shipment, ShipmentLine } from '@/domain/ssot';

export async function run(payload: {
    shipmentId: string;
    visualOk: boolean;
    carrier?: string;
    weightKg?: number;
    dimsCm?: { l: number; w: number; h: number };
    lotMap?: Record<string, { lotNumber: string; qty: number }[]>;
}) {
    const { shipmentId, ...updateData } = payload;
    const shipmentRef = db.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
        throw new Error(`Shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentSnap.data() as Shipment;

    const updatedLines = [...shipment.lines];
    if (updateData.lotMap) {
        for (const line of updatedLines) {
            const lotsForSku = updateData.lotMap[line.itemId];
            if (lotsForSku && lotsForSku.length > 0) {
                line.lotNumber = lotsForSku[0].lotNumber;
            }
        }
    }

    const patch: Partial<Shipment> = {
        checks: { ...shipment.checks, visualOk: updateData.visualOk },
        carrier: updateData.carrier || shipment.carrier,
        weightKg: updateData.weightKg || shipment.weightKg,
        dimsCm: updateData.dimsCm || shipment.dimsCm,
        lines: updatedLines as ShipmentLine[],
        updatedAt: Timestamp.now() as any,
    };

    if (updateData.visualOk) {
        patch.status = 'ready_to_ship';
    }


    await shipmentRef.update(patch as any);
    console.log(`Shipment ${shipmentId} validated. New status: ${patch.status}`);
}
