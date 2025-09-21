// server-only
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function init() {
  // Fuerza SIEMPRE el projectId correcto (no uses GCLOUD_PROJECT)
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "santa-brisa-erp";

  return initializeApp({
    credential: applicationDefault(), // ← ADC (App Hosting o gcloud + impersonation)
    projectId,                       // ← clave para que verifyIdToken espere el aud correcto
  });
}

const app = getApps().length ? getApps()[0] : init();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
