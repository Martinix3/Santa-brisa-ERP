// src/server/firebaseAdmin.ts
import * as admin from 'firebase-admin';

function getProjectId(): string | undefined {
    return process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
}

if (!admin.apps.length) {
    console.log("[Firebase Admin] Initializing...");
    const projectId = getProjectId();
    
    if (projectId) {
        try {
            // Usa las credenciales de entorno por defecto (Application Default Credentials).
            // Esto es lo más robusto para entornos como Cloud Run, Cloud Shell, etc.
            admin.initializeApp({ projectId });
            console.log(`[Firebase Admin] Initialized successfully for project: ${projectId}`);
        } catch (e: any) {
            console.error('[Firebase Admin] Initialization failed:', e.message);
        }
    } else {
        console.error('[Firebase Admin] Initialization failed: Project ID could not be determined from environment variables.');
    }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
