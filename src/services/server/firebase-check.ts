
// src/services/server/firebase-check.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa Firebase Admin solo si no está ya inicializado
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID_STAGING,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

/**
 * Test rápido de permisos Firestore (lectura y escritura).
 * Devuelve true si todo va bien, false si hay error.
 */
export async function checkFirebasePermissions(): Promise<boolean> {
  try {
    const ref = db.collection("test_perms").doc("check");

    // Escribir
    await ref.set({
      ok: true,
      ts: new Date().toISOString(),
    });

    // Leer
    const snap = await ref.get();
    console.log("✅ Permisos OK, datos leídos:", snap.data());

    return true;
  } catch (err) {
    console.error("❌ Error en permisos Firebase:", err);
    return false;
  }
}

// Si ejecutas directamente con ts-node
if (require.main === module) {
  checkFirebasePermissions().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
