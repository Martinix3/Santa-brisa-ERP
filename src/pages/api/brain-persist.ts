import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/server/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { 
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  try {
    const newEntities = req.body;
    const db = adminDb();
    const batch = db.batch();

    for (const it of newEntities?.interactions ?? []) {
        const ref = db.collection("interactions").doc(it.id);
        batch.set(ref, it, { merge: true });
    }
    for (const o of newEntities?.ordersSellOut ?? []) {
        const ref = db.collection("orders").doc(o.id);
        batch.set(ref, o, { merge: true });
    }
    for (const e of newEntities?.mktEvents ?? []) {
        const ref = db.collection("events").doc(e.id);
        batch.set(ref, e, { merge: true });
    }
    for (const acc of (newEntities as any)?.accounts ?? []) {
        const ref = db.collection("accounts").doc(acc.id);
        batch.set(ref, acc, { merge: true });
    }
    
    await batch.commit();
    
    res.status(200).json({ ok: true, message: 'Entities saved.' });
  } catch (e:any) {
    console.error('Error in brain-persist API:', e);
    res.status(500).json({ ok:false, error: e?.message || 'Unknown server error.' });
  }
}
