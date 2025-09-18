
import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS, SantaData } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = adminDb;
    const userRootRef = db.collection('userData').doc(userId);
    const fetchedData: Partial<SantaData> = {};

    for (const collectionName of SANTA_DATA_COLLECTIONS) {
      const collectionRef = userRootRef.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      const items: any[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      (fetchedData as any)[collectionName as keyof SantaData] = items;
    }

    return NextResponse.json(fetchedData);

  } catch (e: any) {
    console.error(`[API GET /brain-persist] Firestore fetch error for user ${userId}:`, e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown server error fetching data.' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json();

    if (payload.persistenceEnabled === false) {
      return NextResponse.json({ ok: true, message: 'Persistence disabled. No data was saved.' });
    }

    if (!payload || typeof payload !== 'object' || !payload.data) {
        return NextResponse.json({ ok: false, error: 'Invalid payload. Expecting an object with a "data" property.' }, { status: 400 });
    }

    const db = adminDb;
    const batch = db.batch();
    let operationsCount = 0;
    const userRootRef = db.collection('userData').doc(userId);

    const fullData = payload.data as SantaData;

    for (const collectionName of SANTA_DATA_COLLECTIONS) {
        const collectionData = fullData[collectionName as keyof SantaData] as any[];
        if (Array.isArray(collectionData)) {
            const collectionRef = userRootRef.collection(collectionName);
            collectionData.forEach(item => {
                if (item && item.id) {
                    const docRef = collectionRef.doc(item.id);
                    batch.set(docRef, item, { merge: true });
                    operationsCount++;
                }
            });
        }
    }
    
    if (operationsCount > 0) {
        await batch.commit();
        console.log(`[API POST /brain-persist] Successfully committed ${operationsCount} documents for user ${userId}.`);
    } else {
        console.log(`[API POST /brain-persist] No valid documents to commit for user ${userId}.`);
    }
    
    return NextResponse.json({ ok: true, message: `${operationsCount} documents saved.` });

  } catch (e: any) {
    console.error(`[API POST /brain-persist] Firestore write error for user ${userId}:`, e);
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}
