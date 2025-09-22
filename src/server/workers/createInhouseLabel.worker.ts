// src/server/workers/createInhouseLabel.worker.ts
'use server';
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
// import { renderPalletLabelPdf } from '@/server/pdf/palletLabel'; // si generas un PDF propio

export async function run({ shipmentId }: { shipmentId: string }) {
  const ref = adminDb.collection('shipments').doc(shipmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Shipment not found');
  const s = snap.data()!;

  if (s.mode !== 'PALLET') throw new Error('Este worker es solo para envíos tipo PALLET');
  if (s.labelUrl) return; // Ya tiene etiqueta

  // const pdf = await renderPalletLabelPdf(s);
  // const labelUrl = await saveBufferToStorage(`labels/pallet/${shipmentId}.pdf`, pdf, 'application/pdf');
  const labelUrl = `https://cdn.example.com/pallet-labels/${shipmentId}.pdf`; // Mock

  await ref.update({
    labelUrl,
    updatedAt: Timestamp.now(),
  });

  console.log(`[WORKER] In-house pallet label URL set for ${shipmentId}.`);
}
