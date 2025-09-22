
'use server';
import { enqueue } from '@/server/queue/queue';
import { adminDb } from '@/server/firebaseAdmin';
import type { Shipment } from '@/domain/ssot';

/**
 * Creates a shipment document directly in Firestore from manual input.
 * This is for shipments not originating from an existing order.
 */
export async function createManualShipment(payload: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>) {
    const shipmentRef = adminDb.collection('shipments').doc();
    const newShipment: Shipment = {
        ...payload,
        id: shipmentRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await shipmentRef.set(newShipment);
    console.log(`[Action] Manual shipment ${shipmentRef.id} created directly.`);
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
 * Validates a shipment by writing the validation data directly and then
 * enqueuing any subsequent jobs (like label generation).
 */
export async function validateShipment(shipmentId: string, payload: {
  visualOk: boolean;
  carrier?: string;
  weightKg?: number;
  dimsCm?: { l:number; w:number; h:number };
  lotMap?: Record<string, { lotId:string; qty:number }[]>;
}) {
  const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
  const shipmentSnap = await shipmentRef.get();
  if (!shipmentSnap.exists) {
      throw new Error(`Shipment ${shipmentId} not found.`);
  }
  const shipment = shipmentSnap.data() as Shipment;

  const updatedLines = [...shipment.lines];
  if (payload.lotMap) {
      for (const line of updatedLines) {
          const lotsForSku = payload.lotMap[line.sku];
          if (lotsForSku && lotsForSku.length > 0) {
              line.lotNumber = lotsForSku[0].lotId;
          }
      }
  }

  const patch: Partial<Shipment> = {
      checks: { ...shipment.checks, visualOk: payload.visualOk },
      carrier: payload.carrier || shipment.carrier,
      weightKg: payload.weightKg || shipment.weightKg,
      dimsCm: payload.dimsCm || shipment.dimsCm,
      lines: updatedLines,
      updatedAt: new Date().toISOString(),
  };

  if (payload.visualOk) {
      patch.status = 'ready_to_ship';
  }

  await shipmentRef.update(patch as any);

  // You could enqueue subsequent jobs here if needed
  // await enqueue({ kind: '...', payload: { shipmentId }});
  
  console.log(`[Action] Shipment ${shipmentId} validated directly. New status: ${patch.status}`);
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
