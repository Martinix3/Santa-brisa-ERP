// src/server/actions/logistics.actions.ts
'use server';
import 'server-only';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, Order, OrderSellOut, StockMove, Lot, Item, Account, OnHand } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { checkOrderStock, type AllocationDetail, type StockShortageDetail } from '@/lib/inventory';
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
  const order = await getOne<Order>('orders', orderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== 'ABIERTO') throw new Error('Order must be in "ABIERTO" status to confirm.');

  // 1. ALL READS FIRST - Fetch all necessary data before starting the transaction.
  const [onHandSnap, lotsSnap, itemsSnap, account, shipmentsSnap] = await Promise.all([
    db.collection('onHand').get(),
    db.collection('lots').get(),
    db.collection('items').get(),
    getOne<Account>('accounts', order.accountId),
    db.collection('shipments').select('shipmentNumber').get(),
  ]);

  if (!account) throw new Error(`Account ${order.accountId} not found.`);

  const onHand = onHandSnap.docs.map(doc => doc.data() as OnHand);
  const lots = lotsSnap.docs.map(doc => doc.data() as Lot);
  const itemsById = new Map(itemsSnap.docs.map(d => {
    const item = d.data() as Item;
    return [item.sku || d.id, item];
  }));
  
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

  if (!allocations.length && order.items.length > 0) {
    const itemIds = order.items.map((l: any) => l.sku);
    const byItem = Object.fromEntries(itemIds.map((id: string) => {
        const rows = onHand.filter(r => r.sku === id);
      const freeReleased = rows
        .map(r => ({
          qc: String(r.qcStatus ?? '').toUpperCase(),
          qty: Number(r.qty ?? 0),
          res: Number(r.reserved ?? 0),
          free: Math.max(0, Number(r.qty ?? 0) - Number(r.reserved ?? 0)),
          lot: r.lotNumbers ? Object.keys(r.lotNumbers)[0] : '',
          loc: r.warehouseId
        }))
        .filter(r =>
          ['PASSED','WAIVED','RELEASED','OK','APPROVED'].includes(r.qc) && r.free > 0
        );
      return [id, {
        need: order.items.find((l: any) => l.sku === id)?.qty,
        rows: rows.length,
        totalQty: rows.reduce((s, r) => s + Number(r.qty ?? 0), 0),
        totalReserved: rows.reduce((s, r) => s + Number(r.reserved ?? 0), 0),
        totalFreeReleased: freeReleased.reduce((s, r) => s + r.free, 0),
        sampleReleased: freeReleased.slice(0,3),
        sampleAny: rows.slice(0,3).map(r => ({
          qc: String(r.qcStatus ?? '').toUpperCase(),
          qty: Number(r.qty ?? 0),
          res: Number(r.reserved ?? 0),
          lot: r.lotNumbers ? Object.keys(r.lotNumbers)[0] : '', loc: r.warehouseId
        }))
      }];
    }));

    console.warn('[ALLOC DEBUG]', {
      orderId: order.id,
      items: order.items,
      onHandCount: onHand.length,
      lotsCount: lots.length,
      byItem,
      shortages,
    });

    const msg = shortages.length
      ? shortages.map((s: StockShortageDetail) =>
          `• ${itemsById.get(s.sku)?.name ?? s.sku}: necesita ${s.qtyRequired}, ` +
          `liberado ${s.qtyAvailable}, falta ${s.qtyShort}` +
          (s.qtyOnHold > 0 ? ` (en HOLD ${s.qtyOnHold})` : '')
        ).join('\n')
      : 'No hay stock liberado ni lotes válidos para asignar (QC o reservas).';
    throw new Error(`No se han podido calcular reservas.\n${msg}`);
  }

  const missingLots = allocations.filter((a: AllocationDetail) => !a.lotNumber);
  if (missingLots.length) {
    const ids = [...new Set(missingLots.map((a: AllocationDetail) => a.sku))].join(', ');
    throw new Error(`Faltan lotes en la asignación para: ${ids}.`);
  }

  const allShipmentNumbers = shipmentsSnap.docs.map(d => String(d.id)).filter(Boolean);
  const shipmentCode = makeShipmentCode(allShipmentNumbers, new Date());
  
  const shipmentRef = db.collection('shipments').doc();
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const now = new Date().toISOString();
  let newShipment: Shipment;

  await db.runTransaction(async (transaction) => {
    for (const alloc of allocations as AllocationDetail[]) {
      const onHandId = makeOnHandId(alloc.sku, alloc.lotNumber || '', alloc.locationId || '');
      const onHandRef = db.collection('onHand').doc(onHandId);
      transaction.set(onHandRef, {
        sku: alloc.sku,
        warehouseId: alloc.locationId || '',
        reserved: FieldValue.increment(alloc.qty),
        qty: FieldValue.increment(0),
        uom: 'UNIT',
        updatedAt: now,
      }, { merge: true });
    }

    transaction.update(orderRef, { status: 'confirmed', updatedAt: now });

    const isOnlineOrPrivate = account.type === 'ONLINE' || account.type === 'PRIVADA';
    const totalUnits = order.items.reduce((sum: number, line: any) => sum + line.qty, 0);
    const mode: 'PARCEL' | 'PALLET' = isOnlineOrPrivate || totalUnits < 12 ? 'PARCEL' : 'PALLET';

    // Group allocations by item
    const allocByItem = (allocations as AllocationDetail[]).reduce<Record<string, AllocationDetail[]>>((acc, a) => {
        (acc[a.sku] ||= []).push(a); return acc;
    }, {});
    
    newShipment = {
        id: shipmentRef.id,
        orderId: order.id,
        status: 'DRAFT',
        fromWarehouseId: 'MAIN',
        toAddress: {
          street: account.billingAddress?.street || '',
          city: account.billingAddress?.city || '',
          postalCode: account.billingAddress?.postalCode || '',
          country: account.billingAddress?.country || 'España',
        },
        lines: order.items.flatMap(line => {
            const allocs = allocByItem[line.sku] || [];
            if (!allocs.length) {
              return [{
                sku: line.sku,
                name: itemsById.get(line.sku)?.name ?? line.sku,
                qty: line.qty,
                uom: 'UNIT',
                lotNumber: undefined,
                locationId: undefined,
                note: 'SIN ALLOC (revisar)'
              } as any];
            }
            return allocs.map((a: AllocationDetail) => ({
              sku: line.sku,
              name: itemsById.get(line.sku)?.name ?? line.sku,
              qty: a.qty,
              uom: 'UNIT',
              lotNumber: a.lotNumber,
              locationId: a.locationId,
            }));
        }),
        createdAt: now,
        updatedAt: now,
    } as any;
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
      status: 'READY',
      updatedAt: now,
      validatedById: userId,
      validatedAt: now,
      validationNotes: notes ?? null,
      lines: lots?.length
        ? lots.map((l) => ({ sku: l.itemId, qty: l.qty, uom: 'UNIT' as const, lotNumber: l.lotNumber }))
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
    status: 'SHIPPED',
    shippedAt: now,
    updatedAt: now,
    trackingCode: trackingCode ?? shp.trackingCode ?? null,
    labelUrl: labelUrl ?? shp.labelUrl ?? null,
  } as any]);

  if (shp.orderId) {
    await upsertMany<OrderSellOut>('ordersSellOut', [{ id: shp.orderId, status: 'SHIPPED', updatedAt: now } as any]);
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
