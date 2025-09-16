import { NextResponse } from "next/server";

type TokenResp = { access_token:string; scope:string };

export async function GET(req:Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const hmac = url.searchParams.get("hmac"); // TODO: validar HMAC con API_SECRET (seguridad)
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop") || "";

  const cookies = (req as any).cookies ?? {};
  // En App Router, usa headers() para leer cookies si lo prefieres:
  // import { cookies } from "next/headers"; const c = cookies();
  // Aquí simplificado por brevedad:
  // TODO: valida state con cookie "shopify_oauth_state"

  if (!code || !shop) return NextResponse.json({ ok:false, error:"Falta code/shop" }, { status:400 });

  // Intercambio code -> token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ ok:false, error:err }, { status: tokenRes.status });
  }

  const data = await tokenRes.json() as TokenResp;

  // GUARDAR TOKEN DE FORMA SEGURA
  const mem:any = globalThis as any;
  mem._secrets ??= {};
  mem._secrets.shopify = { shop, accessToken: data.access_token, scope: data.scope };

  // Marcar integración como conectada (en Firestore → integrations.status = 'connected')
  // Redirigir al panel
  return NextResponse.redirect(`${process.env.APP_URL}/settings/integrations`, { status:302 });
}
