
import admin from 'firebase-admin';

// Inicializa Admin con ADC (Application Default Credentials) o impersonation.
// No hace falta descargar JSON si usas Workstations/Cloud o `gcloud auth application-default login`.
export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const db = getAdminApp().firestore();
