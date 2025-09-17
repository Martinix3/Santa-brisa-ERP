

// app/api/integrations/[provider]/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from '@/server/firebaseAdmin';

// ⚠️ Usamos Firestore para persistir secretos de desarrollo
const mem:any = globalThis as any;
mem._secrets ??= {};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    // La API key ahora se gestiona vía .env, así que esta ruta ya no es necesaria para guardar la clave.
    // Podríamos añadir una lógica para validar la clave si se pasa en el body, pero por ahora lo dejamos simple.
    if (process.env.HOLDED_API_KEY) {
        return NextResponse.json({ ok: true, message: 'Holded API Key ya está configurada en el servidor.' });
    }
    return NextResponse.json({ ok: false, error: "La API Key de Holded debe configurarse en el archivo .env del servidor." }, { status: 400 });
  }

  if (provider === "sendcloud") {
    const { apiKey, apiSecret } = body || {};
    if (!apiKey || !apiSecret) return NextResponse.json({ ok:false, error:"Falta apiKey/apiSecret" }, { status:400 });
    // Aquí también se guardaría en Firestore en una app real
    mem._secrets.sendcloud = { apiKey, apiSecret };
    return NextResponse.json({ ok:true });
  }
  
  if (provider === 'firebase' || provider === 'google') {
    // La autenticación ahora se maneja en el cliente con el SDK de Firebase
    return NextResponse.json({ ok: true, message: 'Client-side auth' });
  }

  return NextResponse.json({ ok:false, error:"Proveedor no soportado" }, { status:400 });
}
