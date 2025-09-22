// Sencillo cliente REST para Shopify Admin API
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-07';
const BASE = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/${API_VERSION}`;

export async function fetchShopify(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getOrderById(orderId: string) {
  // orderId es numérico en Shopify; admitimos "1234567890"
  return fetchShopify(`/orders/${orderId}.json`).then(j => j.order);
}
