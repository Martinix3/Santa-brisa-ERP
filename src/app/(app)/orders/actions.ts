// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

export async function updateOrderStatus(
  order: OrderSellOut,
  account: Account,
  party: Party,
  nextStatus: OrderStatus
): Promise<{ ok: boolean; orderId: string; newStatus: OrderStatus; shipment: Shipment | null; error?: string }> {
  
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${order.id} a estado ${nextStatus}`);

  try {
    // 1. Actualiza SIEMPRE el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: order.id, status: nextStatus, updatedAt: new Date().toISOString() }]);
    console.log(`[CHIVATO] Paso 1 OK: Estado del pedido ${order.id} actualizado a ${nextStatus}.`);

    let createdShipment: Shipment | null = null;

    // 2. Si el estado es 'confirmed', crea el envío.
    if (SHIPMENT_TRIGGER_STATES.has(nextStatus)) {
      console.log(`[CHIVATO] Paso 2: El estado '${nextStatus}' dispara la creación de un envío.`);

      const shipmentLines = (order.lines ?? []).map(it => ({
        sku: it.sku,
        name: it.sku, // El dashboard de logística puede buscar el nombre desde el SKU
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
          notes: order.notes,
        };
        console.log('[CHIVATO] Objeto de envío construido:', JSON.stringify(newShipment, null, 2));
        
        await upsertMany('shipments', [newShipment]);
        createdShipment = newShipment;
        console.log(`[CHIVATO] Paso 2 OK: Envío ${newShipment.id} creado para el pedido ${order.id}.`);
      } else {
         console.warn(`[CHIVATO] ADVERTENCIA: El pedido ${order.id} no tiene líneas. No se creará el envío.`);
      }
    }

    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    
    return { ok: true, orderId: order.id, newStatus: nextStatus, shipment: createdShipment };

  } catch (err: any) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, orderId: order.id, newStatus: order.status, shipment: null, error: err.message };
  }
}
