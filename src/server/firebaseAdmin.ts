import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

// Esta es la configuración recomendada para producción y entornos portables.
// La app se autentica usando un archivo de credenciales de Service Account.
// La ruta a este archivo se debe especificar en la variable de entorno GOOGLE_APPLICATION_CREDENTIALS.

let serviceAccount;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // En un entorno de servidor real (producción, etc.), la variable de entorno contendrá el JSON directamente.
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
} catch (e) {
  console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS. Make sure it is a valid JSON string.', e);
}


const app = getApps().length
  ? getApps()[0]
  : initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);


export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
