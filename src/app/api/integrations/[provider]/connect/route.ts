
// app/api/integrations/[provider]/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

// ⚠️ Demo store en memoria (cámbialo por Firestore/KMS)
const mem:any = globalThis as any;
mem._secrets ??= {};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const body = await req.json().catch(()=> ({}));

  if (provider === "shopify") {
    // Redirect a OAuth install
    const url = new URL(`${process.env.APP_URL}/api/integrations/shopify/oauth`);
    return NextResponse.redirect(url, { status:302 });
  }

  if (provider === "holded") {
    const { apiKey } = body || {};
    if (!apiKey) return NextResponse.json({ ok:false, error:"Falta apiKey" }, { status:400 });
    mem._secrets.holded = { apiKey };
    return NextResponse.json({ ok:true });
  }

  if (provider === "sendcloud") {
    const { apiKey, apiSecret } = body || {};
    if (!apiKey || !apiSecret) return NextResponse.json({ ok:false, error:"Falta apiKey/apiSecret" }, { status:400 });
    mem._secrets.sendcloud = { apiKey, apiSecret };
    return NextResponse.json({ ok:true });
  }
  
  if (provider === 'firebase' || provider === 'google') {
    // La autenticación ahora se maneja en el cliente con el SDK de Firebase
    return NextResponse.json({ ok: true, message: 'Client-side auth' });
  }

  return NextResponse.json({ ok:false, error:"Proveedor no soportado" }, { status:400 });
}
