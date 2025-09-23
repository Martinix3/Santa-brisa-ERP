// This file is obsolete. Webhook handling is now centralized in /api/webhooks/shopify/route.ts
// This file can be safely deleted.
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ ok: true, message: "This endpoint is deprecated." }, { status: 410 });
}
