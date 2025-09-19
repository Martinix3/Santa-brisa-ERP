
// src/app/api/brain-persist/route.ts
"use server";

import { NextResponse } from "next/server";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";
import { adminDb, adminAuth } from "@/server/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    // Verify token to ensure user is authenticated
    await adminAuth?.verifyIdToken(idToken);
    
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: "Server misconfiguration: Firebase Admin not initialized." }, { status: 500 });
    }

    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    const batch = adminDb.batch();
    let ops = 0;

    for (const coll in newEntities) {
      if (!(SANTA_DATA_COLLECTIONS as readonly string[]).includes(coll)) continue;
      
      const items = newEntities[coll];
      if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.id) {
              ops++;
              const docRef = adminDb.collection(coll).doc(item.id);
              // Use set with merge to avoid overwriting existing fields not present in the payload
              batch.set(docRef, item, { merge: true });
            }
          }
      }
    }

    if (ops > 0) {
       await batch.commit();
    }
    
    return NextResponse.json({ ok: true, saved: ops });

  } catch (e: any) {
    console.error('[brain-persist] ERROR:', e?.code, e?.message);
    if (e.code === 'auth/id-token-expired') {
        return NextResponse.json({ ok: false, error: 'Authentication token expired.' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
