// src/server/workers/shipments.validate.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

type Payload = {
  shipmentId: string;
  visualOk: boolean;
  carrier?: string;
  weightKg?: number;
  dimsCm?: { l:number; w:number; h:number };
  lotMap?: Record<string, { lotId: string; qty: number }[]>;
};

export async function handleValidateShipment(p: Payload) {
  const sRef = adminDb.collection('shipments').doc(p.shipmentId);
  const sSnap = await sRef.get();
  if (!sSnap.exists) throw new Error('Shipment not found');
  const s = sSnap.data()!;

  // Validación de lotes (si se usa): sum(lotes) == qty
  if (p.lotMap) {
    for (const line of s.lines || []) {
      const lots = p.lotMap[line.sku] || [];
      const sum = lots.reduce((acc, r) => acc + Number(r.qty || 0), 0);
      if (sum !== Number(line.qty)) {
        throw new Error(`Lotes para SKU ${line.sku}: ${sum} != ${line.qty}`);
      }
    }
  }

  const update: any = {
    checks: { ...(s.checks||{}), visualOk: !!p.visualOk },
    carrier: p.carrier ?? s.carrier,
    weightKg: p.weightKg ?? s.weightKg,
    dimsCm: p.dimsCm ?? s.dimsCm,
    updatedAt: Timestamp.now(),
  };

  // Solo pasamos a ready_to_ship si Visual OK es true
  if (p.visualOk) update.status = 'ready_to_ship';

  await sRef.set(update, { merge: true });
}
