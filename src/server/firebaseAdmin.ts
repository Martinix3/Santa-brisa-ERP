import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';
import firebaseConfig from '../../firebase.json';

// Usar la configuración del cliente directamente. 
// El SDK de Admin utilizará las credenciales del entorno de ejecución (Application Default Credentials),
// que es el método estándar en entornos de Google Cloud como Firebase Studio.
const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: firebaseConfig.client.projectId });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
