// server-only
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function init() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT && process.env.NODE_ENV === 'development') {
    console.warn(`
      ===============================================================
      ATENCIÓN: La variable GOOGLE_IMPERSONATE_SERVICE_ACCOUNT no está
      definida. El SDK de Admin podría no funcionar correctamente para
      escrituras en Firestore.
      Ejecuta el servidor con 'npm run dev' o 'npm run dev:sa'.
      ===============================================================
    `);
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

const app = getApps().length ? getApps()[0] : init();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
