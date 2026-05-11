#!/usr/bin/env ts-node
/**
 * Export Firestore a JSON plano
 * Usa la misma config que src/server/firebase.ts
 * 
 * Uso: npx ts-node scripts/export-firestore-to-json.ts
 */

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colecciones del SSOT v7
const COLLECTIONS = [
  'accounts',
  'contacts',
  'teamMembers',
  'users', // Legacy - exportar también
  'items',
  'priceLists',
  'accountPriceOverrides',
  'promotions',
  'orders',
  'orderSellOut',
  'interactions',
  'tasks',
  'events',
  'plv_material',
  'activations',
  'posCostCatalog',
  'posTactics',
  'warehouses',
  'onHand',
  'stockMoves',
  'shipments',
  'productionOrders',
  'bom',
  'lots',
  'qcTests',
  'qcBatchResults',
  'payments_mirror',
  'holded_contacts_mirror',
  'holded_products_mirror',
  'holded_documents_mirror',
  'holded_payments_mirror',
  'integration_jobs',
  'enrichmentJobs',
  'auditLogs',
];

// Inicializar igual que server/firebase.ts
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

async function exportCollection(collectionName: string) {
  console.log(`📦 Exportando ${collectionName}...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const docs: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Convertir Timestamps a strings
      const serialized = JSON.parse(JSON.stringify(data));
      docs.push({
        id: doc.id,
        ...serialized
      });
    });
    
    console.log(`   ✅ ${docs.length} documentos`);
    return { collection: collectionName, count: docs.length, docs };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { collection: collectionName, count: 0, docs: [], error: error.message };
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const exportDir = path.join(__dirname, '..', 'firestore-exports', timestamp);
  
  // Crear directorio
  fs.mkdirSync(exportDir, { recursive: true });
  
  console.log(`\n🚀 Iniciando export completo de Firestore`);
  console.log(`🔑 Project ID: ${projectId}`);
  console.log(`📂 Guardando en: ${exportDir}\n`);
  
  const results: any[] = [];
  let totalDocs = 0;
  
  // Exportar cada colección
  for (const collectionName of COLLECTIONS) {
    const result = await exportCollection(collectionName);
    results.push(result);
    totalDocs += result.count;
    
    // Guardar JSON individual
    if (result.docs.length > 0) {
      const filePath = path.join(exportDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(result.docs, null, 2), 'utf8');
    }
  }
  
  // Guardar metadata
  const metadata = {
    exportedAt: new Date().toISOString(),
    projectId,
    totalCollections: COLLECTIONS.length,
    totalDocuments: totalDocs,
    collections: results.map(r => ({
      name: r.collection,
      count: r.count,
      error: r.error
    }))
  };
  
  fs.writeFileSync(
    path.join(exportDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  // Resumen
  console.log(`\n✅ Export completado!`);
  console.log(`📊 Total: ${totalDocs} documentos en ${COLLECTIONS.length} colecciones`);
  console.log(`📂 Guardado en: ${exportDir}\n`);
  
  // Listar archivos creados
  console.log(`📄 Archivos creados:`);
  const files = fs.readdirSync(exportDir).sort();
  files.forEach(file => {
    const stats = fs.statSync(path.join(exportDir, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${file.padEnd(35)} ${sizeMB.padStart(8)} MB`);
  });
  
  console.log(`\n💾 Backup completo guardado en: ${exportDir}`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
