import { NextRequest, NextResponse } from 'next/server';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';

function assertApiKey(req: NextRequest) {
  const k = req.headers.get('x-api-key') || '';
  if (!process.env.INTEGRATIONS_API_KEY || k !== process.env.INTEGRATIONS_API_KEY) {
    throw new Error('Unauthorized');
  }
}

export async function POST(req: NextRequest) {
  try {
    assertApiKey(req);
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '');
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    const saved = await importSingleShopifyOrder(orderId);
    return NextResponse.json({ ok: true, order: saved });
  } catch (e: any) {
    const msg = e?.message || 'Import error';
    return NextResponse.json({ ok: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}
