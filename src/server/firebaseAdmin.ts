import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';
import firebaseConfig from '../../firebase.json';

// Esta es la configuración más simple y estándar.
// Confía en que el entorno de ejecución (como Firebase Studio)
// proporcionará las credenciales por defecto (Application Default Credentials).
const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({
    // Utiliza la configuración del proyecto del cliente para asegurar consistencia
    projectId: firebaseConfig.client.projectId,
  });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
