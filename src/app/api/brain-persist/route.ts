
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
    return adminAuth.verifyIdToken(idToken);
}

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);
    // console.log(`[API GET] Authenticated user: ${decodedToken.email}`);

    const db = adminDb();
    const santaData: any = {};
    
    for (const collectionName of SANTA_DATA_COLLECTIONS) {
      const snapshot = await db.collection(collectionName).get();
      santaData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json(santaData);
  } catch (e:any) {
    console.error('Auth error or Firestore fetch error in GET:', e);
    if (e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error') {
      return NextResponse.json({ ok:false, error: 'Authentication token is invalid or expired.' }, { status: 401 });
    }
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error fetching data.' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    // console.log(`[API POST] Authenticated user: ${decodedToken.email}`);
    
    const db = adminDb();
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ ok: false, error: 'Invalid payload. Expecting an object of collections.' }, { status: 400 });
    }

    const batch = db.batch();
    let count = 0;

    for (const collectionName in payload) {
        if (Array.isArray(payload[collectionName]) && SANTA_DATA_COLLECTIONS.includes(collectionName as any)) {
            for (const doc of payload[collectionName]) {
                if (!doc.id) continue;
                const ref = db.collection(collectionName).doc(doc.id);
                batch.set(ref, doc, { merge: true });
                count++;
            }
        }
    }
    
    if (count > 0) {
      await batch.commit();
      // console.log(`[api/brain-persist] Successfully committed ${count} documents for user ${decodedToken.email}.`);
    } else {
      // console.log('[api/brain-persist] No valid documents to commit.');
    }
    
    return NextResponse.json({ ok: true, message: `${count} documents saved.` });

  } catch (e:any) {
    console.error('Auth error or Firestore write error in POST:', e);
    if (e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error' || e.message === "No token provided") {
      return NextResponse.json({ ok:false, error: 'Authentication token is invalid or expired.' }, { status: 401 });
    }
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}

