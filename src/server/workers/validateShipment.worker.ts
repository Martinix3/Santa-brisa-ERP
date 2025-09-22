'use server';
import { adminDb } from '@/server/firebaseAdmin';
import type { Shipment, ShipmentLine } from '@/domain/ssot';

export async function handleValidateShipment(payload: {
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
        for (const sku in updateData.lotMap) {
            const lineIndex = updatedLines.findIndex(l => l.sku === sku);
            if (lineIndex !== -1) {
                // For simplicity, we'll just take the first lot. A real system might handle multiple lots per line.
                updatedLines[lineIndex].lotNumber = updateData.lotMap[sku][0]?.lotId;
            }
        }
    }

    const patch: Partial<Shipment> = {
        checks: { ...shipment.checks, visualOk: updateData.visualOk },
        carrier: updateData.carrier || shipment.carrier,
        weightKg: updateData.weightKg || shipment.weightKg,
        dimsCm: updateData.dimsCm || shipment.dimsCm,
        lines: updatedLines as any, // Cast because we know it's correct
        status: 'ready_to_ship',
        updatedAt: new Date().toISOString(),
    };

    await shipmentRef.update(patch as any); // Cast to any to avoid deep type issues
    console.log(`Shipment ${shipmentId} validated and moved to ready_to_ship.`);
}
