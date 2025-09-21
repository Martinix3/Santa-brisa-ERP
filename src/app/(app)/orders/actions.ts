// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party, SantaData } from '@/domain/ssot'; 

// Mapea estados que deben generar shipment
const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed',
]);

export async function updateOrderStatus(order: OrderSellOut, account: Account, party: Party, next: OrderStatus) {
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${order.id} a estado ${next}`);

  try {
    // 1. Actualiza SIEMPRE el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: order.id, status: next }]);
    console.log(`[CHIVATO] Paso 1 OK: Estado del pedido ${order.id} actualizado a ${next} en 'ordersSellOut'.`);

    // 2. Si el estado es 'confirmed', crea el envío.
    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[CHIVATO] Paso 2: El estado '${next}' dispara la creación de un envío.`);
      
      const shipmentLines = (order.lines ?? []).map(it => ({
        sku: it.sku,
        name: it.sku, // El dashboard de logística debe poder buscar el nombre si es necesario
        qty: it.qty,
        uom: 'uds' as const,
      }));

      if (shipmentLines.length === 0) {
        console.warn(`[CHIVATO] ADVERTENCIA: El pedido ${order.id} no tiene líneas. No se creará el envío.`);
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
        console.log('[CHIVATO] Objeto de envío construido:', newShipment);
        
        await upsertMany('shipments', [newShipment]);
        console.log(`[CHIVATO] Paso 2 OK: Envío ${newShipment.id} creado para el pedido ${order.id}.`);
      }
    }

    // 3. Revalida las rutas para que la UI se actualice.
    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    console.log('[CHIVATO] Paso 3 OK: Rutas /orders y /warehouse/logistics revalidadas.');
  } catch (err) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    // En un caso real, aquí podrías revertir la actualización de estado o registrar el fallo.
  }
}
