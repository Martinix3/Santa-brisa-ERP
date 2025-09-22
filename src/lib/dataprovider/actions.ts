// src/lib/dataprovider/actions.ts
'use server';

import type { SantaData } from '@/domain';
import { adminDb } from '@/server/firebaseAdmin';

/**
 * Inserts or updates multiple documents in a collection.
 * Uses Firestore batch writes for efficiency.
 * @param collectionName The name of the collection to update.
 * @param items An array of documents to upsert. Each document must have an 'id'.
 * @returns An object with the count of inserted/updated documents.
 */
export async function upsertMany(collectionName: keyof SantaData, items: any[]): Promise<{ inserted: number, updated: number, ids: string[] }> {
  if (!items || items.length === 0) return { inserted: 0, updated: 0, ids: [] };

  const collectionRef = adminDb.collection(collectionName);
  const existingDocIds = new Set((await collectionRef.select().get()).docs.map(d => d.id));
  
  let inserted = 0;
  let updated = 0;
  const ids: string[] = [];

  // Firestore allows a maximum of 500 operations in a single batch.
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = adminDb.batch();
    const chunk = items.slice(i, i + batchSize);

    for (const item of chunk) {
      if (!item.id) {
          console.warn(`Skipping item in ${collectionName} due to missing ID:`, item);
          continue;
      }
      const docRef = collectionRef.doc(item.id);
      // Clean undefined values before sending to Firestore
      const cleanItem = JSON.parse(JSON.stringify(item, (k,v) => v === undefined ? null : v));
      batch.set(docRef, cleanItem, { merge: true });
      ids.push(item.id);
      
      if (existingDocIds.has(item.id)) {
        updated++;
      } else {
        inserted++;
      }
    }
    await batch.commit();
  }

  return { inserted, updated, ids };
}
