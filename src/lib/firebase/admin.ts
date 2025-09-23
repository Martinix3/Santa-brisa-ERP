
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Usa singletons colgados de globalThis para sobrevivir a Fast Refresh en dev.
// Evita "settings() once" y re-inicializaciones.
const globalForFirebase = globalThis as unknown as {
  __SB_ADMIN_APP?: ReturnType<typeof initializeApp>;
  __SB_DB?: ReturnType<typeof getFirestore>;
  __SB_DB_SETTINGS_DONE?: boolean;
  __SB_STORAGE?: ReturnType<typeof getStorage>;
};

const app =
  globalForFirebase.__SB_ADMIN_APP ??
  (globalForFirebase.__SB_ADMIN_APP = (getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    })));

export const db =
  globalForFirebase.__SB_DB ?? (globalForFirebase.__SB_DB = getFirestore(app));

// Aplica settings una sola vez por proceso (o por HMR session)
if (!globalForFirebase.__SB_DB_SETTINGS_DONE) {
  // @ts-expect-error internals pueden variar por versión
  const alreadyFrozen = (db as any)?._settingsFrozen === true;
  if (!alreadyFrozen) {
    db.settings({ ignoreUndefinedProperties: true });
  }
  globalForFirebase.__SB_DB_SETTINGS_DONE = true;
}

export function infoAdmin() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    // @ts-expect-error acceso interno depende de versión
    (db as any)?._settings?.projectId ||
    // @ts-expect-error app.options puede existir
    (db as any)?.app?.options?.projectId ||
    'unknown';
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`;
  return { projectId, bucketName };
}

export const storage =
  globalForFirebase.__SB_STORAGE ?? (globalForFirebase.__SB_STORAGE = getStorage(app));
export function bucket() {
  const { bucketName } = infoAdmin();
  return storage.bucket(bucketName);
}
