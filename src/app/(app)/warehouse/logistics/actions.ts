'use server';
import { enqueue } from '@/server/queue/queue';

export async function createShipmentFromOrder(orderId: string) {
  await enqueue({ kind:'CREATE_SHIPMENT_FROM_ORDER', payload:{ orderId }, maxAttempts:3 });
  return { ok:true };
}

export async function validateShipment(shipmentId: string, payload: {
  visualOk: boolean;
  carrier?: string;
  weightKg?: number;
  dimsCm?: { l:number; w:number; h:number };
  lotMap?: Record<string, { lotId:string; qty:number }[]>;
}) {
  await enqueue({ kind:'VALIDATE_SHIPMENT', payload:{ shipmentId, ...payload }, maxAttempts:3 });
  return { ok:true };
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
