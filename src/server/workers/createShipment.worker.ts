// src/server/workers/createShipment.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import type { OrderSellOut, Shipment, Account, Party } from '@/domain/ssot';

export async function run({ orderId }: { orderId: string }) {
    const orderSnap = await adminDb.collection('ordersSellOut').doc(orderId).get();
    if (!orderSnap.exists) {
        throw new Error(`Order ${orderId} not found.`);
    }
    const order = orderSnap.data() as OrderSellOut;

    // Idempotency check: if a shipment already exists for this order, do nothing.
    const existingShipmentQuery = await adminDb.collection('shipments').where('orderId', '==', orderId).limit(1).get();
    if (!existingShipmentQuery.empty) {
        console.log(`Shipment already exists for order ${orderId}. Skipping creation.`);
        return;
    }

    const accountSnap = await adminDb.collection('accounts').doc(order.accountId).get();
    if (!accountSnap.exists) throw new Error(`Account ${order.accountId} for order ${orderId} not found.`);
    const account = accountSnap.data() as Account;

    const partySnap = await adminDb.collection('parties').doc(account.partyId).get();
    if (!partySnap.exists) throw new Error(`Party ${account.partyId} for account ${account.id} not found.`);
    const party = partySnap.data() as Party;

    // Heuristic for PARCEL vs PALLET mode
    const isOnlineOrPrivate = account.type === 'ONLINE' || account.type === 'PRIVADA';
    const totalUnits = (order.lines || []).reduce((sum, line) => sum + line.qty, 0);
    const mode: 'PARCEL' | 'PALLET' = isOnlineOrPrivate || totalUnits < 12 ? 'PARCEL' : 'PALLET';

    const shipmentId = adminDb.collection('shipments').doc().id;
    
    const newShipment: Shipment = {
        id: shipmentId,
        orderId: order.id,
        partyId: account.partyId,
        accountId: account.id, // For compatibility
        mode,
        status: 'pending',
        lines: (order.lines || []).map(line => ({
            sku: line.sku,
            name: line.name ?? line.sku, // Ensure name is always a string
            qty: line.qty,
            uom: 'uds'
        })),
        customerName: party.name, // denormalized for logistics
        addressLine1: party.addresses?.[0]?.street || '',
        city: party.addresses?.[0]?.city || '',
        postalCode: party.addresses?.[0]?.postalCode || '',
        country: party.addresses?.[0]?.country || 'España',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('shipments').doc(shipmentId).set(newShipment);
    console.log(`Successfully created shipment ${shipmentId} for order ${orderId}.`);
}

    