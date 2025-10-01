// src/server/firebase.ts
// server-only
import { getApps, initializeApp, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// ---- ProjectId resolution (robust order) ----
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.warn('[firebase] projectId not defined; export GCLOUD_PROJECT/FIREBASE_PROJECT_ID.');
}

// ---- Single app (resists HMR) ----
// Use applicationDefault() to automatically use service account credentials in production
// or user credentials from gcloud (via `gcloud auth application-default login`) in local development.
// This is the standard and most secure way for server-side authentication with GCP/Firebase.
const app: App = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
});

export const adminDb = getFirestore(app);
// Firestore settings are idempotent
try {
  // @ts-ignore _settingsFrozen is internal, defensive check
  if (!(adminDb as any)?._settingsFrozen) {
    adminDb.settings({ ignoreUndefinedProperties: true });
  }
} catch {}

export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
export const FieldDocId = FieldPath.documentId();

// ---- Useful Helpers ----
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

// --- Dev-time warnings for environment setup ---
if (process.env.NODE_ENV === 'development') {
  if (!process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('[firebase] For local dev, either define GOOGLE_IMPERSONATE_SERVICE_ACCOUNT or run `gcloud auth application-default login`.');
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('[firebase] Using Firestore Emulator at', process.env.FIRESTORE_EMULATOR_HOST);
  }
}
