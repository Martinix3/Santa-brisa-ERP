// ❗ NUNCA importes este archivo desde componentes con "use client"
import 'server-only';
import * as admin from 'firebase-admin';

if (typeof window !== 'undefined') {
  throw new Error('firebaseAdmin solo puede usarse en el servidor');
}

// Implementación del patrón Singleton para la inicialización de Firebase Admin
if (!admin.apps.length) {
  try {
    // Comprueba si las variables de entorno necesarias están presentes
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Faltan variables de entorno de Firebase Admin. Asegúrate de que FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY están definidas.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
     console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
    // No relanzar el error para no parar el servidor, pero dejarlo claro en los logs.
  }
}

export const adminDb = () => {
    if (!admin.apps.length) {
        console.error("Firebase Admin no está inicializado. No se puede acceder a la base de datos.");
        // Devolver un objeto 'dummy' para evitar que la app crashee en el punto de llamada, aunque las operaciones fallarán.
        // Lo ideal sería que las funciones que lo usan comprueben si la inicialización fue exitosa.
        return {} as admin.firestore.Firestore;
    }
    return admin.firestore();
};

export const adminAuth = () => {
    if (!admin.apps.length) {
        console.error("Firebase Admin no está inicializado. No se puede acceder a Auth.");
        return {} as admin.auth.Auth;
    }
    return admin.auth();
};
