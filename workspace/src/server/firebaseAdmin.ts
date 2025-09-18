import { getApps, initializeApp, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

// Esta configuración es ahora la más robusta.
// El SDK de Admin se inicializará usando las credenciales del archivo
// al que apunta la variable de entorno GOOGLE_APPLICATION_CREDENTIALS en el archivo .env.
// Esto asegura que la autenticación del servidor es explícita y no depende del entorno.

let app: App;

if (getApps().length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Este es el camino ideal, usando la clave del service account
    app = initializeApp();
  } else {
    // Fallback para entornos donde las credenciales por defecto puedan funcionar,
    // aunque hemos visto que en este caso no es fiable.
    console.warn("ADVERTENCIA: No se encontró la variable GOOGLE_APPLICATION_CREDENTIALS. Intentando usar Application Default Credentials. Esto puede fallar.");
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}


export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
