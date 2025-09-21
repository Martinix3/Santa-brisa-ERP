// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>(['confirmed']);

export async function updateOrderStatus(
  order: OrderSellOut,
  account: Account,
  party: Party
): Promise<{ ok: boolean; orderId: string; newStatus: OrderStatus; shipment: Shipment | null; error?: string }> {
  
  console.log(`[CHIVATO] Iniciando updateOrderStatus para order ${order.id}`);

  try {
    // This is a placeholder as the real update is now done client-side first for responsiveness.
    // In a real scenario, you'd still perform the DB update here for resilience.
    console.log(`[CHIVATO] Estado del pedido ${order.id} se actualizará en el cliente.`);

    let createdShipment: Shipment | null = null;

    // 2. Si el estado es 'confirmed', crea el envío.
    if (SHIPMENT_TRIGGER_STATES.has('confirmed')) {
      console.log(`[CHIVATO] El estado 'confirmed' dispara la creación de un envío.`);

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
          notes: order.notes || null, // FIX: Ensure notes is null instead of undefined
        };
        console.log('[CHIVATO] Objeto de envío construido:', JSON.stringify(newShipment, null, 2));
        
        await upsertMany('shipments', [newShipment]);
        createdShipment = newShipment;
        console.log(`[CHIVATO] Envío ${newShipment.id} creado para el pedido ${order.id}.`);
      } else {
         console.warn(`[CHIVATO] ADVERTENCIA: El pedido ${order.id} no tiene líneas. No se creará el envío.`);
      }
    }

    revalidatePath('/orders');
    revalidatePath('/warehouse/logistics');
    
    return { ok: true, orderId: order.id, newStatus: order.status, shipment: createdShipment };

  } catch (err: any) {
    console.error(`[CHIVATO] ERROR CRÍTICO en updateOrderStatus para el pedido ${order.id}:`, err);
    return { ok: false, orderId: order.id, newStatus: order.status, shipment: null, error: err.message };
  }
}
