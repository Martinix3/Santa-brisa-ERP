// app/api/cashflow/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';

let SETTINGS_CACHE: any = null; // sustituye por DB/Firestore

export async function GET() {
  return NextResponse.json(SETTINGS_CACHE || null);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  SETTINGS_CACHE = body; // valida esquema y persiste
  return NextResponse.json({ ok: true });
}
