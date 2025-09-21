
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ ok: boolean; orderId: string; newStatus: OrderStatus; shipment: Shipment | null; error?: string }> {
  
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${orderId} con nuevo estado ${newStatus}`);

  try {
    // 1. Actualizar siempre el estado del pedido
    await upsertMany('ordersSellOut', [{ id: orderId, status: newStatus, updatedAt: new Date().toISOString() }]);
    console.log(`[CHIVATO] Pedido ${orderId} actualizado a estado ${newStatus} en la base de datos.`);

    let createdShipment: Shipment | null = null;

    // 2. Si el nuevo estado lo requiere, crear el envío.
    if (SHIPMENT_TRIGGER_STATES.has(newStatus)) {
      console.log(`[CHIVATO] El estado '${newStatus}' dispara la creación de un envío.`);

      // Para crear el envío, necesitamos los datos completos del pedido y la cuenta.
      const data = await getServerData();
      const order = data.ordersSellOut.find(o => o.id === orderId);
      if (!order) throw new Error(`Pedido ${orderId} no encontrado en el servidor para crear el envío.`);

      const account = data.accounts.find(a => a.id === order.accountId);
      if (!account) throw new Error(`Cuenta ${order.accountId} no encontrada para el pedido ${orderId}.`);
      
      const party = data.parties.find(p => p.id === account.partyId);
      if (!party) throw new Error(`Party ${account.partyId} no encontrada para la cuenta ${account.id}.`);

      const shipmentLines = (order.lines ?? []).map(it => ({
        sku: it.sku,
        name: data.products.find(p => p.sku === it.sku)?.name || it.sku,
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
          notes: order.notes || null,
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
    
    return { ok: true, orderId: orderId, newStatus: newStatus, shipment: createdShipment };

  } catch (err: any) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${orderId}:`, err);
    return { ok: false, orderId: orderId, newStatus: newStatus, shipment: null, error: err.message };
  }
}
