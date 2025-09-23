'use server';
import { revalidatePath } from 'next/cache';
import { enqueue } from '@/server/queue/queue';
import { getServerData } from '@/lib/dataprovider/server';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { Shipment, OrderSellOut } from '@/domain/ssot';

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
    const data = await getServerData();
    const shp = data.shipments.find(s => s.id === shipmentId);
    if (!shp) throw new Error('Shipment not found');

    await upsertMany('shipments', [{
        id: shipmentId,
        status: 'ready_to_ship',
        updatedAt: now,
        checks: { ...(shp.checks || {}), visualOk: true },
        // validatedById: userId, // Assuming you add this to your SSOT
        notes: notes ?? shp.notes,
        lines: lots ? lots.map(l => ({ sku: l.sku, qty: l.qty, uom: 'uds' as const, name: l.sku, lotNumber: l.lotNumber })) : shp.lines,
    }]);

    if (shp.orderId) {
        await upsertMany('ordersSellOut', [{
            id: shp.orderId,
            status: 'confirmed',
            updatedAt: now,
        }]);
    }
    revalidatePath('/warehouse/logistics');
    if (shp.orderId) revalidatePath('/sales/orders');
    return { ok: true, shipmentId, orderId: shp.orderId ?? null };
}

type MarkShippedInput = { shipmentId: string; trackingCode?: string; labelUrl?: string };
export async function markShipped({ shipmentId, trackingCode, labelUrl }: MarkShippedInput) {
    const data = await getServerData();
    const shp = data.shipments.find(s => s.id === shipmentId);
    if (!shp) throw new Error('Shipment not found');
    const now = new Date().toISOString();

    await upsertMany('shipments', [{
        id: shipmentId,
        status: 'shipped',
        trackingCode: trackingCode ?? shp.trackingCode,
        labelUrl: labelUrl ?? shp.labelUrl,
        updatedAt: now,
    }]);

    if (shp.orderId) {
        await upsertMany('ordersSellOut', [{ id: shp.orderId, status: 'shipped', updatedAt: now }]);
    }
    revalidatePath('/warehouse/logistics');
    if (shp.orderId) revalidatePath('/sales/orders');
    return { ok: true };
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
