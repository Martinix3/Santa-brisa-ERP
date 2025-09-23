
'use server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { revalidatePath } from 'next/cache';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Shipment, OrderSellOut } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';


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
 * Enqueues a job to create a shipment from an existing order.
 */
export async function createShipmentFromOrder(orderId: string) {
  await enqueue({ kind:'CREATE_SHIPMENT_FROM_ORDER', payload:{ orderId }, maxAttempts:3 });
  console.log(`[Action] Enqueued job to create shipment for order ${orderId}.`);
  return { ok:true };
}

type ValidateShipmentInput = {
  shipmentId: string;
  userId: string;
  notes?: string;
  lots?: Array<{ sku: string; lotNumber?: string; qty: number }>;
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
        ? lots.map((l) => ({ sku: l.sku, qty: l.qty, uom: 'uds' as const, lotNumber: l.lotNumber }))
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

// alias por compatibilidad con imports antiguos
export const markShipped = markShipmentShipped;


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
