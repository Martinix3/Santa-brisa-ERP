// src/server/integrations/shopify/shopify.mapper.ts
import type { OrderSellOut, Account } from '@/domain/ssot';

// Este es un mapeo simplificado. En una app real, esto sería mucho más complejo
// para manejar impuestos, descuentos, variantes de productos, etc.
export function mapShopifyToSSOT(shopifyOrder: any): {
  accountData: Partial<Account>;
  orderData: Partial<OrderSellOut>;
  correlationId: string;
} {
  const correlationId = `${shopifyOrder.id}-${shopifyOrder.updated_at}`;

  const accountData: Partial<Account> = {
    name: `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim(),
    external: {
        shopifyCustomerId: String(shopifyOrder.customer.id),
        vat: shopifyOrder.customer.tax_exempt ? 'EXEMPT' : undefined,
    }
    // Suponemos que el email se usa como clave de unión en el usecase
  };

  const orderData: Partial<OrderSellOut> = {
    totalAmount: parseFloat(shopifyOrder.total_price),
    lines: shopifyOrder.line_items.map((item: any) => ({
      sku: item.sku || `SHOPIFY_${item.variant_id}`,
      qty: item.quantity,
      priceUnit: parseFloat(item.price),
      uom: 'uds'
    })),
    createdAt: shopifyOrder.created_at,
    // La dirección y otros detalles se podrían mapear aquí también
  };

  return { accountData, orderData, correlationId };
}
