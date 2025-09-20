// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/server/firebaseAdmin";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot"; // importa tu lista canónica
import type { SantaData } from "@/domain/ssot";

// ❌ No exportes runtime/dynamic aquí

type NewEntities = Partial<SantaData> | Record<string, any[]>;

export async function POST(req: Request) {
  try {
    // --- Auth header robusto ---
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Missing token." }, { status: 401 });
    }
    const idToken = m[1];

    // --- Verificar ID token Firebase ---
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: `Unauthorized: Invalid token (${e?.message || "verifyIdToken failed"})` },
        { status: 401 }
      );
    }

    // --- Body ---
    const body = await req.json().catch(() => ({}));
    const newEntities: NewEntities = (body as any)?.newEntities;
    if (!newEntities || typeof newEntities !== "object") {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    // --- Escribir en Firestore (solo colecciones whitelisted) ---
    const batch = adminDb.batch();
    let writeCount = 0;

    for (const [collectionName, items] of Object.entries(newEntities)) {
      // Whitelist: evita colecciones no permitidas
      if (!SANTA_DATA_COLLECTIONS.includes(collectionName as keyof SantaData)) continue;
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (!item?.id) continue;
        const ref = adminDb.collection(collectionName).doc(String(item.id));
        batch.set(ref, item, { merge: true });
        writeCount++;
      }
    }

    if (writeCount === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No valid documents to save." });
    }

    await batch.commit();
    return NextResponse.json({ ok: true, saved: writeCount });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const credsHint =
      msg.includes("No hay credenciales") ||
      msg.includes("invalid_grant") ||
      msg.includes("RAPT") ||
      msg.includes("metadata from plugin");

    console.error("[brain-persist] Server error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: credsHint
          ? "Credenciales de Firebase Admin ausentes/incorrectas. Configura FIREBASE_SERVICE_ACCOUNT_BASE64 o las 3 envs (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
          : msg,
      },
      { status: 500 }
    );
  }
}
