// ❗ NUNCA importes este archivo desde componentes con "use client"
import 'server-only';
import * as admin from 'firebase-admin';

if (typeof window !== 'undefined') {
  throw new Error('firebaseAdmin solo puede usarse en el servidor');
}

// Implementación del patrón Singleton para la inicialización de Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
     console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error', error.stack);
  }
}

export const adminDb = () => admin.firestore();
export const adminAuth = () => admin.auth();
