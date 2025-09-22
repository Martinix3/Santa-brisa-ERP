

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
