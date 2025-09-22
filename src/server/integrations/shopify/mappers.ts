// src/server/integrations/shopify/mappers.ts
import type { OrderSellOut, Account } from '@/domain/ssot';

/**
 * Maps a Shopify order payload to the Santa Brisa SSOT format.
 * This is a simplified mapping. A real-world scenario would handle taxes,
 * discounts, shipping lines, and complex product variant mapping more robustly.
 */
export function mapShopifyToSSOT(shopifyOrder: any): {
  accountData: Partial<Account>;
  orderData: Partial<OrderSellOut>;
  correlationId: string;
} {
  // Use a combination of order ID and last update timestamp for idempotency checks
  const correlationId = `shopify-${shopifyOrder.id}-${shopifyOrder.updated_at}`;

  const accountData: Partial<Account> = {
    name: `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim(),
    external: {
      shopifyCustomerId: String(shopifyOrder.customer.id),
      vat: shopifyOrder.customer.tax_exempt ? 'EXEMPT' : undefined,
    }
  };

  const orderData: Partial<OrderSellOut> = {
    totalAmount: parseFloat(shopifyOrder.total_price),
    lines: shopifyOrder.line_items.map((item: any) => ({
      sku: item.sku || `SHOPIFY_${item.variant_id}`,
      name: item.title,
      qty: item.quantity,
      priceUnit: parseFloat(item.price),
      uom: 'uds'
    })),
    createdAt: shopifyOrder.created_at,
  };

  return { accountData, orderData, correlationId };
}
