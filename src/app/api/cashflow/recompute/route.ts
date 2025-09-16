// app/api/cashflow/recompute/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  // 1) leer ajustes
  // 2) fetch Holded (real) + CRM (forecast)
  // 3) build events -> reconcile -> aggregate
  // 4) cachear resultado para el dashboard
  return NextResponse.json({ ok: true });
}
