
import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

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
    const decodedToken = await verifyAuth(req);
    const db = adminDb;
    
    // Asumimos un único documento global por ahora
    const docRef = db.collection('brainData').doc(decodedToken.uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        // Si no existe, podría ser la primera vez. Se podrían devolver datos por defecto.
        return NextResponse.json({ message: "No data found for user." }, { status: 404 });
    }

    return NextResponse.json(docSnap.data());

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

    const db = adminDb;
    const batch = db.batch();
    let count = 0;

    // Guardar cada colección en su propio documento dentro de una colección padre por usuario
    // Ejemplo: /users_data/{uid}/accounts, /users_data/{uid}/products
    const userRootCol = db.collection('userData').doc(decodedToken.uid);

    for (const collectionName in payload) {
        if (Array.isArray(payload[collectionName])) {
            const collectionData = payload[collectionName];
            // Guardar la colección completa como un campo de array en un documento
            // Esto es simple pero no escala bien para colecciones grandes.
            // Para una app de verdad, se guardarían documentos individuales.
             const docRef = userRootCol.collection(collectionName).doc('all');
             batch.set(docRef, { data: collectionData });
             count += collectionData.length;
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
