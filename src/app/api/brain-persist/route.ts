// src/app/api/brain-persist/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // TODO: persiste lo que necesites
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, received: body });
}

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}
