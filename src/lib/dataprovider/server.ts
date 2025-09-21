// src/lib/dataprovider/server.ts
import { SANTA_DATA_COLLECTIONS, type SantaData } from '@/domain';
import { adminDb } from '@/server/firebaseAdmin';

/**
 * Fetches all collections from Firestore.
 * This function ALWAYS fetches fresh data from the database.
 */
export async function getServerData(): Promise<SantaData> {
  console.log('[getServerData] Fetching fresh data from Firestore...');
  const data: Partial<SantaData> = {};
  const promises = SANTA_DATA_COLLECTIONS.map(async (name) => {
    try {
      const querySnapshot = await adminDb.collection(name).get();
      (data as any)[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error(`Error loading server collection ${name}:`, e);
      (data as any)[name] = []; // Return empty array on error for this collection
    }
  });
  
  await Promise.all(promises);
  console.log('[getServerData] Fresh data fetch complete.');
  return data as SantaData;
}

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
      batch.set(docRef, JSON.parse(JSON.stringify(item, (k,v) => v === undefined ? null : v)), { merge: true });
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
