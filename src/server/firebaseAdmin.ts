// src/server/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Al llamar a initializeApp() sin argumentos, usará las credenciales
// del entorno (Application Default Credentials). Esto es lo ideal para
// Cloud Run, Cloud Functions, y para desarrollo local con `gcloud auth application-default login`.
const app =
  getApps().length === 0
    ? initializeApp()
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);