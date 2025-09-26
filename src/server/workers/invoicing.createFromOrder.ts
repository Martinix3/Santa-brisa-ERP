// src/server/workers/invoicing.createFromOrder.ts
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function run({ orderId }: { orderId:string }) {
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return;

  const order = orderSnap.data()!;
  // Generar nº factura, totales, etc. (mock):
  const invoiceRef = db.collection('invoices').doc();
  const invoice = {
    id: invoiceRef.id,
    orderId,
    accountId: order.accountId,
    date: new Date().toISOString(),
    lines: order.lines || [],
    currency: order.currency || 'EUR',
    totalAmount: order.totalAmount ?? (order.lines || []).reduce((n: number, l: any) => n + (l.qty*l.priceUnit||0), 0),
    status: 'issued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await invoiceRef.set(invoice);

  // Marca pedido como 'invoiced' (y opcional: billingStatus)
  await orderRef.update({
    status: 'invoiced',
    billingStatus: 'INVOICED', 
    invoiceId: invoice.id,
    updatedAt: new Date().toISOString(),
  });

  // Propaga a shipments del pedido (si quieres enlazar):
  const shps = await db.collection('shipments').where('orderId','==',orderId).get();
  const batch = db.batch();
  shps.docs.forEach(d => {
    batch.update(d.ref, { invoiceId: invoice.id, updatedAt: Timestamp.now() });
  });
  await batch.commit();

  console.log(`[Worker] Invoice ${invoice.id} created for order ${orderId}`);
}
