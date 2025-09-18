import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

// Esta configuración es la más simple posible.
// Confía en que el entorno de ejecución (como Firebase Studio)
// proporcionará las credenciales por defecto (Application Default Credentials).
const app: App = getApps().length
  ? getApps()[0]
  : initializeApp();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
