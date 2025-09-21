// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed', 'shipped']);

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${orderId} a estado ${next}`);

  try {
    // 1. Actualiza SIEMPRE el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
    console.log(`[CHIVATO] Paso 1 OK: Estado del pedido ${orderId} actualizado a ${next} en 'ordersSellOut'.`);

    // 2. Si el estado es 'confirmed', crea el envío.
    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[CHIVATO] Paso 2: El estado '${next}' dispara la creación de un envío.`);
      
      // Obtenemos los datos frescos desde el servidor, ya que es una Server Action
      const data = await getServerData();
      const order = data.ordersSellOut.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`[CHIVATO] ERROR: No se encontró el pedido ${orderId} en el servidor después de actualizarlo.`);
      }

      const account = data.accounts.find(a => a.id === order.accountId);
      const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
      
      if (!account || !party) {
        throw new Error(`[CHIVATO] ERROR: No se encontró la cuenta o el party para el pedido ${orderId}.`);
      }

      const shipmentLines = (order.lines ?? []).map(it => {
        const product = data.products.find(p => p.sku === it.sku);
        return {
          sku: it.sku,
          name: product?.name || it.sku, // Aseguramos que 'name' esté presente
          qty: it.qty,
          uom: 'uds' as const,
        };
      });

      if (shipmentLines.length === 0) {
        console.warn(`[CHIVATO] ADVERTENCIA: El pedido ${orderId} no tiene líneas. No se creará el envío.`);
      } else {
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
          notes: order.notes,
        };
        console.log('[CHIVATO] Objeto de envío construido:', JSON.stringify(newShipment, null, 2));
        
        await upsertMany('shipments', [newShipment]);
        console.log(`[CHIVATO] Paso 2 OK: Envío ${newShipment.id} creado para el pedido ${order.id}.`);
      }
    }

    // 3. Revalida las rutas para que la UI se actualice.
    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    console.log('[CHIVATO] Paso 3 OK: Rutas /orders y /warehouse/logistics revalidadas.');
  } catch (err) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${orderId}:`, err);
  }
}