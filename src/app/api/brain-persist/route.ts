
// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminAuth, getProjectId } from "@/server/firebaseAdmin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// No necesitamos convertir al wire-format REST; con Admin SDK podemos guardar objetos JS tal cual.

export async function POST(req: Request) {
  const projectId = getProjectId();
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Server misconfiguration: FIREBASE_PROJECT_ID is not set." }, { status: 500 });
  }

  const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: Missing token.' }, { status: 401 });
  }

  try {
    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    // 1) Verifica el usuario
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ ok: false, error: "Server has no Admin credentials (adminDb/adminAuth unavailable)." }, { status: 500 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Invalid token." }, { status: 401 });
    }

    // 2) Construye batch Admin
    const batch = adminDb.batch();
    let ops = 0;
    for (const coll in newEntities) {
      const items = newEntities[coll];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || !item.id) continue;
        const ref = adminDb.collection(coll).doc(item.id);
        batch.set(ref, item, { merge: true });
        ops++;
      }
    }

    if (ops === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No documents to save." });
    }
    await batch.commit();
    return NextResponse.json({ ok: true, saved: ops });

  } catch (e: any) {
    console.error('[brain-persist] UNHANDLED ERROR:', e?.message);
    return NextResponse.json({ ok: false, error: e.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
