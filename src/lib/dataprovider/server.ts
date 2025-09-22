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
