// scripts/migrate-dev-userdata.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

// Subcolecciones que ves en userData/dev-user-fixed-id
const SOURCE_SUBS = [
  "accounts","billOfMaterials","creators","distributors","goodsReceipts",
  "influencerCollabs","interactions","inventory","lots","mktEvents",
  "orders", // <- en dev estaba como "orders"
  "productionOrders","qaChecks","shipments","stockMoves","suppliers","traceEvents",
  // si existen
  "products","materials","onlineCampaigns","activations",
  "receipts","purchaseOrders","priceLists","nonConformities","supplierBills","payments"
];

// Mapeo a nombres SSOT destino
const MAP: Record<string,string> = {
  orders: "ordersSellOut",
  // los demás igual nombre
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
