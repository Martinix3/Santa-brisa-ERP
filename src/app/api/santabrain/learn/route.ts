
// This API route has been disconnected.
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ ok: false, message: "Assistant feature is disabled." }, { status: 410 });
}
