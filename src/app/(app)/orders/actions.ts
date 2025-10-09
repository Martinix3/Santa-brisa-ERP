// src/app/(app)/orders/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { Order, Shipment, Account, Item, OrderLine, OrderStatus, OrderDocumentType } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';
import { confirmOrderShipment as confirmAndReserve } from '@/server/actions/logistics.actions';
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
  const ref = db.collection("orders").doc();
  
  const account = await getOne<Account>('accounts', accountId);

  // Map incoming lines to OrderLine structure
  const itemsSnap = await db.collection('items').where('sku', 'in', lines.map(l => l.sku)).get();
  const itemsBySku = new Map(itemsSnap.docs.map(doc => [doc.data().sku, doc.data() as Item]));

  const orderLines: OrderLine[] = lines.map(l => {
    const item = itemsBySku.get(l.sku);
    if (!item) throw new Error(`El producto con SKU ${l.sku} no existe.`);
    return {
      sku: l.sku,
      name: item.name,
      qty: l.qty,
      uom: 'UNIT',
      unitPrice: l.unitPriceReported ?? item.price ?? 0,
      total: l.qty * (l.unitPriceReported ?? item.price ?? 0),
    };
  });

  const total = orderLines.reduce((sum, line) => sum + (line.total ?? 0), 0);

  const payload: Partial<Order> = {
    id: ref.id,
    accountId,
    distributorId: distributorId || account?.distributorId || SANTA_BRISA_DISTRIB_ID,
    channel: 'DIRECTA',
    source: 'Manual',
    documentType: 'SALESORDER',
    date: now,
    status: 'ABIERTO',
    currency: 'EUR',
    total,
    items: orderLines,
    createdAt: now,
    updatedAt: now,
    createdBy: createdById,
  };
  
  await ref.set(payload as any);
  return { id: ref.id };
}


/**
 * Updates an order's status and triggers side effects like shipment creation.
 * @param order The original order document.
 * @param newStatus The desired new status for the order.
 * @returns An object indicating success, the updated order status, and any created shipment.
 */
export async function updateOrderStatus(
  order: Order,
  newStatus: OrderStatus
): Promise<{ ok: boolean; order: { id: string, status: OrderStatus }; shipment: Shipment | null; error?: string }> {
  
  console.log(`[ACTION] Iniciando updateOrderStatus para order ${order.id} con nuevo estado ${newStatus}`);

  // Si el nuevo estado es 'EN_PROCESO' Y el estado actual es 'ABIERTO', se crea el envío.
  if (newStatus === 'EN_PROCESO' && order.status === 'ABIERTO') {
    try {
      const shipment = await confirmAndReserve(order.id);
      return { ok: true, order: { id: order.id, status: 'EN_PROCESO' }, shipment };
    } catch (e: any) {
      console.error(`[ACTION] ERROR CRÍTICO en confirmOrderShipment para el pedido ${order.id}:`, e);
      // Devuelve el estado original del pedido si la confirmación falla.
      return { ok: false, order: { id: order.id, status: order.status }, shipment: null, error: e.message };
    }
  }

  // Para cualquier otro cambio de estado.
  try {
    await upsertMany('orders', [{ id: order.id, status: newStatus, updatedAt: new Date().toISOString() }]);
    revalidatePath('/orders');
    return { ok: true, order: { id: order.id, status: newStatus }, shipment: null };

  } catch (err: any) {
    console.error(`[ACTION] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, order: {id: order.id, status: order.status}, shipment: null, error: err.message };
  }
}

export async function importShopifyOrder(orderId: string): Promise<Order> {
  if (!orderId) throw new Error('Falta orderId');
  if (!process.env.INTEGRATIONS_API_KEY) {
      throw new Error('INTEGRATIONS_API_KEY no configurada en el servidor.');
  }

  try {
    const saved = await importSingleShopifyOrder(orderId);
    revalidatePath('/orders');
    return saved as unknown as Order;
  } catch (e: any) {
    console.error(`Error en la server action importShopifyOrder: ${e.message}`);
    throw e;
  }
}

export async function createSalesInvoice({ orderId }: { orderId:string }) {
  const order = await getOne<Order>('orders', orderId);
  if (!order) throw new Error('Order not found');
  
  const amount = (order.items || []).reduce((a: number, l: OrderLine) => {
     const unit = l.unitPrice ?? 0;
     const disc = (l.discountPct ?? 0) / 100;
     return a + l.qty * unit * (1 - disc);
  }, 0);

  const now = new Date().toISOString();
  
  // Create invoice as a new Order document with type INVOICE
  const invoiceRef = db.collection("orders").doc();
  const invoice: Partial<Order> = {
    id: invoiceRef.id,
    accountId: order.accountId,
    distributorId: order.distributorId,
    channel: order.channel,
    source: 'Manual',
    documentType: 'INVOICE',
    date: now,
    status: 'FACTURADO',
    currency: 'EUR',
    total: amount,
    items: order.items,
    createdAt: now,
    updatedAt: now,
    createdBy: order.createdBy,
  };

  await invoiceRef.set(invoice as any);
  
  // Update original order status
  await upsertMany('orders', [{
     id: orderId,
     status: 'FACTURADO' as OrderStatus,
     updatedAt: now,
  }]);

  revalidatePath('/orders');
  return { ok:true, invoiceId: invoiceRef.id };
}

export async function recordPayment({ orderId, amount, date, method }: {
  orderId: string; amount: number; date?: string; method?: string;
}) {
  const now = new Date().toISOString();
  
  // Update order to PAGADO status
  await upsertMany('orders', [{
    id: orderId,
    status: 'PAGADO' as OrderStatus,
    updatedAt: now,
  }]);
  
  revalidatePath('/orders');
  return { ok:true };
}
