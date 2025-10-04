// src/server/actions/orders.actions.ts
'use server';

import { ok, type ActionResult } from '@/lib/result';

export async function placeOrder(input: any): Promise<ActionResult<{ orderId: string }>> {
  // TODO: implementar lógica real de crear pedido
  const orderId = `ord_${Math.random().toString(36).slice(2,8)}`;
  return ok({ orderId });
}
