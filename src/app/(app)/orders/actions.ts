

'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';
import { enqueue } from '@/server/queue/queue';


const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

export async function updateOrderStatus(
  order: OrderSellOut,
  account: Account,
  party: Party,
  newStatus: OrderStatus
): Promise<{ ok: boolean; order: { id: string, status: OrderStatus }; shipment: Shipment | null; error?: string }> {
  
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${order.id} con nuevo estado ${newStatus}`);

  try {
    // 1. Actualizar siempre el estado del pedido
    await upsertMany('ordersSellOut', [{ id: order.id, status: newStatus, billingStatus: newStatus === 'confirmed' ? 'INVOICING' : order.billingStatus, updatedAt: new Date().toISOString() }]);
    console.log(`[CHIVATO] Pedido ${order.id} actualizado a estado ${newStatus} en la base de datos.`);

    let createdShipment: Shipment | null = null;
    
    // Si el pedido se confirma, encolar la creación de la factura en Holded
    if (newStatus === 'confirmed') {
        await enqueue({
            kind: 'CREATE_HOLDED_INVOICE',
            payload: { orderId: order.id },
            correlationId: `order-${order.id}-invoice`,
        });
        console.log(`[CHIVATO] Encolado job CREATE_HOLDED_INVOICE para el pedido ${order.id}`);
    }


    // 2. Si el nuevo estado lo requiere, crear el envío.
    if (SHIPMENT_TRIGGER_STATES.has(newStatus)) {
      console.log(`[CHIVATO] El estado '${newStatus}' dispara la creación de un envío.`);

      if (!account) throw new Error(`Cuenta ${order.accountId} no encontrada para el pedido ${order.id}.`);
      if (!party) throw new Error(`Party ${account.partyId} no encontrada para la cuenta ${account.id}.`);

      const shipmentLines = (order.lines ?? []).map(it => ({
        sku: it.sku,
        name: it.name || it.sku, // Placeholder, a real app would look this up from a products collection
        qty: it.qty,
        uom: 'uds' as const,
      }));

      if (shipmentLines.length > 0) {
        const newShipment: Shipment = {
          id: `shp_${Date.now()}`,
          orderId: order.id,
          accountId: order.accountId,
          shipmentNumber: `SHP-${order.docNumber || order.id.slice(-4)}`,
          createdAt: new Date().toISOString(),
          status: 'pending',
          lines: shipmentLines,
          customerName: account.name,
          city: party.addresses[0]?.city || '',
          addressLine1: party.addresses[0]?.street || '',
          postalCode: party.addresses[0]?.postalCode || '',
          country: party.addresses[0]?.country || 'ES',
          notes: order.notes || undefined,
        };
        console.log('[CHIVATO] Objeto de envío construido:', JSON.stringify(newShipment, null, 2));
        
        await upsertMany('shipments', [newShipment]);
        createdShipment = newShipment;
        console.log(`[CHIVATO] Envío ${newShipment.id} creado y guardado para el pedido ${order.id}.`);
      } else {
         console.warn(`[CHIVATO] ADVERTENCIA: El pedido ${order.id} no tiene líneas. No se creará el envío.`);
      }
    }

    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    
    return { ok: true, order: { id: order.id, status: newStatus }, shipment: createdShipment };

  } catch (err: any) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, order: {id: order.id, status: newStatus}, shipment: null, error: err.message };
  }
}
