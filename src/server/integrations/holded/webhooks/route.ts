import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { FinanceLink, PaymentLink, OrderSellOut } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook para notificaciones de Holded
 * Eventos: invoice.paid, invoice.updated, etc.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return new Response('Bad Request', { status: 400 });

  console.log('[Holded Webhook] Received:', body.type, body.docType, body.id);

  const { type, docType, id, serialNumber, status, total, payments = [], meta } = body;
  const isInvoice = (docType || '').toLowerCase().includes('invoice');
  if (!isInvoice) {
    console.log('[Holded Webhook] Ignoring non-invoice event');
    return new Response('Ignored', { status: 200 });
  }

  const now = new Date().toISOString();
  const financeLinkId = `holded-${id}`;

  // 1. Crear/actualizar FinanceLink
  const fin: Partial<FinanceLink> = {
    id: financeLinkId,
    docType: 'SALES_INVOICE',
    externalId: id,
    netAmount: Number(total) || 0,
    taxAmount: 0,
    grossAmount: Number(total) || 0,
    currency: 'EUR',
    issueDate: now,
    dueDate: now,
    docNumber: serialNumber,
    partyId: undefined,
    costObject: meta?.orderId ? { kind: 'ORDER', id: meta.orderId } : undefined,
    status: status === 'paid' ? 'paid' : 'DRAFT',
  };

  await upsertMany('financeLinks', [fin] as any);

  // 2. Persistir pagos individuales
  const payDocs: Partial<PaymentLink>[] = (payments || []).map((p: any) => ({
    id: `holded-${p.id}`,
    externalId: p.id,
    financeLinkId: financeLinkId,
    amount: p.amount,
    date: p.date ?? now,
    method: p.method ?? 'transfer',
  }));
  if (payDocs.length) {
    await upsertMany('paymentLinks', payDocs as any);
  }

  // 3. Actualizar Order si la factura está pagada
  if (status === 'paid') {
    try {
      // Buscar Order por holdedInvoiceId
      const ordersSnap = await db.collection('ordersSellOut')
        .where('external.holdedInvoiceId', '==', id)
        .limit(1)
        .get();

      if (!ordersSnap.empty) {
        const orderDoc = ordersSnap.docs[0];
        await orderDoc.ref.update({
          billingStatus: 'paid',
          paidAt: now,
          updatedAt: Timestamp.now().toDate().toISOString(),
        });
        
        console.log(`[Holded Webhook] Order ${orderDoc.id} marked as paid`);
      } else {
        console.warn(`[Holded Webhook] No order found with holdedInvoiceId: ${id}`);
      }
    } catch (error) {
      console.error('[Holded Webhook] Error updating order:', error);
    }
  }

  return new Response('OK', { status: 200 });
}
