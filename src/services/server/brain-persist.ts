import { adminDb } from '@/server/firebaseAdmin';

// normaliza y salva en Firestore lo que devuelve Santa Brain
export async function saveNewEntities(newEntities: any) {
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
  // opcionales devueltos por tools (enrich, upsert, report)
  for (const acc of (newEntities as any)?.accounts ?? []) {
    const ref = db.collection("accounts").doc(acc.id);
    batch.set(ref, acc, { merge: true });
  }
  await batch.commit();
}
