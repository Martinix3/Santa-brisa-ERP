// ❗ NUNCA importes este archivo desde componentes con "use client"
import 'server-only';
import * as admin from 'firebase-admin';

let firebaseAdminInitialized = false;

// Implementación del patrón Singleton para la inicialización de Firebase Admin
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Comprueba si las variables de entorno necesarias están presentes
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error('Faltan variables de entorno de Firebase Admin. Asegúrate de que FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY están definidas.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    firebaseAdminInitialized = true;
    console.log('Firebase Admin SDK inicializado con éxito.');
  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin:', error.message);
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
