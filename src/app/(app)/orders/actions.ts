// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, OrderSellOut, Account, Party } from '@/domain/ssot'; // usa tu SSOT real

// Mapea estados que deben generar shipment (ABIERTO/CONFIRMADO/EN_PROCESO, etc.)
const SHIPMENT_TRIGGER_STATES = new Set<OrderStatus>([
  'confirmed',
  'shipped' // Por si se pasa directamente a enviado
]);

export async function updateOrderStatus(order: OrderSellOut, newStatus: OrderStatus) {
  console.log(`[Server Action] Updating order ${order.id} → ${newStatus}`);

  // 1) Actualiza en la colección correcta del SSOT
  // Usamos un nuevo objeto para asegurarnos de que solo se actualizan los campos deseados.
  const orderUpdate = { id: order.id, status: newStatus };
  await upsertMany('ordersSellOut', [orderUpdate]);
  console.log(`[Server Action] Order ${order.id} status updated in 'ordersSellOut'.`);

  // 2) Crea shipment si el estado lo requiere
  if (SHIPMENT_TRIGGER_STATES.has(newStatus)) {
    console.log(`[Server Action] Status triggers shipment for ${order.id}.`);
    try {
      // Los datos necesarios vienen en el objeto 'order'
      const { account, owner, billerId, ...orderData } = order as any;

      // Construye líneas desde el objeto order que nos llega
      const shipmentLines = (orderData.lines ?? []).map((it: any) => {
        return {
          sku: it.sku,
          name: it.name || it.sku, // 'name' es crucial para la UI de logística
          qty: it.qty,
          uom: 'uds' as const,
        };
      });

      if (shipmentLines.length === 0) {
        console.warn(`[CHIVATO] Order ${order.id} has no lines. Shipment not created.`);
      } else {
         const newShipment: Shipment = {
          id: `shp_${Date.now()}`,
          orderId: order.id,
          accountId: order.accountId,
          shipmentNumber: `SHP-${(order as any).docNumber || order.id.slice(-4)}`,
          createdAt: new Date().toISOString(),
          status: 'pending', // Siempre a 'pending' para que logística lo procese
          lines: shipmentLines,
          customerName: account?.name || '',
          city: account?.city || '',
          addressLine1: account?.addressLine1 || '',
          postalCode: account?.postalCode || '',
          country: account?.country || 'ES',
          notes: order.notes,
        };

        console.log(`[CHIVATO] PRE-SAVE: Constructed new shipment object:`, newShipment);
        await upsertMany('shipments', [newShipment]);
        console.log(`[CHIVATO] STEP 2 SUCCESS: Shipment ${newShipment.id} created for order ${order.id}.`);
      }

    } catch (err) {
      console.error(`[CHIVATO] CRITICAL: Failed to create shipment for order ${order.id}:`, err);
    }
  }

  // 3) Revalidaciones (Orders + Logística)
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated /orders & /warehouse/logistics`);
}
