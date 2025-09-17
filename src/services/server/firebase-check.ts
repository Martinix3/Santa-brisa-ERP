
// src/services/server/firebase-check.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa Firebase Admin solo si no está ya inicializado
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  } catch (e: any) {
    console.error("Error inicializando Firebase Admin en check-script:", e.message);
    // No continuamos si la inicialización falla.
  }
}

const db = getFirestore();

/**
 * Test rápido de permisos Firestore (lectura y escritura).
 * Devuelve true si todo va bien, false si hay error.
 */
export async function checkFirebasePermissions(): Promise<boolean> {
  if (getApps().length === 0) {
    console.error("❌ La inicialización de Firebase Admin falló. No se puede continuar con la comprobación de permisos.");
    return false;
  }
  
  try {
    const ref = db.collection("test_perms").doc("check");

    // Escribir
    await ref.set({
      ok: true,
      ts: new Date().toISOString(),
    });

    // Leer
    const snap = await ref.get();
    if (!snap.exists || !snap.data()?.ok) {
        throw new Error("El documento de prueba no se pudo leer correctamente.");
    }
    
    return true;
  } catch (err: any) {
    console.error("❌ Error en permisos Firebase:", err.message);
    return false;
  }
}

// Si ejecutas directamente con ts-node
if (require.main === module) {
  checkFirebasePermissions().then((ok) => {
    console.log(ok ? "✅ FIREBASE OK" : "❌ FIREBASE FAIL");
    process.exit(ok ? 0 : 1);
  });
}
