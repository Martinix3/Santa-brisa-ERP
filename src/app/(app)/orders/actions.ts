// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut } from '@/domain/ssot'; // usa tu SSOT real

// Mapea estados que deben generar shipment (ABIERTO/CONFIRMADO/EN_PROCESO, etc.)
const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed' as OrderStatus,
  'open' as OrderStatus
]);

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  console.log(`[Server Action] Updating order ${orderId} → ${next}`);

  // 1) Actualiza en la colección correcta del SSOT
  // Usamos 'ordersSellOut' según el SSOT, pero la lógica se aplica.
  await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
  console.log(`[Server Action] Order ${orderId} status updated in 'ordersSellOut'.`);

  // 2) Crea shipment si el estado lo requiere
  if (SHIPMENT_TRIGGER_STATES.has(next)) {
    console.log(`[Server Action] Status triggers shipment for ${orderId}.`);
    try {
      const data = await getServerData(); // Ojo: puede venir cacheado; vale para lookup básico
      const order = data.ordersSellOut.find(o => o.id === orderId);
      if (!order) {
        console.warn(`[Server Action] Order ${orderId} not found after update.`);
        // No abortamos: podrías leer directamente de DB aquí si lo prefieres.
        return;
      }

      const account = data.accounts.find(a => a.id === order.accountId);
      const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;
      
      // SSOT no tiene partyId; resolvemos dirección desde account (o de un addressBilling/Shipping si lo tienes)
      const mainAddress = (party as any)?.addresses?.find((a: any) => a.isPrimary || a.type === 'shipping') || (party as any)?.addresses?.[0] || {};

      // Construye líneas desde SSOT: items, no lines
      const shipmentLines = (order.lines ?? []).map(it => {
        const product = data.products.find(p => p.sku === it.sku);
        return {
          sku: it.sku,
          name: product?.name || it.sku,
          qty: it.qty,
          uom: 'uds' as const,
        };
      });

      const newShipment: Shipment = {
        id: `shp_${Date.now()}`,
        orderId: order.id,
        accountId: order.accountId,
        shipmentNumber: `SHP-${(order as any).docNumber || order.id.slice(-4)}`,
        createdAt: new Date().toISOString(),
        status: 'pending', // tu flujo de Logística puede filtrar 'pending'
        lines: shipmentLines,
        customerName: account?.name || '',
        city: mainAddress.city || '',
        addressLine1: mainAddress.street || mainAddress.addressLine1 || '',
        postalCode: mainAddress.postalCode || '',
        country: mainAddress.country || 'ES',
        notes: order.notes,
      };

      await upsertMany('shipments', [newShipment]);
      console.log(`[Server Action] Shipment created for order ${orderId}.`);
    } catch (err) {
      console.error(`[Server Action] Failed to create shipment for ${orderId}:`, err);
    }
  }

  // 3) Revalidaciones (Orders + Logística)
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated /orders & /warehouse/logistics`);
}
