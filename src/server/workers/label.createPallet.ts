// src/server/workers/label.createPallet.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { saveBufferToStorage } from '@/server/storage';
import type { Party, OrderSellOut } from '@/domain/ssot';

async function renderPalletLabel({ shipmentId, orderId, customer, qrText }:{
  shipmentId: string; orderId: string; customer: string; qrText: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([283.46, 425.2]); // A6 vertical
  const f = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('PALET', { x: 20, y: 390, size: 24, font: f, color: rgb(0,0,0) });
  page.drawText(`Shipment: ${shipmentId}`, { x: 20, y: 360, size: 12 });
  page.drawText(`Order: ${orderId}`, { x: 20, y: 340, size: 12 });
  page.drawText(customer, { x: 20, y: 320, size: 12 });

  // QR muy simple (placeholder): cuadro negro; sustitúyelo por tu generador
  page.drawRectangle({ x: 20, y: 200, width: 140, height: 140, color: rgb(0,0,0) });
  page.drawText('QR →', { x: 170, y: 270, size: 14 });
  page.drawText(qrText.slice(0,25), { x: 170, y: 250, size: 8 });
  return await pdf.save();
}

export async function handleCreateInhousePalletLabel({ shipmentId }: { shipmentId: string }) {
  const sRef = adminDb.collection('shipments').doc(shipmentId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) throw new Error('Shipment not found');
  const s = sSnap.data()!;

  if (!s.deliveryNoteId) throw new Error('Requiere albarán antes de crear etiqueta pallet');
  if (s.mode !== 'PALLET') throw new Error('Solo para envíos tipo PALLET');
  if (s.labelUrl) return; // idempotencia básica

  const order = (await adminDb.collection('ordersSellOut').doc(s.orderId).get()).data() as OrderSellOut | undefined;
  const party = (await adminDb.collection('parties').doc(s.partyId).get()).data() as Party | undefined;

  const bytes = await renderPalletLabel({
    shipmentId,
    orderId: s.orderId,
    customer: party?.tradeName || party?.legalName || 'Cliente',
    qrText: `${process.env.APP_BASE_URL ?? 'https://app.local'}/shipments/${shipmentId}`
  });

  const url = await saveBufferToStorage(`labels/pallet/${shipmentId}.pdf`, Buffer.from(bytes), 'application/pdf');
  await sRef.set({ labelUrl: url, updatedAt: Timestamp.now() }, { merge: true });
}
