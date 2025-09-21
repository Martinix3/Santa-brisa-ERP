// src/app/(app)/orders/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { upsertMany } from '@/lib/dataprovider/server';
import type { OrderStatus } from '@/domain';

export async function updateOrderStatus(orderId: string, next: OrderStatus){
  // En un caso real, aquí podrías añadir validaciones o lógica de negocio
  // antes de persistir el cambio en la base de datos.
  await upsertMany('ordersSellOut', [{ id: orderId, status: next }]);
  
  // Revalida la ruta para que Next.js la vuelva a renderizar con los datos actualizados.
  revalidatePath('/orders');
  revalidatePath('/app/orders');
}
