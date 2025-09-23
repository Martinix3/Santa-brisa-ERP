
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const app =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(), // ✅ usa ADC (en PROD = SA del runtime; en DEV = gcloud/impersonation)
    projectId: process.env.FIREBASE_PROJECT_ID, // fuerza el proyecto correcto
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
  });

export const db = getFirestore(app);
// Muy importante para no romper por undefined en docs parciales
db.settings({ ignoreUndefinedProperties: true });

export function infoAdmin() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    (db as any)?._settings?.projectId ||
    (db as any)?.app?.options?.projectId ||
    'unknown';
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`;
  return { projectId, bucketName };
}

export const storage = getStorage(app);
export function bucket() {
  const { bucketName } = infoAdmin();
  return storage.bucket(bucketName);
}
