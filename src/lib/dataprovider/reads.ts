import { getFirestore } from "firebase-admin/firestore";

export async function getManyByIds<T = any>(
  collection: string,
  ids: string[]
): Promise<Array<T & { id: string }>> {
  const db = getFirestore();
  if (!ids?.length) return [];
  const chunkSize = 300;
  const out: Array<T & { id: string }> = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const refs = slice.map((id) => db.collection(collection).doc(id));
    // @ts-ignore admin.getAll
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) if (snap.exists) out.push({ id: snap.id, ...(snap.data() as T) });
  }
  return out;
}
export const getDocsByIds = getManyByIds;
