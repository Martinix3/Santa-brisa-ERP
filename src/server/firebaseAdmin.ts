
// src/server/firebaseAdmin.ts
import * as admin from 'firebase-admin';
import firebaseConfig from '@/../firebase.json';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.client.projectId,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    // Solo inicializa si las credenciales están completas
    if (serviceAccount.clientEmail && serviceAccount.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
    } else {
        console.warn('Firebase Admin credentials are not fully set in environment variables. Admin features will be disabled.');
    }
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
