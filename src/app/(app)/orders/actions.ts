
// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed' as OrderStatus,
  'open' as OrderStatus
]);

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  console.log(`[Server Action] Updating order ${orderId} → ${next}`);

  try {
    // 1. Siempre actualiza el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
    console.log(`[Server Action] Order ${orderId} status updated to ${next}.`);

    // 2. Si el estado es 'confirmed', crea el envío.
    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[Server Action] Status '${next}' triggers shipment creation for ${orderId}.`);
      try {
        const data = await getServerData();
        const order = data.ordersSellOut.find(o => o.id === orderId);

        if (!order) {
          console.warn(`[Server Action] Order ${orderId} not found after update. Cannot create shipment.`);
          revalidatePath('/orders');
          return;
        }
        
        const account = data.accounts.find(a => a.id === order.accountId);
        const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
        const mainAddress = party?.addresses?.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses?.[0] || {};
        
        // CORRECCIÓN: Asegurarse de que `name` está incluido en las líneas del envío.
        const shipmentLines = (order.lines ?? []).map(it => {
          const product = data.products.find(p => p.sku === it.sku);
          return {
            sku: it.sku,
            name: product?.name || it.sku, // <--- Este campo faltaba
            qty: it.qty,
            uom: 'uds' as const,
          };
        });

        if(shipmentLines.length === 0) {
          console.warn(`[Server Action] Order ${orderId} has no lines. Shipment not created.`);
        } else {
          const newShipment: Shipment = {
            id: `shp_${Date.now()}`,
            orderId: order.id,
            accountId: order.accountId,
            shipmentNumber: `SHP-${(order as any).docNumber || order.id.slice(-4)}`,
            createdAt: new Date().toISOString(),
            status: 'pending',
            lines: shipmentLines,
            customerName: account?.name || '',
            city: mainAddress.city || '',
            addressLine1: mainAddress.street || '',
            postalCode: mainAddress.postalCode || '',
            country: mainAddress.country || 'ES',
            notes: order.notes,
          };
          await upsertMany('shipments', [newShipment]);
          console.log(`[Server Action] Shipment ${newShipment.id} created successfully for order ${orderId}.`);
        }
      } catch (err) {
         console.error(`[Server Action] CRITICAL: Failed to create shipment for order ${orderId}:`, err);
         // No re-lanzamos el error para no romper la UI, pero lo logueamos como crítico.
      }
    }
  } catch (err) {
    console.error(`[Server Action] CRITICAL: Failed to update order status for ${orderId}:`, err);
    // Podríamos querer revertir aquí, pero por ahora solo logueamos.
  }

  // 3. Revalidar rutas al final para que la UI se actualice.
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated paths: /orders & /warehouse/logistics`);
}
