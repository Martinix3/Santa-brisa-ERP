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
    await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
    console.log(`[Server Action] Order ${orderId} status updated in 'ordersSellOut'.`);

    if (SHIPMENT_TRIGGER_STATES.has(next)) {
      console.log(`[Server Action] Status triggers shipment for ${orderId}.`);
      
      const data = await getServerData();
      const order = data.ordersSellOut.find(o => o.id === orderId);

      if (!order) {
        console.warn(`[Server Action] Order ${orderId} not found after update.`);
        revalidatePath('/orders');
        return;
      }
      
      const account = data.accounts.find(a => a.id === order.accountId);
      const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
      const mainAddress = party?.addresses?.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses?.[0] || {};
      
      const shipmentLines = (order.lines ?? []).map(it => {
        const product = data.products.find(p => p.sku === it.sku);
        return {
          sku: it.sku,
          name: product?.name || it.sku,
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
        console.log(`[Server Action] Shipment created for order ${orderId}.`);
      }
    }
  } catch (err) {
    console.error(`[Server Action] Failed to process order status update for ${orderId}:`, err);
    // Optionally re-throw or handle error reporting
  }

  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated /orders & /warehouse/logistics`);
}
