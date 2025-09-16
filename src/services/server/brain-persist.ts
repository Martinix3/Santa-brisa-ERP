import { db } from "@/lib/firebase-admin";
import type { SantaData } from "@/domain/ssot";

// normaliza y salva en Firestore lo que devuelve Santa Brain
export async function saveNewEntities(newEntities: Partial<SantaData>) {
  if (!db) {
    console.error("Firestore DB is not initialized. Skipping saveNewEntities.");
    return;
  }
  const batch = db.batch();

  for (const it of newEntities?.interactions ?? []) {
    const ref = db.collection("interactions").doc(it.id);
    batch.set(ref, it, { merge: true });
  }
  for (const o of newEntities?.ordersSellOut ?? []) {
    const ref = db.collection("ordersSellOut").doc(o.id);
    batch.set(ref, o, { merge: true });
  }
  for (const e of newEntities?.mktEvents ?? []) {
    const ref = db.collection("mktEvents").doc(e.id);
    batch.set(ref, e, { merge: true });
  }
  // opcionales devueltos por tools (enrich, upsert, report)
  for (const acc of newEntities?.accounts ?? []) {
    const ref = db.collection("accounts").doc(acc.id);
    batch.set(ref, acc, { merge: true });
  }
  
  try {
    await batch.commit();
    console.log("Batch commit successful for new entities.");
  } catch (error) {
    console.error("Error committing batch for new entities:", error);
  }
}
