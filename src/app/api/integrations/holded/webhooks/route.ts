import { NextRequest, NextResponse } from 'next/server';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { FinanceLink, PaymentLink, OrderSellOut } from '@/domain/ssot';

// Ajusta si añades verificación de firma
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return new Response('Bad Request', { status: 400 });

  // Ejemplos de notificación (adapta al payload real de Holded):
  // { type:'document.updated', docType:'invoice', id:'INV123', serialNumber:'F-2025-001', status:'paid', contactId:'...', total: 1210, paid: 1210, due: 0, payments:[{ id:'PAY456', amount:1210, date:'2025-09-23', method:'transfer' }], meta:{ orderId:'...' } }

  const { type, docType, id, serialNumber, status, total, payments = [], meta } = body;
  const isInvoice = (docType || '').toLowerCase().includes('invoice');
  if (!isInvoice) return new Response('Ignored', { status: 200 });

  const now = new Date().toISOString();
  const financeLinkId = `holded-${id}`;

  const fin: FinanceLink = {
    id: financeLinkId,
    docType: 'SALES_INVOICE',
    externalId: id,
    status: status === 'paid' ? 'paid' : 'pending',
    netAmount: Number(total) || 0,
    taxAmount: 0, // ajusta si recibes el desglose
    grossAmount: Number(total) || 0,
    currency: 'EUR',
    issueDate: now,
    dueDate: now,
    docNumber: serialNumber,
    partyId: undefined,
    costObject: meta?.orderId ? { kind: 'ORDER', id: meta.orderId } : undefined,
  };

  await upsertMany('financeLinks', [fin] as any);

  // Persistimos pagos individuales
  const payDocs: PaymentLink[] = (payments || []).map((p: any) => ({
    id: `holded-${p.id}`,
    financeLinkId,
    externalId: p.id,
    amount: Number(p.amount),
    date: p.date ?? now,
    method: p.method ?? 'transfer',
  }));
  if (payDocs.length) await upsertMany('paymentLinks', payDocs as any);

  // Si la factura referencia un pedido, marca como PAID
  if (meta?.orderId && status === 'paid') {
    await upsertMany('ordersSellOut', [{
      id: meta.orderId,
      status: 'paid',
      billingStatus: 'PAID',
      updatedAt: now,
    }]);
  }

  return new Response('OK', { status: 200 });
}
