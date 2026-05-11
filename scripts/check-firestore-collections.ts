#!/usr/bin/env tsx
/**
 * Script para verificar qué colecciones existen realmente en Firestore
 * y cuántos documentos tienen.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Inicializar Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = join(process.cwd(), 'santa-brisa-erp-firebase-adminsdk.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'santa-brisa-erp',
  });
}

const db = getFirestore();

// Colecciones que el DataProvider intenta cargar
const EXPECTED_COLLECTIONS = [
  "contacts",
  "parties", 
  "partyRoles",
  "partyDuplicates",
  "users",
  "accounts",
  "ordersSellOut",
  "interactions",
  "items",
  "billOfMaterials",
  "productionOrders",
  "lots",
  "lotGenealogy",
  "onHand",
  "stockMoves",
  "shipments",
  "goodsReceipts",
  "deliveryNotes",
  "qcPlans",
  "qcParameters",
  "qcTests",
  "qcProtocols",
  "protocolLogs",
  "marketingEvents",
  "onlineCampaigns",
  "influencerCollabs",
  "posTactics",
  "posCostCatalog",
  "plv_material",
  "socialMetrics",
  "webAnalytics",
  "activations",
  "reservations",
  "notes"
];

async function checkCollections() {
  console.log('🔍 Verificando colecciones en Firestore...\n');
  
  const results: Array<{ name: string; exists: boolean; count: number; sample?: any }> = [];
  
  for (const collectionName of EXPECTED_COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).limit(5).get();
      const count = snapshot.size;
      const exists = count > 0;
      
      const sample = exists ? snapshot.docs[0]?.data() : undefined;
      
      results.push({
        name: collectionName,
        exists,
        count,
        sample
      });
      
      const status = exists ? '✅' : '❌';
      const countText = exists ? `(${count}+ docs)` : '(vacía)';
      console.log(`${status} ${collectionName.padEnd(25)} ${countText}`);
      
      if (exists && sample) {
        console.log(`   Sample keys: ${Object.keys(sample).slice(0, 5).join(', ')}`);
      }
    } catch (error: any) {
      console.log(`❌ ${collectionName.padEnd(25)} (error: ${error.message})`);
      results.push({
        name: collectionName,
        exists: false,
        count: 0
      });
    }
  }
  
  // Resumen
  console.log('\n📊 RESUMEN:');
  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);
  
  console.log(`\n✅ Colecciones con datos (${existing.length}):`);
  existing.forEach(r => {
    console.log(`   - ${r.name}: ${r.count}+ documentos`);
  });
  
  console.log(`\n❌ Colecciones vacías o inexistentes (${missing.length}):`);
  missing.forEach(r => {
    console.log(`   - ${r.name}`);
  });
  
  // Análisis específico para el problema
  console.log('\n🎯 ANÁLISIS PARA /ventas/accounts:');
  const contactsExists = results.find(r => r.name === 'contacts')?.exists;
  const accountsExists = results.find(r => r.name === 'accounts')?.exists;
  const partiesExists = results.find(r => r.name === 'parties')?.exists;
  
  console.log(`   - contacts: ${contactsExists ? '✅ Existe' : '❌ NO existe'}`);
  console.log(`   - accounts: ${accountsExists ? '✅ Existe' : '❌ NO existe'}`);
  console.log(`   - parties: ${partiesExists ? '✅ Existe' : '❌ NO existe'}`);
  
  if (!contactsExists && accountsExists) {
    console.log('\n💡 RECOMENDACIÓN:');
    console.log('   El DataProvider debe cargar "accounts" directamente,');
    console.log('   NO intentar generarlo desde "contacts" que no existe.');
  }
  
  if (accountsExists) {
    console.log('\n📝 Muestra de un account:');
    const accountSample = results.find(r => r.name === 'accounts')?.sample;
    if (accountSample) {
      console.log(JSON.stringify(accountSample, null, 2));
    }
  }
}

checkCollections()
  .then(() => {
    console.log('\n✅ Verificación completa');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
