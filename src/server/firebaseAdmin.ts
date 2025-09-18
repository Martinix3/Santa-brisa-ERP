import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';
import firebaseConfig from '../../firebase.json';

// Esta configuración simplificada usa las credenciales del entorno de desarrollo
// que se establecen al ejecutar `firebase login`. Es la forma más robusta
// para el desarrollo local sin gestionar archivos de service account.
const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: firebaseConfig.client.projectId });


export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
