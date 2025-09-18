import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Usamos ADC (recomendado en Workstations/Cloud). Si necesitas SA JSON, cámbialo abajo.
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      // projectId opcional si ADC ya la detecta:
      // projectId: process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
