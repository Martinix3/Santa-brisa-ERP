

'use server';
import { revalidatePath } from 'next/cache';
import { getServerData } from '@/lib/dataprovider/server';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';


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
  if (!process.env.INTEGRATIONS_API_KEY) throw new Error('INTEGRATIONS_API_KEY no configurada');

  // Construye URL local (funciona en dev/prod)
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const res = await fetch(`${base}/api/integrations/shopify/import-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.INTEGRATIONS_API_KEY!,
    },
    body: JSON.stringify({ orderId }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Error importando pedido ${orderId}`);
  }

  // Refresca la página de pedidos
  revalidatePath('/orders');
  return json.order as OrderSellOut;
}
