

import type { OrderSellOut, Timestamp, Currency } from '@/domain/ssot';

type ShopifyOrder = any; // si quieres, añade tipos de Shopify más adelante

export function mapFinancialStatusToOrderStatus(financial?: string): OrderSellOut['status'] {
  // simplificado para MVP
  if (financial === 'paid') return 'confirmed';
  if (financial === 'authorized') return 'confirmed';
  if (financial === 'refunded' || financial === 'voided') return 'cancelled';
  if (financial === 'partially_refunded') return 'open';
  return 'open';
}

export function normalizeShopifyOrder(order: ShopifyOrder): OrderSellOut {
  const id = `shopify:${order.id}`;
  const currency: Currency = (order.currency || 'EUR') as Currency;
  const financial = order.financial_status as string | undefined;
  const status = mapFinancialStatusToOrderStatus(financial);

  // Calcular descuento y tax “por línea” de forma MVP:
  const subtotal = Number(order.subtotal_price || 0);
  const totalDiscount = Number(order.total_discounts || 0);
  const discountPct = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;

  const totalTax = Number(order.total_tax || 0);
  const taxRateGuess = subtotal > 0 ? (totalTax / subtotal) * 100 : undefined;

  const lines = (order.line_items || []).map((li: any) => ({
    itemId: li.sku || li.variant_sku || String(li.variant_id || li.product_id || ''),
    name: li.name,
    qty: Number(li.quantity || 0),
    priceUnit: Number(li.price || 0),
    discountPct: discountPct || undefined,
    taxRate: taxRateGuess,
    uom: 'unit' as const,
  }));

  const createdAt: Timestamp = new Date(order.created_at || Date.now()).toISOString();
  const updatedAt: Timestamp = new Date(order.updated_at || Date.now()).toISOString();

  const mapped: OrderSellOut = {
    id,
    partyId: 'ONLINE',       // se sustituye tras ensureOnlinePartyAccount
    accountId: 'ONLINE',     // idem
    source: 'SHOPIFY' as const,
    createdAt,
    updatedAt,
    currency,
    lines,
    status,
    notes: order.note || undefined,
    external: {
      shopifyOrderId: String(order.id),
    },
    // totalAmount opcional (referencial)
    totalAmount: Number(order.total_price || 0),
    docNumber: order.name,    // p. ej. "#1001"
  };

  return mapped;
}

// src/server/integrations/shopify/shopify.mapper.ts
import type { Account } from '@/domain/ssot';

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
    // external property doesn't exist in Account v6, use notes or other field if needed
    notes: `Shopify Customer ID: ${shopifyOrder.customer.id}${shopifyOrder.customer.tax_exempt ? ' (Tax Exempt)' : ''}`
    // Suponemos que el email se usa como clave de unión en el usecase
  };

  const orderData: Partial<OrderSellOut> = {
    // totalAmount property exists in OrderSellOut v6
    totalAmount: parseFloat(shopifyOrder.total_price),
    lines: shopifyOrder.line_items.map((item: any) => ({
      itemId: item.sku || `SHOPIFY_${item.variant_id}`,
      qty: item.quantity,
      priceUnit: parseFloat(item.price),
      uom: 'unit'
    })),
    createdAt: shopifyOrder.created_at,
    // La dirección y otros detalles se podrían mapear aquí también
  };

  return { accountData, orderData, correlationId };
}
