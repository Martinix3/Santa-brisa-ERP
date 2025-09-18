
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

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { collection, data, persistenceEnabled } = await req.json();

    if (persistenceEnabled === false) {
      return NextResponse.json({ ok: true, message: 'Persistence disabled. No data was saved.' });
    }

    if (!collection || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid payload. "collection" (string) and "data" (array) are required.' }, { status: 400 });
    }

    if (!SANTA_DATA_COLLECTIONS.includes(collection as keyof SantaData)) {
      return NextResponse.json({ error: `Collection "${collection}" is not valid.` }, { status: 400 });
    }
    
    const db = adminDb;
    const batch = db.batch();
    const collectionRef = db.collection('userData').doc(userId).collection(collection);

    // To be safe, let's delete existing documents in this collection for this user
    // In a real production environment, you might want a more nuanced update strategy.
    const snapshot = await collectionRef.get();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Now add all the new data
    data.forEach(item => {
        if(item && item.id) {
            const docRef = collectionRef.doc(item.id);
            batch.set(docRef, item);
        }
    });

    await batch.commit();

    console.log(`[api/dev/save-data] Collection '${collection}' was overwritten for user ${userId}.`);
    
    return NextResponse.json({ ok: true, message: `Collection '${collection}' saved successfully.` });

  } catch (e: any) {
    console.error(`[API /api/dev/save-data] Error for user ${userId}:`, e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}
