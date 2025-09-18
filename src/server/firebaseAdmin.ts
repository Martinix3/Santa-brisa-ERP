import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Usamos ADC (recomendado en Workstations/Cloud). No se necesitan claves en .env
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
    });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
