// src/app/api/integrations/[provider]/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from '@/server/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ provider: string }> };

export async function POST(
  req: NextRequest,
  context: RouteCtx
) {
  const { provider } = await context.params;
  const body = await req.json().catch(()=> ({}));

  if (provider === "shopify") {
    // Para Shopify, con una Custom App, solo necesitamos verificar que las variables de entorno están en el servidor.
    const { SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_TOKEN } = process.env;
    if (SHOPIFY_SHOP_DOMAIN && SHOPIFY_ADMIN_TOKEN) {
        return NextResponse.json({ ok: true, message: 'La conexión con Shopify ya está configurada en el servidor.' });
    }
    return NextResponse.json({ ok: false, error: "Las variables de entorno de Shopify (DOMAIN/TOKEN) no se han encontrado." }, { status: 400 });
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
    // La clave de API y el secreto se gestionan de forma segura a través de variables de entorno.
    // Esta ruta solo necesita confirmar que las claves están disponibles en el servidor.
    if (process.env.SENDCLOUD_API_KEY && process.env.SENDCLOUD_API_SECRET) {
        return NextResponse.json({ ok: true, message: 'Las credenciales de Sendcloud ya están configuradas en el servidor.' });
    }
    return NextResponse.json({ ok: false, error: "Las credenciales de Sendcloud (KEY/SECRET) no se han encontrado. Deben configurarse en las variables de entorno del servidor." }, { status: 400 });
  }
  
  if (provider === 'firebase' || provider === 'google') {
    // La autenticación ahora se maneja en el cliente con el SDK de Firebase
    return NextResponse.json({ ok: true, message: 'Client-side auth' });
  }

  return NextResponse.json({ ok:false, error:"Proveedor no soportado" }, { status:400 });
}
