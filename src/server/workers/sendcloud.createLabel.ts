// src/server/workers/sendcloud.createLabel.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

type SendcloudRes = { labelUrl: string; trackingCode: string; trackingUrl?: string };

async function callSendcloudCreateLabel(s: any): Promise<SendcloudRes> {
  // TODO: implementa llamada real a Sendcloud. Por ahora, stub:
  const tracking = `SC-${Math.floor(Math.random()*1e8).toString().padStart(8,'0')}`;
  return {
    labelUrl: `https://example.com/labels/${tracking}.pdf`,
    trackingCode: tracking,
    trackingUrl: `https://tracking.sendcloud.sc/${tracking}`
  };
}

export async function handleCreateSendcloudLabel({ shipmentId }: { shipmentId: string }) {
  const sRef = adminDb.collection('shipments').doc(shipmentId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) throw new Error('Shipment not found');
  const s = sSnap.data()!;

  if (!s.deliveryNoteId) throw new Error('Requiere albarán antes de crear etiqueta');
  if (!s.weightKg || !s.dimsCm) throw new Error('Peso y dimensiones requeridos');
  // idempotencia: si ya hay label/track, salimos
  if (s.labelUrl && s.trackingCode) return;

  const res = await callSendcloudCreateLabel(s);

  await sRef.set({
    labelUrl: res.labelUrl,
    trackingCode: res.trackingCode,
    trackingUrl: res.trackingUrl,
    updatedAt: Timestamp.now()
  }, { merge: true });

  // Política opcional: marcar enviado al tener etiqueta
  // await sRef.set({ status: 'shipped' as const, updatedAt: serverTimestamp() }, { merge: true });
}
