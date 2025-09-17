// ❗ NUNCA importes este archivo desde componentes con "use client"
import 'server-only';
import * as admin from 'firebase-admin';
import { applicationDefault } from 'firebase-admin/app';

let firebaseAdminInitialized = false;

// Implementación del patrón Singleton para la inicialización de Firebase Admin.
// Usamos applicationDefault() para que el SDK use las credenciales del entorno
// (Application Default Credentials - ADC), ideal para Workstations y Cloud Run.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: applicationDefault(),
    });
    firebaseAdminInitialized = true;
    console.log('Firebase Admin SDK inicializado con éxito usando ADC.');
  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin con ADC:', error.message);
    // No relanzar el error para no parar el servidor, pero dejarlo claro en los logs.
  }
} else {
    firebaseAdminInitialized = true;
}

export const adminDb = (): admin.firestore.Firestore => {
    if (!firebaseAdminInitialized) {
        throw new Error("Firebase Admin no está inicializado. No se puede acceder a la base de datos.");
    }
    return admin.firestore();
};

export const adminAuth = (): admin.auth.Auth => {
    if (!firebaseAdminInitialized) {
        throw new Error("Firebase Admin no está inicializado. No se puede acceder a Auth.");
    }
    return admin.auth();
};
