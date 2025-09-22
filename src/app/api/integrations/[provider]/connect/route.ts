// app/api/integrations/[provider]/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from '@/server/firebaseAdmin';

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
    // La clave de API se gestiona de forma segura a través de variables de entorno.
    // Esta ruta solo necesita confirmar que la clave está disponible en el servidor.
    if (process.env.HOLDED_API_KEY) {
        return NextResponse.json({ ok: true, message: 'La API Key de Holded ya está configurada en el servidor.' });
    }
    // Si la clave no está, se informa al usuario de que es una configuración del servidor.
    return NextResponse.json({ ok: false, error: "La API Key de Holded no se ha encontrado. Debe configurarse en las variables de entorno del servidor." }, { status: 400 });
  }

  if (provider === "sendcloud") {
    const { apiKey, apiSecret } = body || {};
    if (!apiKey || !apiSecret) return NextResponse.json({ ok:false, error:"Falta apiKey/apiSecret" }, { status:400 });
    
    // Guardar secretos en Firestore para persistencia
    const db = adminDb;
    await db.collection('dev-secrets').doc('sendcloud').set({ apiKey, apiSecret });

    return NextResponse.json({ ok:true });
  }
  
  if (provider === 'firebase' || provider === 'google') {
    // La autenticación ahora se maneja en el cliente con el SDK de Firebase
    return NextResponse.json({ ok: true, message: 'Client-side auth' });
  }

  return NextResponse.json({ ok:false, error:"Proveedor no soportado" }, { status:400 });
}
