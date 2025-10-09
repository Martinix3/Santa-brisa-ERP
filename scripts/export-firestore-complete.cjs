#!/usr/bin/env node
/**
 * Export completo de Firestore a JSON
 * Descarga TODAS las colecciones a archivos JSON legibles
 * 
 * Uso: node scripts/export-firestore-complete.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require('../.firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Colecciones a exportar (basado en tu SSOT)
const COLLECTIONS = [
  'accounts',
  'contacts',
  'teamMembers',
  'users', // Legacy - lo exportamos también
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

async function exportCollection(collectionName) {
  console.log(`📦 Exportando ${collectionName}...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const docs = [];
    
    snapshot.forEach(doc => {
      docs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`   ✅ ${docs.length} documentos`);
    return { collection: collectionName, count: docs.length, docs };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { collection: collectionName, count: 0, docs: [], error: error.message };
  }
}

async function exportAll() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const exportDir = path.join(__dirname, '..', 'firestore-exports', timestamp);
  
  // Crear directorio
  fs.mkdirSync(exportDir, { recursive: true });
  
  console.log(`\n🚀 Iniciando export completo de Firestore`);
  console.log(`📂 Guardando en: ${exportDir}\n`);
  
  const results = [];
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
  const files = fs.readdirSync(exportDir);
  files.forEach(file => {
    const stats = fs.statSync(path.join(exportDir, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${file} (${sizeMB} MB)`);
  });
  
  process.exit(0);
}

// Ejecutar
exportAll().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
