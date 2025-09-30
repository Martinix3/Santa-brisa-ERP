// src/app/(app)/warehouse/logistics/actions.ts
'use server';
import 'server-only';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, OrderSellOut, OnHandView, StockMove, Lot, Item, Party, Account } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { checkOrderStock, type AllocationDetail } from '@/lib/inventory';
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
  
  const result = checkOrderStock(order, onHand, lots);
  const allocations = Array.isArray(result?.allocations) ? result.allocations : [];
  const shortages = Array.isArray(result?.shortages) ? result.shortages : [];

  // Debugging log
  console.log('[checkOrderStock] DEBUG', {
    orderId: order.id,
    lines: order.lines,
    onHandCount: onHand.length,
    lotsCount: lots.length,
    allocationsCount: allocations.length,
    shortagesCount: shortages.length,
    sampleAllocation: allocations[0]
  });

  if (!allocations.length && order.lines.length > 0) {
    const itemIds = order.lines.map(l => l.itemId);
    const byItem = Object.fromEntries(itemIds.map(id => {
      const rows = onHand.filter(r => r.itemId === id);
      const freeReleased = rows
        .map(r => ({
          qc: String(r.qcStatus ?? '').toUpperCase(),
          qty: Number(r.qty ?? 0),
          res: Number(r.reservedQty ?? 0),
          free: Math.max(0, Number(r.qty ?? 0) - Number(r.reservedQty ?? 0)),
          lot: r.lotNumber,
          loc: r.locationId,
          exp: r.expiryAt
        }))
        .filter(r =>
          ['PASSED','WAIVED','RELEASED','OK','APPROVED'].includes(r.qc) && r.free > 0
        );
      return [id, {
        need: order.lines.find(l => l.itemId === id)?.qty,
        rows: rows.length,
        totalQty: rows.reduce((s, r) => s + Number(r.qty ?? 0), 0),
        totalReserved: rows.reduce((s, r) => s + Number(r.reservedQty ?? 0), 0),
        totalFreeReleased: freeReleased.reduce((s, r) => s + r.free, 0),
        sampleReleased: freeReleased.slice(0,3),
        sampleAny: rows.slice(0,3).map(r => ({
          qc: String(r.qcStatus ?? '').toUpperCase(),
          qty: Number(r.qty ?? 0),
          res: Number(r.reservedQty ?? 0),
          lot: r.lotNumber, loc: r.locationId
        }))
      }];
    }));

    console.warn('[ALLOC DEBUG]', {
      orderId: order.id,
      lines: order.lines,
      onHandCount: onHand.length,
      lotsCount: lots.length,
      byItem,
      shortages,
    });

    const msg = shortages.length
      ? shortages.map(s =>
          `• ${itemsById.get(s.itemId)?.name ?? s.itemId}: necesita ${s.qtyRequired}, ` +
          `liberado ${s.qtyAvailable}, falta ${s.qtyShort}` +
          (s.qtyOnHold > 0 ? ` (en HOLD ${s.qtyOnHold})` : '')
        ).join('\n')
      : 'No hay stock liberado ni lotes válidos para asignar (QC o reservas).';
    throw new Error(`No se han podido calcular reservas.\n${msg}`);
  }

  const missingLots = allocations.filter(a => !a.lotNumber);
  if (missingLots.length) {
    const ids = [...new Set(missingLots.map(a => a.itemId))].join(', ');
    throw new Error(`Faltan lotes en la asignación para: ${ids}.`);
  }

  const allShipmentNumbers = shipmentsSnap.docs.map(d => d.data().shipmentNumber).filter(Boolean);
  const shipmentNumber = makeShipmentCode(allShipmentNumbers, new Date());
  
  const shipmentRef = db.collection('shipments').doc();
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const now = new Date().toISOString();
  let newShipment: Shipment;

  await db.runTransaction(async (transaction) => {
    for (const alloc of allocations) {
      const onHandId = makeOnHandId(alloc.itemId, alloc.lotNumber, alloc.locationId);
      const onHandRef = db.collection('onHand').doc(onHandId);
      transaction.set(onHandRef, {
        itemId: alloc.itemId,
        lotNumber: alloc.lotNumber,
        locationId: alloc.locationId,
        reservedQty: FieldValue.increment(alloc.qty),
        qty: FieldValue.increment(0),
        uom: 'unit',
        updatedAt: now,
      }, { merge: true });
    }

    transaction.update(orderRef, { status: 'confirmed', updatedAt: now });

    const isOnlineOrPrivate = account.type === 'ONLINE' || account.type === 'PRIVADA';
    const totalUnits = order.lines.reduce((sum, line) => sum + line.qty, 0);
    const mode: 'PARCEL' | 'PALLET' = isOnlineOrPrivate || totalUnits < 12 ? 'PARCEL' : 'PALLET';

    // Group allocations by item
    const allocByItem = allocations.reduce<Record<string, AllocationDetail[]>>((acc, a) => {
        (acc[a.itemId] ||= []).push(a); return acc;
    }, {});
    
    newShipment = {
        id: shipmentRef.id,
        shipmentNumber,
        orderId: order.id,
        partyId: account.partyId,
        accountId: account.id,
        mode,
        status: 'pending',
        lines: order.lines.flatMap(line => {
            const allocs = allocByItem[line.itemId] || [];
            if (!allocs.length) {
              return [{
                itemId: line.itemId,
                name: itemsById.get(line.itemId)?.name ?? line.itemId,
                qty: line.qty,
                uom: 'unit',
                lotNumber: undefined,
                locationId: undefined,
                note: 'SIN ALLOC (revisar)'
              } as any];
            }
            return allocs.map(a => ({
              itemId: line.itemId,
              name: itemsById.get(line.itemId)?.name ?? line.itemId,
              qty: a.qty,
              uom: 'unit',
              lotNumber: a.lotNumber,
              locationId: a.locationId,
            }));
        }),
        customerName: party.name,
        addressLine1: party.billingAddress?.street || '',
        city: party.billingAddress?.city || '',
        postalCode: party.billingAddress?.zip || '',
        country: party.billingAddress?.country || 'España',
        createdAt: now,
        updatedAt: now,
        notes: order.notes,
    };
    transaction.set(shipmentRef, newShipment as any);
  });

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
