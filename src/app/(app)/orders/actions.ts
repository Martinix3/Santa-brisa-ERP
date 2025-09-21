// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, Account, Party } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed',
]);

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  console.log(`\n\n--- [Server Action] UPDATE ORDER STATUS ---`);
  console.log(`[CHIVATO] START: Received request to update order ${orderId} to status: ${next}`);

  try {
    // 1. Siempre actualiza el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
    console.log(`[CHIVATO] STEP 1 SUCCESS: Order ${orderId} status updated to ${next}.`);

    // 2. Si el estado es 'confirmed', intenta crear el envío.
    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[CHIVATO] STEP 2 TRIGGER: Status '${next}' triggers shipment creation for ${orderId}.`);
      try {
        const data = await getServerData();
        const order = data.ordersSellOut.find(o => o.id === orderId);
        
        if (!order) {
          console.error(`[CHIVATO] CRITICAL: Order ${orderId} not found after update. Cannot create shipment.`);
          revalidatePath('/orders');
          return;
        }
        console.log(`[CHIVATO] Found order:`, order);
        
        const account = data.accounts.find(a => a.id === order.accountId);
        if (!account) {
            console.error(`[CHIVATO] CRITICAL: Account ${order.accountId} not found for order.`);
            return;
        }
        console.log(`[CHIVATO] Found account:`, account);

        const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
        if (!party) {
            console.error(`[CHIVATO] CRITICAL: Party ${account.partyId} not found for account.`);
            return;
        }
        console.log(`[CHIVATO] Found party:`, party);
        
        const mainAddress = party?.addresses?.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses?.[0] || {};
        console.log(`[CHIVATO] Determined main address:`, mainAddress);
        
        const shipmentLines = (order.lines ?? []).map(it => {
          const product = data.products.find(p => p.sku === it.sku);
          return {
            sku: it.sku,
            name: product?.name || it.sku, // Aseguramos el campo 'name'
            qty: it.qty,
            uom: 'uds' as const,
          };
        });
        console.log(`[CHIVATO] Constructed shipment lines:`, shipmentLines);

        if(shipmentLines.length === 0) {
          console.warn(`[CHIVATO] Order ${orderId} has no lines. Shipment not created.`);
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
          console.log(`[CHIVATO] PRE-SAVE: Constructed new shipment object:`, newShipment);
          await upsertMany('shipments', [newShipment]);
          console.log(`[CHIVATO] STEP 2 SUCCESS: Shipment ${newShipment.id} created for order ${orderId}.`);
        }
      } catch (err) {
         console.error(`[CHIVATO] CRITICAL: Failed to create shipment for order ${orderId}:`, err);
      }
    } else {
        console.log(`[CHIVATO] Status '${next}' does not trigger shipment creation. Skipping.`);
    }
  } catch (err) {
    console.error(`[CHIVATO] CRITICAL: Failed to update order status for ${orderId}:`, err);
  }

  // 3. Revalidar rutas al final para que la UI se actualice.
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[CHIVATO] END: Revalidated paths: /orders & /warehouse/logistics`);
  console.log(`--- [Server Action] END ---`);
}
