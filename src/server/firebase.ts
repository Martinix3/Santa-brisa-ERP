// src/server/firebase.ts
// server-only
import { getApps, initializeApp, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// ---- ProjectId resolution (orden robusto)
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.warn('[firebase] projectId no definido; exporta GCLOUD_PROJECT/FIREBASE_PROJECT_ID.');
}

// ---- Single app (resiste HMR)
const app: App = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
});

export const adminDb = getFirestore(app);
// settings idempotentes
try {
  // @ts-ignore _settingsFrozen es interna, chequeo defensivo
  if (!(adminDb as any)?._settingsFrozen) {
    adminDb.settings({ ignoreUndefinedProperties: true });
  }
} catch {}

export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
export const FieldDocId = FieldPath.documentId();

// Helpers útiles
export function infoAdmin() {
  const p =
    projectId ||
    (adminDb as any)?._settings?.projectId ||
    (adminDb as any)?.app?.options?.projectId ||
    'unknown';
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${p}.appspot.com`;
  return { projectId: p, bucketName };
}
export function bucket() {
  const { bucketName } = infoAdmin();
  return adminStorage.bucket(bucketName);
}

// Avisos dev (impersonation/emuladores)
if (process.env.NODE_ENV === 'development') {
  if (!process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT) {
    console.warn('[firebase] Sin GOOGLE_IMPERSONATE_SERVICE_ACCOUNT en dev; ADC usará tu usuario gcloud.');
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('[firebase] Usando Firestore Emulator en', process.env.FIRESTORE_EMULATOR_HOST);
  }
}
