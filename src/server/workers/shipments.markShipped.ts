// src/server/workers/shipments.markShipped.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function handleMarkShipmentShipped({ shipmentId }: { shipmentId: string }) {
  const sRef = adminDb.collection('shipments').doc(shipmentId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) throw new Error('Shipment not found');
  const s = sSnap.data()!;

  // Reglas: PARCEL → trackingCode; PALLET → labelUrl (y opc bookingRef)
  if (s.mode === 'PARCEL' && !s.trackingCode) throw new Error('Falta trackingCode para marcar enviado');
  if (s.mode === 'PALLET' && !s.labelUrl) throw new Error('Falta etiqueta pallet para marcar enviado');

  if (s.status === 'shipped') return; // idempotencia

  await sRef.set({ status: 'shipped', updatedAt: Timestamp.now() }, { merge: true });
}
