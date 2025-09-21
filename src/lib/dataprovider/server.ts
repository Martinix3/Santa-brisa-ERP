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
  for (const name of SANTA_DATA_COLLECTIONS) {
    try {
      const querySnapshot = await adminDb.collection(name).get();
      (data as any)[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error(`Error loading server collection ${name}:`, e);
      (data as any)[name] = [];
    }
  }
  
  serverDataCache = data as SantaData;
  cacheTimestamp = now;

  return serverDataCache;
}

/**
 * Inserts or updates multiple documents in a collection.
 * Uses Firestore batch writes for efficiency.
 */
export async function upsertMany(collectionName: keyof SantaData, items: any[]): Promise<void> {
  if (items.length === 0) return;

  const batch = adminDb.batch();
  const collectionRef = adminDb.collection(collectionName);

  for (const item of items) {
    if (!item.id) {
        console.warn(`Skipping item in ${collectionName} due to missing ID:`, item);
        continue;
    }
    const docRef = collectionRef.doc(item.id);
    batch.set(docRef, item, { merge: true });
  }

  await batch.commit();
}
