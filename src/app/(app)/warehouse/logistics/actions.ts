
// src/app/(app)/warehouse/logistics/actions.ts
'use server';
import 'server-only';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, OrderSellOut, OnHandView, StockMove, Lot, Item, Party, Account } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { checkOrderStock } from '@/lib/inventory';
import { makeOnHandId } from '@/domain/id-helpers';
import { makeShipmentCode } from '@/lib/codes';

/**
 * Creates a shipment document directly in Firestore from manual input.
 * This is for shipments not originating from an existing order.
 */
export async function createManualShipment(payload: any) {
  // Direct creation is now handled by a worker to keep logic centralized
  await enqueue({ kind: 'CREATE_MANUAL_SHIPMENT', payload, maxAttempts: 3 });
  console.log(`[Action] Enqueued job to create manual shipment.`);
  return { ok: true };
}

/**
 * Confirms an order, atomically reserves stock, and creates the corresponding shipment.
 * If successful, it also enqueues a job to create the invoice.
 */
export async function confirmOrderShipment(orderId: string): Promise<Shipment> {
  const order = await getOne<OrderSellOut>('ordersSellOut', orderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== 'open') throw new Error('Order must be in "open" status to confirm.');

  // 1. ALL READS FIRST - Fetch all necessary data before starting the transaction.
  const [onHandSnap, lotsSnap, itemsSnap, account, shipmentsSnap] = await Promise.all([
    db.collection('onHand').get(),
    db.collection('lots').get(),
    db.collection('items').get(),
    getOne<Account>('accounts', order.accountId),
    db.collection('shipments').select('shipmentNumber').get(),
  ]);

  if (!account) throw new Error(`Account ${order.accountId} not found.`);
  const party = await getOne<Party>('parties', account.partyId);
  if (!party) throw new Error(`Party ${account.partyId} not found.`);

  const onHand = onHandSnap.docs.map(doc => doc.data() as OnHandView);
  const lots = lotsSnap.docs.map(doc => doc.data() as Lot);
  const itemsById = new Map(itemsSnap.docs.map(d => [d.id, d.data() as Item]));
  
  const { allocations, shortages } = checkOrderStock(order, onHand, lots);
  if (shortages.length > 0) {
    const shortageDetails = shortages.map(s => `${s.qtyShort}x ${itemsById.get(s.itemId)?.name ?? s.itemId}`).join(', ');
    throw new Error(`Stock insufficient. Shortages: ${shortageDetails}`);
  }
  
  const allShipmentNumbers = shipmentsSnap.docs.map(d => d.data().shipmentNumber).filter(Boolean);
  const shipmentNumber = makeShipmentCode(allShipmentNumbers, new Date());
  
  // 2. TRANSACTION - Perform all writes atomically.
  const shipmentRef = db.collection('shipments').doc();
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const now = new Date().toISOString();
  let newShipment: Shipment;

  await db.runTransaction(async (transaction) => {
    // 2a. Atomically reserve stock
    for (const alloc of allocations) {
      if (!alloc.lotNumber) continue;
      const onHandId = makeOnHandId(alloc.itemId, alloc.lotNumber, 'FG/MAIN');
      const onHandRef = db.collection('onHand').doc(onHandId);
      transaction.update(onHandRef, {
        reservedQty: FieldValue.increment(alloc.qty),
        updatedAt: now,
      });
    }

    // 2b. Update order status
    transaction.update(orderRef, { status: 'confirmed', updatedAt: now });

    // 2c. Create the new shipment document
    const isOnlineOrPrivate = account.type === 'ONLINE' || account.type === 'PRIVADA';
    const totalUnits = order.lines.reduce((sum, line) => sum + line.qty, 0);
    const mode: 'PARCEL' | 'PALLET' = isOnlineOrPrivate || totalUnits < 12 ? 'PARCEL' : 'PALLET';

    newShipment = {
        id: shipmentRef.id,
        shipmentNumber,
        orderId: order.id,
        partyId: account.partyId,
        accountId: account.id,
        mode,
        status: 'pending',
        lines: order.lines.map(line => {
            const alloc = allocations.find(a => a.itemId === line.itemId);
            return {
                itemId: line.itemId,
                name: itemsById.get(line.itemId)?.name ?? line.itemId,
                qty: line.qty,
                uom: 'unit',
                lotNumber: alloc?.lotNumber,
            };
        }),
        customerName: party.name,
        addressLine1: party.billingAddress?.address || '',
        city: party.billingAddress?.city || '',
        postalCode: party.billingAddress?.zip || '',
        country: party.billingAddress?.country || 'España',
        createdAt: now,
        updatedAt: now,
        notes: order.notes,
    };
    transaction.set(shipmentRef, newShipment as any);
  });
  // --- End Transaction ---

  // 3. Enqueue follow-up jobs only if the transaction was successful
  await enqueue({
      kind: 'CREATE_HOLDED_INVOICE',
      payload: { orderId: order.id },
      correlationId: `order-${order.id}-invoice`,
  });

  revalidatePath('/orders');
  revalidatePath('/warehouse/inventory');
  revalidatePath('/warehouse/logistics');

  return newShipment!;
}


type ValidateShipmentInput = {
  shipmentId: string;
  userId: string;
  notes?: string;
  lots?: Array<{ itemId: string; lotNumber?: string; qty: number }>;
};

export async function validateShipment(input: ValidateShipmentInput) {
  const { shipmentId, userId, notes, lots } = input;
  const now = new Date().toISOString();
  const shp = await getOne<Shipment>('shipments', shipmentId);
  if (!shp) throw new Error('Shipment not found');

  await upsertMany('shipments', [
    {
      id: shipmentId,
      status: 'ready_to_ship',
      updatedAt: now,
      validatedById: userId,
      validatedAt: now,
      validationNotes: notes ?? null,
      lines: lots?.length
        ? lots.map((l) => ({ itemId: l.itemId, qty: l.qty, uom: 'unit' as const, lotNumber: l.lotNumber }))
        : (shp.lines || []),
    },
  ]);

  if (shp.orderId) {
    await upsertMany<OrderSellOut>('ordersSellOut', [
      { id: shp.orderId, status: 'confirmed', updatedAt: now } as any,
    ]);
  }
  revalidatePath('/warehouse/logistics');
  if (shp.orderId) revalidatePath('/sales/orders');
  return { ok: true, shipmentId, orderId: shp.orderId ?? null };
}

type MarkShippedInput = { shipmentId: string; trackingCode?: string; labelUrl?: string };
export async function markShipmentShipped({ shipmentId, trackingCode, labelUrl }: MarkShippedInput) {
  const now = new Date().toISOString();
  const shp = await getOne<Shipment>('shipments', shipmentId);
  if (!shp) throw new Error('Shipment not found');

  await upsertMany('shipments', [{
    id: shipmentId,
    status: 'shipped',
    shippedAt: now,
    updatedAt: now,
    trackingCode: trackingCode ?? shp.trackingCode ?? null,
    labelUrl: labelUrl ?? shp.labelUrl ?? null,
  } as any]);

  if (shp.orderId) {
    await upsertMany<OrderSellOut>('ordersSellOut', [{ id: shp.orderId, status: 'shipped', updatedAt: now } as any]);
  }

  revalidatePath('/warehouse/logistics');
  if (shp.orderId) revalidatePath('/sales/orders');
  return { ok:true };
}

// Alias compatible, pero exportado como función async (no constante)
export async function markShipped(args: MarkShippedInput) {
  return markShipmentShipped(args);
}


export async function createDeliveryNote(shipmentId: string) {
  await enqueue({ kind:'CREATE_DELIVERY_NOTE_CRM', payload:{ shipmentId }, maxAttempts:5 });
  return { ok:true };
}

export async function createParcelLabel(shipmentId: string) {
  await enqueue({ kind:'CREATE_SENDCLOUD_LABEL', payload:{ shipmentId }, maxAttempts:5 });
  return { ok:true };
}

export async function createPalletLabel(shipmentId: string) {
  await enqueue({ kind:'CREATE_INHOUSE_PALLET_LABEL', payload:{ shipmentId }, maxAttempts:5 });
  return { ok:true };
}

export async function invoiceOrder(orderId: string, opts?: { force?: boolean }) {
  await enqueue({ kind:'CREATE_INVOICE_FROM_ORDER', payload:{ orderId, ...opts }, maxAttempts:5 });
  return { ok:true };
}
