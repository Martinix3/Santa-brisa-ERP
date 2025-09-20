// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/server/firebaseAdmin";
import type { SantaData } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: "Server misconfiguration: Firebase Admin DB is not initialized." }, { status: 500 });
  }

  const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Missing token." }, { status: 401 });
  }

  try {
    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    // Verify user token to ensure the request is authenticated
    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Invalid token." }, { status: 401 });
    }

    const batch = adminDb.batch();
    let writeCount = 0;

    for (const collectionName in newEntities) {
      const items = newEntities[collectionName as keyof SantaData];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.id) {
            const docRef = adminDb.collection(collectionName).doc(item.id);
            // Use set with merge:true to create or update documents.
            batch.set(docRef, item, { merge: true });
            writeCount++;
          }
        }
      }
    }

    if (writeCount === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No valid documents to save." });
    }

    await batch.commit();

    return NextResponse.json({ ok: true, saved: writeCount });

  } catch (e: any) {
    console.error('[brain-persist] UNHANDLED ERROR:', e);
    const errorMessage = e.message || 'An unexpected server error occurred.';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
