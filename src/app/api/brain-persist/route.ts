
// src/app/api/brain-persist/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';

// Forzar el runtime de Node.js, ya que firebase-admin no es compatible con el Edge Runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = adminDb();
    const collections = [
        'users', 'accounts', 'products', 'materials', 'distributors', 'interactions', 'ordersSellOut', 
        'shipments', 'lots', 'inventory', 'stockMoves', 'billOfMaterials', 'productionOrders', 
        'qaChecks', 'suppliers', 'traceEvents', 'goodsReceipts', 'mktEvents', 'onlineCampaigns', 
        'creators', 'influencerCollabs'
    ];
    
    const santaData: any = {};
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      santaData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json(santaData);
  } catch (e:any) {
    console.error('Error fetching all collections from Firestore:', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error fetching data.' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ ok: false, error: 'Invalid payload. Expecting an object of collections.' }, { status: 400 });
    }

    const db = adminDb();
    const batch = db.batch();
    let count = 0;

    for (const collectionName in payload) {
        if (Array.isArray(payload[collectionName])) {
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
