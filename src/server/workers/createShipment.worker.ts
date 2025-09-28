
// src/server/workers/createShipment.worker.ts
'use server';
import { adminDb as db } from '@/server/firebase';
import type { OrderSellOut, Shipment, Account, Party, Item, OnHandView, Lot } from '@/domain/ssot';
import { makeShipmentCode } from '@/lib/codes';

export async function run({ orderId }: { orderId: string }) {
    const orderSnap = await db.collection('ordersSellOut').doc(orderId).get();
    if (!orderSnap.exists) {
        throw new Error(`Order ${orderId} not found.`);
    }
    const order = orderSnap.data() as OrderSellOut;

    // Idempotency check: if a shipment already exists for this order, do nothing.
    const existingShipmentQuery = await db.collection('shipments').where('orderId', '==', orderId).limit(1).get();
    if (!existingShipmentQuery.empty) {
        console.log(`Shipment already exists for order ${orderId}. Skipping creation.`);
        return;
    }

    const accountSnap = await db.collection('accounts').doc(order.accountId).get();
    if (!accountSnap.exists) throw new Error(`Account ${order.accountId} for order ${orderId} not found.`);
    const account = accountSnap.data() as Account;

    const partySnap = await db.collection('parties').doc(account.partyId).get();
    if (!partySnap.exists) throw new Error(`Party ${account.partyId} for account ${account.id} not found.`);
    const party = partySnap.data() as Party;

    // Heuristic for PARCEL vs PALLET mode
    const isOnlineOrPrivate = account.type === 'ONLINE' || account.type === 'PRIVADA';
    const totalUnits = (order.lines || []).reduce((sum, line) => sum + line.qty, 0);
    const mode: 'PARCEL' | 'PALLET' = isOnlineOrPrivate || totalUnits < 12 ? 'PARCEL' : 'PALLET';

    const shipmentId = db.collection('shipments').doc().id;
    const allShipments = (await db.collection('shipments').select('shipmentNumber').get()).docs.map(d => d.data().shipmentNumber).filter(Boolean);
    const shipmentNumber = makeShipmentCode(allShipments, new Date());
    
    // Check for stock before changing status
    const itemIds = order.lines.map(l => l.itemId);
    const onHandSnap = itemIds.length > 0 ? await db.collection('onHand').where('itemId', 'in', itemIds).get() : { docs: [] };
    const onHand = onHandSnap.docs.map(doc => doc.data()) as OnHandView[];
    
    const lotsSnap = itemIds.length > 0 ? await db.collection('lots').where('itemId', 'in', itemIds).get() : { docs: [] };
    const lots = lotsSnap.docs.map(doc => doc.data() as Lot);
    const lotsById = new Map(lots.map(l => [l.lotNumber, l]));
    
    const shortages = (order.lines || []).map(line => {
        const available = onHand
            .filter(item => {
                const lot = item.lotNumber ? lotsById.get(item.lotNumber) : undefined;
                return item.itemId === line.itemId && 
                       item.locationId === 'FG/MAIN' && 
                       lot?.qcStatus === 'RELEASED';
            })
            .reduce((sum, item) => sum + item.qty, 0);
        return {
            itemId: line.itemId,
            required: line.qty,
            available: available,
            isShort: available < line.qty,
        };
    }).filter(s => s.isShort);

    const status: Shipment['status'] = shortages.length > 0 ? 'pending' : 'pending'; // Default to pending, exception should be handled differently
    const notes = shortages.length > 0 
        ? `Falta de stock: ${shortages.map(s => `${s.required - s.available}x ${s.itemId}`).join(', ')}`
        : order.notes;
    
    const itemsSnap = await db.collection('items').get();
    const itemsById = new Map(itemsSnap.docs.map(doc => [doc.id, doc.data() as Item]));

    const newShipment: Shipment = {
        id: shipmentId,
        shipmentNumber,
        orderId: order.id,
        partyId: account.partyId,
        accountId: account.id, // For compatibility
        mode,
        status: status,
        lines: (order.lines || []).map(line => ({
            itemId: line.itemId,
            name: itemsById.get(line.itemId)?.name ?? line.itemId,
            qty: line.qty,
            uom: 'unit'
        })),
        customerName: party.name, // denormalized for logistics
        addressLine1: party.billingAddress?.address || '',
        city: party.billingAddress?.city || '',
        postalCode: party.billingAddress?.zip || '',
        country: party.billingAddress?.country || 'España',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: notes
    };

    await db.collection('shipments').doc(shipmentId).set(newShipment as any);
    console.log(`Successfully created shipment ${shipmentNumber} for order ${orderId} with status ${status}.`);
}
