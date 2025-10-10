export * from './schema';
import type { OrderSellOut } from './schema';
export function orderTotal(order: OrderSellOut): number {
  try {
    return (order?.lines || []).reduce((acc, l) => {
      const price = Number(l.price ?? 0);
      const qty = Number(l.qty ?? 0);
      const discount = Number(l.discountPct ?? 0) / 100;
      return acc + price * qty * (1 - discount);
    }, 0);
  } catch { return 0; }
}
