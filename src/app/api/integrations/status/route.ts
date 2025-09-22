
import { NextRequest, NextResponse } from 'next/server';

const SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

const HOLDED_KEY = process.env.HOLDED_API_KEY;

const SC_KEY = process.env.SENDCLOUD_PUBLIC_KEY;
const SC_SECRET = process.env.SENDCLOUD_SECRET_KEY;
const SC_WEBHOOK = process.env.SENDCLOUD_WEBHOOK_TOKEN;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const live = url.searchParams.get('live') === '1'; // ?live=1 para ping real

  const base = {
    shopify: { ok: !!(SHOP && SHOPIFY_TOKEN && SHOPIFY_SECRET), details: { shop: SHOP, token: !!SHOPIFY_TOKEN, secret: !!SHOPIFY_SECRET } },
    holded:  { ok: !!HOLDED_KEY, details: { key: !!HOLDED_KEY } },
    sendcloud: { ok: !!(SC_KEY && SC_SECRET), details: { key: !!SC_KEY, secret: !!SC_SECRET, webhook: !!SC_WEBHOOK } },
  };

  if (!live) return NextResponse.json(base);

  // Pings ligeros (intentan pero no rompen si falta algo)
  const out = { ...base } as any;

  // Shopify: /shop.json
  if (base.shopify.ok) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2024-07/shop.json`, {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN! },
        cache: 'no-store'
      });
      out.shopify.ping = r.ok ? 'OK' : `HTTP ${r.status}`;
    } catch (e:any) {
      out.shopify.ping = `ERR ${e?.message ?? e}`;
    }
  }

  // Holded: listado mínimo (contacts)
  if (base.holded.ok) {
    try {
      const r = await fetch(`https://api.holded.com/api/invoicing/v1/contacts?limit=1`, {
        headers: { 'key': HOLDED_KEY! },
        cache: 'no-store'
      });
      out.holded.ping = r.ok ? 'OK' : `HTTP ${r.status}`;
    } catch (e:any) {
      out.holded.ping = `ERR ${e?.message ?? e}`;
    }
  }

  // Sendcloud: consulta mínima de parcels (limit=1)
  if (base.sendcloud.ok) {
    try {
        const credentials = Buffer.from(`${SC_KEY}:${SC_SECRET}`).toString('base64');
        const r = await fetch(`https://panel.sendcloud.sc/api/v2/parcels?limit=1`, {
            headers: { 
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json' 
            },
            cache: 'no-store'
        });
      out.sendcloud.ping = r.ok ? 'OK' : `HTTP ${r.status}`;
    } catch (e:any) {
      out.sendcloud.ping = `ERR ${e?.message ?? e}`;
    }
  }

  return NextResponse.json(out);
}
