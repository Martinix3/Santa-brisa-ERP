// scripts/loadStressData.ts
import * as admin from "firebase-admin";
import * as fs from "fs";
import Papa from "papaparse";

// Inicializar Firebase Admin con credenciales por defecto (usa GOOGLE_APPLICATION_CREDENTIALS)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}


const db = admin.firestore();

// Mapa: CSV → colección destino en Firestore
const collections: Record<string, string> = {
  "stockmoves_stress.csv": "stockMoves",
  "lots_stress.csv": "lots",
  "qctests_stress.csv": "qc_tests",
  "orders_stress.csv": "ordersSellOut",
  "shipments_stress.csv": "shipments",
  "production_orders_stress.csv": "productionOrders",
  "bom_stress.csv": "boms",
};

async function importCsv(file: string, collection: string) {
  const text = fs.readFileSync(file, "utf8");
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

  const batch = db.batch();
  (data as any[]).forEach((row) => {
    if (!row.id) return; // cada fila debe tener un ID
    const ref = db.collection(collection).doc(row.id);
    batch.set(ref, row, { merge: true });
  });

  await batch.commit();
  console.log(`✅ Importado ${data.length} registros en ${collection}`);
}

async function main() {
  for (const [file, collection] of Object.entries(collections)) {
    const path = `/home/user/studio/stress_test_data/${file}`;
    if (fs.existsSync(path)) {
      await importCsv(path, collection);
    } else {
      console.warn(`⚠️ No se encontró ${file}`);
    }
  }
}

main().catch((err) => console.error(err));
