
// src/server/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// This is a minimal setup. If the server environment has Application Default Credentials (ADC),
// this will work. If not, it will throw an error, but only when a function that uses it (e.g., adminDb) is called.
// By removing server-side DB calls, we avoid triggering this error.

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (error: any) {
    console.warn('Firebase Admin initialization skipped. Server-side Firebase features will not be available.', error.message);
  }
}

// Exporting these will now be safe as long as they are not used server-side without proper credentials.
// We are moving to a client-side first approach for Firebase interactions.
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
