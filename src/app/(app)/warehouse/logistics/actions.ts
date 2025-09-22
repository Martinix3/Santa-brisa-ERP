'use server';
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

/**
 * Enqueues a job to validate a shipment's details.
 */
export async function validateShipment(shipmentId: string, payload: {
  visualOk: boolean;
  carrier?: string;
  weightKg?: number;
  dimsCm?: { l:number; w:number; h:number };
  lotMap?: Record<string, { lotId:string; qty:number }[]>;
}) {
    await enqueue({ kind: 'VALIDATE_SHIPMENT', payload: { shipmentId, ...payload }, maxAttempts: 3 });
    console.log(`[Action] Enqueued job to validate shipment ${shipmentId}.`);
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

export async function markShipped(shipmentId: string) {
  await enqueue({ kind:'MARK_SHIPMENT_SHIPPED', payload:{ shipmentId }, maxAttempts:3 });
  return { ok:true };
}

export async function invoiceOrder(orderId: string, opts?: { force?: boolean }) {
  await enqueue({ kind:'CREATE_INVOICE_FROM_ORDER', payload:{ orderId, ...opts }, maxAttempts:5 });
  return { ok:true };
}
