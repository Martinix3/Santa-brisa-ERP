import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const shop = process.env.SHOPIFY_SHOP ?? ""; // opcional: pídeselo al usuario
  if (!shop) return NextResponse.json({ ok:false, error:"Falta SHOPIFY_SHOP" }, { status:400 });

  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY!,
    scope: process.env.SHOPIFY_SCOPES!,
    redirect_uri: `${process.env.APP_URL}/api/integrations/shopify/callback`,
    state,
  });

  const url = `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  const res = NextResponse.redirect(url, { status:302 });
  // guarda temporalmente el state (en KV/Redis); aquí, demo cookie:
  res.cookies.set("shopify_oauth_state", state, { httpOnly:true, secure:true, sameSite:"lax", path:"/" });
  res.cookies.set("shopify_shop", shop, { httpOnly:true, secure:true, sameSite:"lax", path:"/" });
  return res;
}
