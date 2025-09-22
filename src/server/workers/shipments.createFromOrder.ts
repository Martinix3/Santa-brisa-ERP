// src/server/workers/shipments.createFromOrder.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { OrderSellOut, Party, Shipment } from '@/domain/ssot';

export async function handleCreateShipmentFromOrder({ orderId }: { orderId: string }) {
  const oRef = adminDb.collection('ordersSellOut').doc(orderId);
  const oSnap = await oRef.get();
  if (!oSnap.exists) throw new Error(`Order ${orderId} not found`);
  const order = oSnap.data() as OrderSellOut;

  // idempotencia: ¿ya hay un envío para este pedido?
  const existing = await adminDb.collection('shipments').where('orderId', '==', orderId).limit(1).get();
  if (!existing.empty) return; // ya existe

  // heurística de modo: SHOPIFY → PARCEL, resto PALLET (ajústalo si quieres)
  const mode: 'PARCEL'|'PALLET' = order.source === 'SHOPIFY' ? 'PARCEL' : 'PALLET';

  const party = (await adminDb.collection('parties').doc(order.partyId).get()).data() as Party | undefined;

  const shipment: Shipment = {
    id: `shp_${Date.now()}`,
    orderId,
    partyId: order.partyId,
    mode,
    status: 'pending',
    lines: (order.lines || []).map(l => ({ sku: l.sku, name: l.name, qty: l.qty, uom: 'uds' })),
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
    customerName: party?.tradeName || party?.legalName || 'Cliente',
    city: party?.shippingAddress?.city || party?.billingAddress?.city || '',
    accountId: order.accountId, // for compatibility
  };

  await adminDb.collection('shipments').doc(shipment.id).set(shipment);
}
