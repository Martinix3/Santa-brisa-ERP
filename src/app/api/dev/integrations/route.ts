// app/api/dev/integrations/route.ts
import { NextResponse } from 'next/server';

const mem: any = globalThis as any;
mem._secrets ??= {};

/**
 * GET: Dev-only endpoint to inspect in-memory secrets.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  return NextResponse.json(mem._secrets || {});
}

/**
 * DELETE: Dev-only endpoint to clear in-memory secrets.
 * ?provider=... to clear one, or no query param to clear all.
 */
export async function DELETE(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (provider) {
    if (mem._secrets && mem._secrets[provider]) {
      delete mem._secrets[provider];
    }
  } else {
    mem._secrets = {};
  }

  return NextResponse.json({ ok: true, cleared: provider || 'all' });
}
