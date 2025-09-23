




'use server';
import { revalidatePath } from 'next/cache';
import { getServerData } from '@/lib/dataprovider/server';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party, FinanceLink, PaymentLink } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';


const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

export async function updateOrderStatus(
  order: OrderSellOut,
  account: Account,
  party: Party,
  newStatus: OrderStatus
): Promise<{ ok: boolean; order: { id: string, status: OrderStatus }; shipment: Shipment | null; error?: string }> {
  
  console.log(`[ACTION] Iniciando updateOrderStatus para order ${order.id} con nuevo estado ${newStatus}`);

  try {
    // 1. Actualizar siempre el estado del pedido
    await upsertMany('ordersSellOut', [{ id: order.id, status: newStatus, billingStatus: newStatus === 'confirmed' ? 'INVOICING' : order.billingStatus, updatedAt: new Date().toISOString() }]);
    console.log(`[ACTION] Pedido ${order.id} actualizado a estado ${newStatus} en la base de datos.`);

    // Si el pedido se confirma, encolar la creación de la factura en Holded
    if (newStatus === 'confirmed') {
        await enqueue({
            kind: 'CREATE_HOLDED_INVOICE',
            payload: { orderId: order.id },
            correlationId: `order-${order.id}-invoice`,
        });
        console.log(`[ACTION] Encolado job CREATE_HOLDED_INVOICE para el pedido ${order.id}`);
        
        // También encolar la creación del envío
        await enqueue({
            kind: 'CREATE_SHIPMENT_FROM_ORDER',
            payload: { orderId: order.id },
            correlationId: `order-${order.id}-shipment`,
        });
        console.log(`[ACTION] Encolado job CREATE_SHIPMENT_FROM_ORDER para el pedido ${order.id}`);

    }
    
    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    
    // El worker crea el envío, por lo que aquí devolvemos null
    return { ok: true, order: { id: order.id, status: newStatus }, shipment: null };

  } catch (err: any) {
    console.error(`[ACTION] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, order: {id: order.id, status: newStatus}, shipment: null, error: err.message };
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
  const data = await getServerData();
  const order = data.ordersSellOut.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  const amount = (order.lines || []).reduce((a,l) => {
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
     currency: order.currency ?? 'EUR',
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
