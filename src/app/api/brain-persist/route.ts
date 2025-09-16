// src/app/api/brain-persist/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';

// Forzar el runtime de Node.js, ya que firebase-admin no es compatible con el Edge Runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const newEntities = await req.json();

    // Log para depuración, como sugeriste.
    console.log('[brain-persist] Received entities to save:', Object.keys(newEntities));

    const db = adminDb();
    const batch = db.batch();
    let count = 0;

    for (const it of newEntities?.interactions ?? []) {
      if (!it.id) continue;
      const ref = db.collection("interactions").doc(it.id);
      batch.set(ref, it, { merge: true });
      count++;
    }
    for (const o of newEntities?.ordersSellOut ?? []) {
      if (!o.id) continue;
      // Guardamos en 'orders' para ser consistentes.
      const ref = db.collection("orders").doc(o.id);
      batch.set(ref, o, { merge: true });
      count++;
    }
    for (const e of newEntities?.mktEvents ?? []) {
      if (!e.id) continue;
      const ref = db.collection("events").doc(e.id);
      batch.set(ref, e, { merge: true });
      count++;
    }
    for (const acc of newEntities?.accounts ?? []) {
      if (!acc.id) continue;
      const ref = db.collection("accounts").doc(acc.id);
      batch.set(ref, acc, { merge: true });
      count++;
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`[brain-persist] Successfully committed ${count} entities to Firestore.`);
    } else {
      console.log('[brain-persist] No valid entities to commit.');
    }
    
    return NextResponse.json({ ok: true, message: `${count} entities saved.` });

  } catch (e:any) {
    console.error('Error in /api/brain-persist:', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown server error.' }, { status: 500 });
  }
}