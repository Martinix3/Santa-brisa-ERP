
// src/server/firebaseAdmin.ts
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import clientConfig from '@/../firebase.json';

// Función robusta para cargar credenciales de servicio desde múltiples fuentes
function loadServiceAccount(): ServiceAccount | null {
  // 1) Base64 en env
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const raw = Buffer.from(b64, 'base64').toString('utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64", e);
    }
  }

  // 2) JSON directo en env
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
    }
  }

  // 3) Variables sueltas (FSA_ o FIREBASE_)
  const projectId = getProjectId();
  const clientEmail = process.env.FSA_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FSA_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  
  if (projectId && clientEmail && privateKey) {
    return {
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    } as ServiceAccount;
  }

  return null;
}

export function getProjectId(): string | undefined {
    // Busca el project ID en las variables de entorno comunes.
    return process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || clientConfig?.client.projectId;
}


if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount && serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error('Firebase Admin initialization error with explicit credentials:', error.message);
    }
  } else {
    // Si no hay credenciales explícitas, intenta con Application Default Credentials (ADC)
    // Esto funciona en Cloud Run, Cloud Functions, o con `gcloud auth application-default login`
    try {
        admin.initializeApp({
            projectId: getProjectId(),
        });
    } catch (e: any) {
        console.warn('Firebase Admin credentials not found via env vars. ADC will be attempted. Error:', e.message);
        // Si initializeApp() sin args falla, es que ADC tampoco está configurado.
        // No hacemos nada, el adminDb será null y la API fallará con el mensaje correcto.
    }
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
