
// scripts/migrate-dev-userdata.ts
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';

function loadServiceAccount(): ServiceAccount | null {
  // 1) Base64 en env
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(raw);
  }

  // 2) JSON directo en env
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    return JSON.parse(json);
  }

  // 3) Variables sueltas tipo FSA_PROJECT_ID, FSA_CLIENT_EMAIL, FSA_PRIVATE_KEY
  const pid = process.env.FSA_PROJECT_ID;
  const email = process.env.FSA_CLIENT_EMAIL;
  const key = process.env.FSA_PRIVATE_KEY?.replace(/\\n/g, '\n'); // importante para claves con \n
  if (pid && email && key) {
    return {
      project_id: pid,
      client_email: email,
      private_key: key,
    } as ServiceAccount;
  }
  
    // 3.5) Fallback a las variables originales (compatibilidad)
  const oldPid = process.env.FIREBASE_PROJECT_ID;
  const oldEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const oldKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if(oldPid && oldEmail && oldKey){
      return {
          project_id: oldPid,
          client_email: oldEmail,
          private_key: oldKey
      } as ServiceAccount
  }


  return null;
}

const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

// 4) Inicialización flexible:
// - Si hay emulador → no hacen falta credenciales.
// - Si hay service account → cert(...).
// - Si no, intenta Application Default Credentials (ADC).
const sa = loadServiceAccount();

if (useEmulator) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FSA_PROJECT_ID || 'demo-santabrisa',
  });
} else if (sa) {
  if (typeof sa.project_id !== 'string' || !sa.project_id) {
    throw new Error('Service account inválida: falta "project_id" (string).');
  }
  initializeApp({ credential: cert(sa) });
} else {
  // Requiere GOOGLE_APPLICATION_CREDENTIALS o gcloud ADC configurado
  try {
    initializeApp({ credential: applicationDefault() });
  } catch(e:any) {
      console.error("Firebase Admin SDK - Application Default Credentials (ADC) no encontradas.");
      console.error("Info: Para ejecutar este script necesitas credenciales de servidor. Puedes:");
      console.error("1. Configurar variables de entorno (p.ej. FIREBASE_SERVICE_ACCOUNT_BASE64).");
      console.error("2. Apuntar a un emulador con FIRESTORE_EMULATOR_HOST.");
      console.error("3. Autenticarte con `gcloud auth application-default login`.");
      throw e;
  }
}

const db = getFirestore();

// Subcolecciones que ves en userData/dev-user-fixed-id
const SOURCE_SUBS = [
  "accounts","billOfMaterials","creators","distributors","goodsReceipts",
  "influencerCollabs","interactions","inventory","lots","mktEvents",
  "ordersSellOut", // <- Nombre correcto
  "productionOrders","qaChecks","shipments","stockMoves","suppliers","traceEvents",
  // si existen
  "products","materials","onlineCampaigns","activations",
  "receipts","purchaseOrders","priceLists","nonConformities","supplierBills","payments"
];

// Mapeo a nombres SSOT destino (ya no es necesario para 'orders', pero se deja por si hay otros casos)
const MAP: Record<string,string> = {
  // orders: "ordersSellOut",
};

async function run() {
  const srcRoot = db.collection("userData").doc("dev-user-fixed-id");
  for (const sub of SOURCE_SUBS) {
    const snap = await srcRoot.collection(sub).get();
    if (snap.empty) {
      console.log(`No documents found in ${sub}, skipping.`);
      continue;
    }

    const destName = MAP[sub] || sub;
    const batch = db.batch();
    snap.docs.forEach(d => {
      const destRef = db.collection(destName).doc(d.id);
      batch.set(destRef, d.data(), { merge: true });
    });
    await batch.commit();
    console.log(`Migrated ${snap.size} docs: ${sub} -> ${destName}`);
  }
  console.log("Migration complete!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
