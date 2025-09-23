
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app =
  getApps()[0] ??
  initializeApp({
    credential: process.env.FIREBASE_CLIENT_EMAIL
      ? cert({
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          projectId: process.env.FIREBASE_PROJECT_ID!,
        })
      : applicationDefault(),
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
