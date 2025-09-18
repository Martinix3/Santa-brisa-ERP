import { adminDb } from '@/server/firebaseAdmin';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

// normaliza y salva en Firestore lo que devuelve Santa Brain
export async function saveNewEntities(newEntities: any) {
  const db = adminDb;
  if (typeof db.batch !== 'function') {
      console.error('Firestore no está disponible, no se pueden guardar las entidades.');
      return;
  }
  const batch = db.batch();
  let operationsCount = 0;

  for (const collectionName in newEntities) {
    if (Object.prototype.hasOwnProperty.call(newEntities, collectionName) && SANTA_DATA_COLLECTIONS.includes(collectionName as any)) {
      const items = newEntities[collectionName];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.id) {
            const ref = db.collection(collectionName).doc(item.id);
            batch.set(ref, item, { merge: true });
            operationsCount++;
          }
        }
      }
    }
  }

  if (operationsCount > 0) {
    await batch.commit();
    console.log(`[brain-persist] ${operationsCount} operaciones guardadas en Firestore.`);
  }
}
