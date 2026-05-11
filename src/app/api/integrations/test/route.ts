
import { NextRequest, NextResponse } from 'next/server';

const SHOP = process.env.SHOPIFY_SHOP!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

const HOLDED_KEY = process.env.HOLDED_API_KEY!;

const SC_KEY = process.env.SENDCLOUD_PUBLIC_KEY!;
const SC_SECRET = process.env.SENDCLOUD_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const { kind } = await req.json().catch(() => ({}));
  if (!kind) return NextResponse.json({ ok: false, error: 'Missing kind' }, { status: 400 });

  try {
    if (kind === 'shopify') {
      // shop.json + 1 pedido (si existe)
      const shop = await fetch(`https://${SHOP}/admin/api/2024-07/shop.json`, {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
      }).then(r => r.json());
      const orders = await fetch(`https://${SHOP}/admin/api/2024-07/orders.json?limit=1&status=any`, {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
      }).then(r => r.json());
      return NextResponse.json({ ok: true, data: { shop, ordersCount: orders?.orders?.length ?? 0 } });
    }

    if (kind === 'holded') {
      // lee 1 contacto como ping (no crea nada)
      const r = await fetch(`https://api.holded.com/api/invoicing/v1/contacts?limit=1`, {
        headers: { 'key': HOLDED_KEY, 'Content-Type': 'application/json' }
      });
      const data = await r.json().catch(()=> ({}));
      return NextResponse.json({ ok: r.ok, status: r.status, data });
    }

    if (kind === 'sendcloud') {
        const credentials = Buffer.from(`${SC_KEY}:${SC_SECRET}`).toString('base64');
        const r = await fetch(`https://panel.sendcloud.sc/api/v2/parcels?limit=1`, {
            headers: { 
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
        });
      const data = await r.json().catch(()=> ({}));
      return NextResponse.json({ ok: r.ok, status: r.status, data });
    }

    return NextResponse.json({ ok: false, error: 'Unknown kind' }, { status: 400 });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
