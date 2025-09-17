
// src/app/api/brain-persist/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

// Forzar el runtime de Node.js, ya que firebase-admin no es compatible con el Edge Runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No token provided");
    }
    const idToken = authHeader.split(" ")[1];
    try {
        return await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
        console.error("Token verification failed:", error);
        throw new Error("Authentication token is invalid or expired.");
    }
}

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);

    const santaData: any = {};
    
    for (const collectionName of SANTA_DATA_COLLECTIONS) {
      const snapshot = await adminDb.collection(collectionName).get();
      santaData[collectionName] = snapshot.docs.map(doc => ({ ...doc.data() }));
    }

    return NextResponse.json(santaData);
  } catch (e:any) {
    console.error('Auth error or Firestore fetch error in GET:', e);
    if (e.message.includes("Authentication token is invalid or expired")) {
      return NextResponse.json({ ok:false, error: e.message }, { status: 401 });
    }
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error fetching data.' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ ok: false, error: 'Invalid payload. Expecting an object of collections.' }, { status: 400 });
    }

    const batch = adminDb.batch();
    let count = 0;

    for (const collectionName in payload) {
        if (Array.isArray(payload[collectionName]) && SANTA_DATA_COLLECTIONS.includes(collectionName as any)) {
            for (const doc of payload[collectionName]) {
                if (!doc.id) continue;
                const ref = adminDb.collection(collectionName).doc(doc.id);
                batch.set(ref, doc, { merge: true });
                count++;
            }
        }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`[api/brain-persist] Successfully committed ${count} documents for user ${decodedToken.email}.`);
    } else {
      console.log('[api/brain-persist] No valid documents to commit.');
    }
    
    return NextResponse.json({ ok: true, message: `${count} documents saved.` });

  } catch (e:any) {
    console.error('Auth error or Firestore write error in POST:', e);
     if (e.message.includes("Authentication token is invalid or expired")) {
      return NextResponse.json({ ok:false, error: e.message }, { status: 401 });
    }
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}
