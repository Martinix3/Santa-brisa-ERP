import { getApps, initializeApp, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';
import firebaseConfig from '../../firebase.json';

// Esta configuración usa las credenciales del entorno de ejecución.
// En Firebase Studio o Google Cloud, esto funciona automáticamente.
// Para desarrollo local, asegura que has ejecutado `gcloud auth application-default login`.
const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: firebaseConfig.client.projectId });


export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
