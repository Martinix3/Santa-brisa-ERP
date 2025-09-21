
// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, Account, Party, CustomerData, PartyRole } from '@/domain/ssot';

const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed' as OrderStatus,
]);

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  console.log(`[Server Action] -----------------------------------------`);
  console.log(`[Server Action] Received request to update order ${orderId} to status: ${next}`);

  try {
    // 1. Siempre actualiza el estado del pedido primero.
    await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
    console.log(`[Server Action] SUCCESS: Order ${orderId} status updated to ${next}.`);

    // 2. Si el estado es 'confirmed', intenta crear el envío.
    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[Server Action] TRIGGER: Status '${next}' triggers shipment creation for ${orderId}.`);
      try {
        const data = await getServerData();
        const order = data.ordersSellOut.find(o => o.id === orderId);
        
        if (!order) {
          console.error(`[Server Action] CRITICAL: Order ${orderId} not found after update. Cannot create shipment.`);
          revalidatePath('/orders');
          return;
        }
        console.log(`[Server Action] Found order:`, order);
        
        const account = data.accounts.find(a => a.id === order.accountId);
        if (!account) {
            console.error(`[Server Action] CRITICAL: Account ${order.accountId} not found for order.`)
            return;
        }
        console.log(`[Server Action] Found account:`, account);

        const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
        if (!party) {
            console.error(`[Server Action] CRITICAL: Party ${account.partyId} not found for account.`)
            return;
        }
        console.log(`[Server Action] Found party:`, party);
        
        const mainAddress = party?.addresses?.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses?.[0] || {};
        console.log(`[Server Action] Determined main address:`, mainAddress);
        
        const shipmentLines = (order.lines ?? []).map(it => {
          const product = data.products.find(p => p.sku === it.sku);
          return {
            sku: it.sku,
            name: product?.name || it.sku,
            qty: it.qty,
            uom: 'uds' as const,
          };
        });
        console.log(`[Server Action] Constructed shipment lines:`, shipmentLines);

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
          console.log(`[Server Action] PRE-SAVE: Constructed new shipment object:`, newShipment);
          await upsertMany('shipments', [newShipment]);
          console.log(`[Server Action] SUCCESS: Shipment ${newShipment.id} created for order ${orderId}.`);
        }
      } catch (err) {
         console.error(`[Server Action] CRITICAL: Failed to create shipment for order ${orderId}:`, err);
      }
    }
  } catch (err) {
    console.error(`[Server Action] CRITICAL: Failed to update order status for ${orderId}:`, err);
  }

  // 3. Revalidar rutas al final para que la UI se actualice.
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated paths: /orders & /warehouse/logistics`);
  console.log(`[Server Action] -----------------------------------------`);
}
