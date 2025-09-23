
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(), // ✅ usa ADC (en PROD = SA del runtime; en DEV = gcloud/impersonation)
    projectId: process.env.FIREBASE_PROJECT_ID, // fuerza el proyecto correcto
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
  return { projectId };
}
