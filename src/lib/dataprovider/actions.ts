'use server';

import type { SantaData } from '@/domain/ssot.v7';
import { adminDb, FieldDocId, infoAdmin } from '@/server/firebase';

/**
 * Inserts or updates multiple documents in a collection.
 * Uses Firestore batch writes for efficiency.
 * @param collectionName The name of the collection to update.
 * @param items An array of documents to upsert. Each document must have an 'id'.
 * @returns An object with the count of inserted/updated documents.
 */
export async function upsertMany(collectionName: keyof SantaData, items: any[]): Promise<{ inserted: number, updated: number, ids: string[] }> {
  if (!items?.length) return { inserted: 0, updated: 0, ids: [] };

  try {
    const colRef = adminDb.collection(String(collectionName));
    const snap = await colRef.select(FieldDocId).get();
    const existing = new Set(snap.docs.map(d => d.id));

    const ids: string[] = [];
    let inserted = 0, updated = 0;
    const batchSize = 500;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = adminDb.batch();
      for (const it of items.slice(i, i + batchSize)) {
        if (!it?.id) continue;
        const ref = colRef.doc(it.id);
        const clean = JSON.parse(JSON.stringify(it, (k, v) => (v === undefined ? null : v)));
        batch.set(ref, clean, { merge: true });
        ids.push(it.id);
        existing.has(it.id) ? updated++ : inserted++;
      }
      await batch.commit();
    }
    return { inserted, updated, ids };
  } catch (err: any) {
    const { projectId } = infoAdmin();
    console.error('[upsertMany] Firestore error', {
      code: err?.code, message: err?.message, projectId, collectionName
    });
    throw err;
  }
}
