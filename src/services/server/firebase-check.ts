
// src/services/server/firebase-check.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// Inicializa Firebase Admin solo si no está ya inicializado
let firebaseAdminInitialized = false;
if (getApps().length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Faltan variables de entorno de Firebase. Asegúrate de que FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY están definidas en tu archivo .env');
    }
    
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    firebaseAdminInitialized = true;
  } catch (e: any) {
    console.error("Error inicializando Firebase Admin en check-script:", e.message);
  }
}


/**
 * Test rápido de permisos Firestore (lectura y escritura).
 * Devuelve true si todo va bien, false si hay error.
 */
export async function checkFirebasePermissions(): Promise<boolean> {
  if (!firebaseAdminInitialized) {
    console.error("❌ La inicialización de Firebase Admin falló. No se puede continuar con la comprobación de permisos.");
    return false;
  }
  
  const db = getFirestore();

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
    if (err.message.includes('permission-denied')) {
        console.error("Detalle: La cuenta de servicio no tiene los roles de IAM necesarios en Google Cloud. Asegúrate de que tiene el rol 'Editor de datos de Cloud Firestore'.");
    }
    return false;
  }
}

// Si ejecutas directamente con ts-node
if (require.main === module) {
  checkFirebasePermissions().then((ok) => {
    if (ok) {
        console.log("✅ FIREBASE OK. Conexión y permisos de lectura/escritura verificados.");
    } else {
        console.log("❌ FIREBASE FAIL. Revisa los errores anteriores.");
    }
    process.exit(ok ? 0 : 1);
  });
}
