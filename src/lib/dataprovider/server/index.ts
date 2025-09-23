import { db } from '@/lib/firebase/admin';
import { assertCollection } from '@/lib/ssot/collections';
import { SANTA_DATA_COLLECTIONS, type SantaData } from '@/domain';


type AnyDoc = Record<string, any>;

export async function getOne<T = AnyDoc>(col: string, id: string): Promise<T | null> {
  assertCollection(col);
  if (!id) throw new Error(`getOne(${col}): id vacío`);
  const snap = await db.collection(col).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as T) : null;
}

/**
 * upsertMany:
 * - valida ids
 * - usa BulkWriter (con retries automáticos)
 * - merge:true para no machacar otros campos
 */
export async function upsertMany<T extends { id: string }>(
  col: string,
  docs: T[],
): Promise<{ ok: true; count: number }> {
  assertCollection(col);
  if (!Array.isArray(docs) || !docs.length) return { ok: true, count: 0 };

  const writer = db.bulkWriter();
  let count = 0;
  for (const d of docs) {
    if (!d?.id || typeof d.id !== 'string') {
      throw new Error(`upsertMany(${col}): missing/invalid id`);
    }
    const { id, ...rest } = d as AnyDoc;
    const ref = db.collection(col).doc(id);
    writer.set(
      ref,
      { ...rest, updatedAt: rest.updatedAt ?? new Date().toISOString() },
      { merge: true },
    );
    count++;
  }
  await writer.close();
  return { ok: true, count };
}

/**
 * Fetches all collections from Firestore.
 * This function ALWAYS fetches fresh data from the database.
 */
export async function getServerData(): Promise<SantaData> {
  console.log('[getServerData] Fetching fresh data from Firestore...');
  const data: Partial<SantaData> = {};
  const promises = Array.from(SANTA_DATA_COLLECTIONS).map(async (name) => {
    try {
      const querySnapshot = await db.collection(name).get();
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
