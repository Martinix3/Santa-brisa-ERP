// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, SantaData } from '@/domain';

export async function updateOrderStatus(orderId: string, next: OrderStatus){
  console.log(`[Server Action] Updating order ${orderId} to status: ${next}`);
  
  // Siempre actualizamos el estado del pedido.
  await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
  console.log(`[Server Action] Order ${orderId} status updated to ${next} in DB.`);

  // Si el pedido se confirma, creamos el envío.
  if (next === 'confirmed') {
    console.log(`[Server Action] Order confirmed, creating shipment for ${orderId}.`);
    try {
      const data = await getServerData();
      const order = data.ordersSellOut.find(o => o.id === orderId);
      const account = order ? data.accounts.find(a => a.id === order.accountId) : undefined;
      const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;

      if (order && account) {
          const mainAddress = party?.addresses?.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses?.[0];
          
          const newShipment: Shipment = {
              id: `shp_${Date.now()}`,
              orderId: order.id,
              accountId: order.accountId,
              shipmentNumber: `SHP-${order.docNumber || order.id.slice(-4)}`,
              createdAt: new Date().toISOString(),
              status: 'pending',
              lines: (order.lines || []).map(line => {
                  const product = data.products.find(p => p.sku === line.sku);
                  return {
                      sku: line.sku,
                      name: product?.name || line.sku,
                      qty: line.qty,
                      uom: 'uds',
                  };
              }),
              customerName: account.name,
              city: mainAddress?.city || '',
              addressLine1: mainAddress?.street,
              postalCode: mainAddress?.postalCode,
              country: mainAddress?.country,
              notes: order.notes,
          };
          
          console.log(`[Server Action] New shipment object created:`, newShipment);
          await upsertMany('shipments', [newShipment]);
          console.log(`[Server Action] New shipment for order ${orderId} saved to DB.`);

      } else {
        console.error(`[Server Action] Could not create shipment for order ${orderId}. Missing data:`, { hasOrder: !!order, hasAccount: !!account });
      }
    } catch (error) {
        console.error(`[Server Action] FATAL: Failed to create shipment for order ${orderId}:`, error);
        // Opcional: podrías revertir el estado del pedido aquí si la creación del envío falla.
    }
  }
  
  // Revalida las rutas para que Next.js las vuelva a renderizar con los datos actualizados.
  revalidatePath('/orders');
  revalidatePath('/warehouse/logistics');
  console.log(`[Server Action] Revalidated paths for /orders and /warehouse/logistics.`);
}
