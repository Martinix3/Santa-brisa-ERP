
import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS, SantaData } from '@/domain/ssot';
import { realSantaData } from '@/domain/real-data';


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
    
    const userRootCol = db.collection('userData').doc(decodedToken.uid);

    let hasData = false;
    const fetchedData: Partial<SantaData> = {};

    for (const collectionName of SANTA_DATA_COLLECTIONS) {
        const docRef = userRootCol.collection(collectionName).doc('all');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            fetchedData[collectionName as keyof SantaData] = docSnap.data()?.data || [];
            if ((docSnap.data()?.data || []).length > 0) {
                hasData = true;
            }
        } else {
            (fetchedData as any)[collectionName as keyof SantaData] = [];
        }
    }

    if (!hasData) {
        // Si no hay absolutamente nada en Firestore para este usuario, devolvemos
        // un objeto SantaData vacío pero bien formado. El frontend lo fusionará.
        const emptyData: Partial<SantaData> = {};
        SANTA_DATA_COLLECTIONS.forEach(key => {
            (emptyData as any)[key] = [];
        });
        return NextResponse.json(emptyData);
    }

    return NextResponse.json(fetchedData);

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
    let operationsCount = 0;

    const userRootCol = db.collection('userData').doc(decodedToken.uid);

    for (const collectionName in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, collectionName) && SANTA_DATA_COLLECTIONS.includes(collectionName as any)) {
            const collectionData = payload[collectionName];
            if(Array.isArray(collectionData)) {
                const docRef = userRootCol.collection(collectionName).doc('all');
                batch.set(docRef, { data: collectionData }, { merge: false }); // Sobrescribir el documento completo
                operationsCount++;
            }
        }
    }
    
    if (operationsCount === 0) {
        console.log('[api/brain-persist] No valid collections to commit.');
        return NextResponse.json({ ok: true, message: 'No valid data to save.' });
    }
    
    await batch.commit();
    console.log(`[api/brain-persist] Successfully committed data for ${operationsCount} collections for user ${decodedToken.email}.`);
    
    return NextResponse.json({ ok: true, message: `${operationsCount} collections saved.` });

  } catch (e:any) {
    console.error('Auth error or Firestore write error in POST:', e);
     if (e.message.includes("Authentication token is invalid or expired")) {
      return NextResponse.json({ ok:false, error: e.message }, { status: 401 });
    }
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}
