

// src/app/api/brain-persist/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { adminDb, adminAuth } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

// Forzar el runtime de Node.js, ya que firebase-admin no es compatible con el Edge Runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await adminAuth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error("Error verifying auth token:", error);
        return null;
    }
}


export async function GET(req: NextRequest) {
  
  const decodedToken = await verifyAuth(req);
  if (!decodedToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized. No valid token provided.' }, { status: 401 });
  }

  try {
    const db = adminDb();
    // Comprobar si la inicialización de Firebase Admin falló y db no es funcional
    if (typeof db.collection !== 'function') {
        throw new Error('La conexión con Firestore no está disponible. Revisa la configuración de Firebase Admin en el servidor.');
    }

    const santaData: any = {};
    
    for (const collectionName of SANTA_DATA_COLLECTIONS) {
      const snapshot = await db.collection(collectionName).get();
      santaData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json(santaData);
  } catch (e:any) {
    console.error('Error fetching all collections from Firestore:', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error fetching data.' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {

  const decodedToken = await verifyAuth(req);
  if (!decodedToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized. No valid token provided.' }, { status: 401 });
  }

  try {
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ ok: false, error: 'Invalid payload. Expecting an object of collections.' }, { status: 400 });
    }

    const db = adminDb();
    if (typeof db.batch !== 'function') {
        throw new Error('La conexión con Firestore no está disponible. No se pueden guardar los datos.');
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
      console.log(`[api/brain-persist] Successfully committed ${count} documents across collections to Firestore.`);
    } else {
      console.log('[api/brain-persist] No valid documents to commit.');
    }
    
    return NextResponse.json({ ok: true, message: `${count} documents saved.` });

  } catch (e:any) {
    console.error('Error in /api/brain-persist POST:', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}
