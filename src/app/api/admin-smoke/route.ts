import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

function getAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  return { db: admin.firestore() };
}

export async function POST() {
  try {
    const { db } = getAdmin();
    const id = new Date().toISOString().replace(/[:.]/g, "-");
    await db.collection("admin_smoke").doc(id).set({
      kind: "ADMIN_SMOKE",
      at: admin.firestore.FieldValue.serverTimestamp(),
      runtimeProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null,
      impersonatedSA: process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT || null,
      env: {
        NODE_ENV: process.env.NODE_ENV || null,
        VERCEL: process.env.VERCEL || null
      }
    });
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      name: err?.name,
      code: err?.code,
      message: err?.message,
      stack: err?.stack?.slice?.(0, 4000) ?? String(err)
    }, { status: 500 });
  }
}
