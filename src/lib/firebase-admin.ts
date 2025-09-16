import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(), // usa GOOGLE_APPLICATION_CREDENTIALS
    });
  } catch (e) {
    console.error("Firebase Admin initialization error", e);
  }
}
export const db = admin.firestore();
