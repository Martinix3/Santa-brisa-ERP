
// src/app/(app)/orders/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party, FinanceLink, PaymentLink, OnHandView } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';
import { confirmOrderShipment as confirmAndReserve } from '../warehouse/logistics/actions';


const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

/**
 * @deprecated This function is deprecated. Use confirmOrderShipment from logistics/actions.ts to atomically reserve stock.
 */
export async function updateOrderStatus(
  order: OrderSellOut,
  account: Account,
  party: Party,
  newStatus: OrderStatus
): Promise<{ ok: boolean; order: { id: string, status: OrderStatus }; shipment: Shipment | null; error?: string }> {
  
  console.log(`[ACTION] Iniciando updateOrderStatus para order ${order.id} con nuevo estado ${newStatus}`);

  if (newStatus === 'confirmed') {
    try {
      const shipment = await confirmAndReserve(order.id);
      return { ok: true, order: { id: order.id, status: 'confirmed' }, shipment };
    } catch (e: any) {
      console.error(`[ACTION] ERROR CRÍTICO en confirmOrderShipment para el pedido ${order.id}:`, e);
      return { ok: false, order: { id: order.id, status: order.status }, shipment: null, error: e.message };
    }
  }

  try {
    // For other statuses, just update the order
    await upsertMany('ordersSellOut', [{ id: order.id, status: newStatus, updatedAt: new Date().toISOString() }]);
    
    revalidatePath('/orders');
    
    return { ok: true, order: { id: order.id, status: newStatus }, shipment: null };

  } catch (err: any) {
    console.error(`[ACTION] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, order: {id: order.id, status: order.status}, shipment: null, error: err.message };
  }
}

export async function importShopifyOrder(orderId: string): Promise<OrderSellOut> {
  if (!orderId) throw new Error('Falta orderId');
  if (!process.env.INTEGRATIONS_API_KEY) {
      throw new Error('INTEGRATIONS_API_KEY no configurada en el servidor.');
  }

  try {
    const saved = await importSingleShopifyOrder(orderId);
    revalidatePath('/orders');
    return saved;
  } catch (e: any) {
    console.error(`Error en la server action importShopifyOrder: ${e.message}`);
    throw e; // Lanza el error para que el cliente lo reciba
  }
}

export async function createSalesInvoice({ orderId }: { orderId:string }) {
  const order = await getOne<OrderSellOut>('ordersSellOut', orderId);
  if (!order) throw new Error('Order not found');
  const amount = (order.lines || []).reduce((a: number, l: OrderSellOut['lines'][number]) => {
     const unit = l.priceUnit ?? 0;
     const disc = (l.discountPct ?? 0) / 100;
     return a + l.qty * unit * (1 - disc);
  }, 0);

  const now = new Date().toISOString();
  const fin: FinanceLink = {
     id: `INV-${now.slice(0,10)}-${Math.floor(Math.random()*99999)}`,
     docType: 'SALES_INVOICE',
     externalId: '', // si sincronizas con Holded, rellena después
     status: 'pending',
     netAmount: amount,
     taxAmount: 0,
     grossAmount: amount,
     currency: 'EUR' as const,
     issueDate: now,
     dueDate: now,
     docNumber: undefined,
     partyId: order.partyId,
     costObject: { kind: 'ORDER', id: orderId },
  };

  await upsertMany('financeLinks', [fin] as any);
  await upsertMany('ordersSellOut', [{
     id: orderId,
     status: 'invoiced',
     billingStatus: 'INVOICED',
     updatedAt: now,
  }]);

  revalidatePath('/orders');
  revalidatePath('/finance');
  return { ok:true, financeLinkId: fin.id };
}

export async function recordPayment({ financeLinkId, amount, date, method }: {
  financeLinkId: string; amount: number; date?: string; method?: string;
}) {
  const now = new Date().toISOString();
  const pay: PaymentLink = {
    id: `PAY-${now}-${Math.floor(Math.random()*1e6)}`,
    financeLinkId,
    externalId: undefined,
    amount,
    date: date ?? now,
    method: method ?? 'transfer',
  };
  await upsertMany('paymentLinks', [pay] as any);
  revalidatePath('/finance');
  return { ok:true, paymentId: pay.id };
}
