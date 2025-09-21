
// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { getServerData, upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus, Shipment, SantaData } from '@/domain';

export async function updateOrderStatus(orderId: string, next: OrderStatus){
  // En un caso real, aquí podrías añadir validaciones o lógica de negocio
  // antes de persistir el cambio en la base de datos.
  
  // Primero, siempre actualizamos el estado del pedido.
  await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);

  // Si el pedido se confirma, creamos el envío.
  if (next === 'confirmed') {
      const data = await getServerData();
      const order = data.ordersSellOut.find(o => o.id === orderId);
      const account = order ? data.accounts.find(a => a.id === order.accountId) : undefined;
      const party = account ? data.parties.find(p => p.id === account.partyId) : undefined;

      if (order && account && party) {
          const mainAddress = party?.addresses.find(a => a.isPrimary || a.type === 'shipping') || party?.addresses[0];
          
          const newShipment: Shipment = {
              id: `shp_${Date.now()}`,
              orderId: order.id,
              accountId: order.accountId,
              shipmentNumber: `SHP-${order.docNumber || order.id.slice(-4)}`,
              createdAt: new Date().toISOString(),
              status: 'pending',
              lines: (order.lines || []).map(line => ({
                  sku: line.sku,
                  name: data.products.find(p => p.sku === line.sku)?.name || line.sku,
                  qty: line.qty,
                  uom: 'uds',
              })),
              customerName: account.name,
              city: mainAddress?.city || '',
              addressLine1: mainAddress?.street,
              postalCode: mainAddress?.postalCode,
              country: mainAddress?.country,
              notes: order.notes,
          };
          
          // Ahora hacemos una segunda llamada para guardar el nuevo envío.
          await upsertMany('shipments', [newShipment]);
      } else {
        console.error(`[updateOrderStatus] No se pudo crear el envío para el pedido ${orderId}. Faltan datos:`, { hasOrder: !!order, hasAccount: !!account, hasParty: !!party });
      }
  }
  
  // Revalida las rutas para que Next.js las vuelva a renderizar con los datos actualizados.
  revalidatePath('/orders');
  revalidatePath('/app/orders');
  revalidatePath('/warehouse/logistics');
  revalidatePath('/app/warehouse/logistics');
}
