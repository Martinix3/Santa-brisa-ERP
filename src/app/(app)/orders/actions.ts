
// src/app/(app)/orders/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party, FinanceLink, PaymentLink, OnHandView } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';
import { confirmOrderShipment as confirmAndReserve } from '../warehouse/logistics/actions';
import { adminDb as db } from "@/server/firebase";
import { getUserRole } from "@/server/auth";
import { SANTA_BRISA_DISTRIB_ID, canPlaceOrder } from "@/lib/authz";


export async function placeOrder({
  accountId, distributorId, lines, createdById,
}:{
  accountId: string;
  distributorId?: string;
  lines: { sku:string; qty:number; unitPriceReported?:number }[];
  createdById: string;
}) {
  const role = await getUserRole(createdById);
  if (!canPlaceOrder(role)) throw new Error("No autorizado");
  if (!accountId) throw new Error("Cuenta requerida");
  if (!lines?.length) throw new Error("Añade al menos una línea");

  const now = new Date().toISOString();
  const ref = db.collection("ordersSellOut").doc();
  const payload = {
    id: ref.id,
    accountId,
    distributorId: distributorId || SANTA_BRISA_DISTRIB_ID,
    isSellOutReported: true,
    status: "open",
    lines,
    createdById,
    createdAt: now,
    updatedAt: now,
    flow: 'PLACEMENT',
  };
  await ref.set(payload);
  return { id: ref.id };
}


const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

/**
 * Updates an order's status and triggers side effects like shipment creation.
 * @param order The original order document.
 * @param newStatus The desired new status for the order.
 * @returns An object indicating success, the updated order status, and any created shipment.
 */
export async function updateOrderStatus(
  order: OrderSellOut,
  newStatus: OrderStatus
): Promise<{ ok: boolean; order: { id: string, status: OrderStatus }; shipment: Shipment | null; error?: string }> {
  
  console.log(`[ACTION] Iniciando updateOrderStatus para order ${order.id} con nuevo estado ${newStatus}`);

  // Si el nuevo estado es 'confirmed' Y el estado actual NO es 'confirmed', se crea el envío.
  if (newStatus === 'confirmed' && order.status !== 'confirmed') {
    try {
      const shipment = await confirmAndReserve(order.id);
      return { ok: true, order: { id: order.id, status: 'confirmed' }, shipment };
    } catch (e: any) {
      console.error(`[ACTION] ERROR CRÍTICO en confirmOrderShipment para el pedido ${order.id}:`, e);
      // Devuelve el estado original del pedido si la confirmación falla.
      return { ok: false, order: { id: order.id, status: order.status }, shipment: null, error: e.message };
    }
  }

  // Para cualquier otro cambio de estado que no sea la confirmación inicial.
  try {
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
     const disc = (l as any).discountPct ?? 0 / 100;
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
     partyId: (order as any).partyId,
     costObject: { kind: 'ORDER', id: orderId },
  };

  await upsertMany('financeLinks', [fin] as any);
  await upsertMany('ordersSellOut', [{
     id: orderId,
     status: 'invoiced',
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
