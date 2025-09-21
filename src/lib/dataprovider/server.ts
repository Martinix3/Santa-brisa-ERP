// src/lib/dataprovider/server.ts
import { SANTA_DATA_COLLECTIONS, type SantaData } from '@/domain';
import { adminDb } from '@/server/firebaseAdmin';

let serverDataCache: SantaData | null = null;
let cacheTimestamp = 0;

/**
 * Fetches all collections from Firestore.
 * Caches the result for 1 minute to avoid excessive reads during a single operation.
 */
export async function getServerData(): Promise<SantaData> {
  const now = Date.now();
  if (serverDataCache && (now - cacheTimestamp < 60000)) {
    return serverDataCache;
  }

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

  serverDataCache = data as SantaData;
  cacheTimestamp = now;

  return serverDataCache;
}

/**
 * Inserts or updates multiple documents in a collection.
 * Uses Firestore batch writes for efficiency.
 * @param collectionName The name of the collection to update.
 * @param items An array of documents to upsert. Each document must have an 'id'.
 * @returns An object with the count of inserted/updated documents.
 */
export async function upsertMany(collectionName: keyof SantaData, items: any[]): Promise<{ inserted: number, updated: number }> {
  if (!items || items.length === 0) return { inserted: 0, updated: 0 };

  const collectionRef = adminDb.collection(collectionName);
  const existingDocIds = new Set((await collectionRef.select().get()).docs.map(d => d.id));
  
  let inserted = 0;
  let updated = 0;

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
      batch.set(docRef, item, { merge: true });
      
      if (existingDocIds.has(item.id)) {
        updated++;
      } else {
        inserted++;
      }
    }
    await batch.commit();
  }

  // Invalidate server cache after writing
  serverDataCache = null;
  cacheTimestamp = 0;

  return { inserted, updated };
}
