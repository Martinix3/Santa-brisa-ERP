
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Shipment, OrderSellOut } from '@/domain/ssot';
import { enqueue } from '../queue/queue';

export async function run({ shipmentId }: { shipmentId: string }) {
    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
        throw new Error(`Shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentSnap.data() as Shipment;

    if (shipment.status === 'shipped' || shipment.status === 'delivered') {
        console.log(`Shipment ${shipmentId} is already shipped or delivered.`);
        return;
    }

    // Preconditions
    if (shipment.mode === 'PARCEL' && !shipment.trackingCode) {
        throw new Error("Cannot mark as shipped: missing tracking code for parcel.");
    }
    if (shipment.mode === 'PALLET' && !shipment.labelUrl) {
        throw new Error("Cannot mark as shipped: missing label for pallet.");
    }


    await shipmentRef.update({
        status: 'shipped',
        updatedAt: Timestamp.now(),
    });

    console.log(`Shipment ${shipmentId} marked as shipped.`);

    // If it's a Shopify order, enqueue a job to update Shopify
    const orderSnap = await adminDb.collection('ordersSellOut').doc(shipment.orderId).get();
    if (orderSnap.exists) {
        const order = orderSnap.data() as OrderSellOut;
        if (order.source === 'SHOPIFY' && order.external?.shopifyOrderId) {
            await enqueue({
                kind: 'UPDATE_SHOPIFY_FULFILLMENT',
                payload: {
                    shipmentId: shipment.id,
                    shopifyOrderId: order.external.shopifyOrderId,
                    trackingNumber: shipment.trackingCode,
                    trackingUrl: shipment.trackingUrl,
                    carrier: shipment.carrier,
                },
                delaySec: 10, // Give it a few seconds
            });
            console.log(`Enqueued UPDATE_SHOPIFY_FULFILLMENT for Shopify order ${order.external.shopifyOrderId}`);
        }
    }
}
