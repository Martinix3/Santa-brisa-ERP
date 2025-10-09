#!/usr/bin/env ts-node
/**
 * Script para limpiar Firestore - Borra todas las colecciones excepto items
 * 
 * Uso:
 * ts-node scripts/cleanup-firestore.ts --confirm
 * ts-node scripts/cleanup-firestore.ts --dry-run
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Inicializar Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Colecciones a borrar
const COLLECTIONS_TO_DELETE = [
  'accounts',
  'parties',
  'ordersSellOut',
  'interactions',
  'posTactics',
  'partyRoles'
];

async function deleteCollection(collectionName: string, dryRun: boolean = false) {
  console.log(`\n📋 Procesando colección: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  ℹ️  Colección vacía, nada que borrar`);
    return 0;
  }
  
  console.log(`  📊 Documentos encontrados: ${snapshot.size}`);
  
  if (dryRun) {
    console.log(`  🔍 DRY RUN: Se borrarían ${snapshot.size} documentos`);
    return snapshot.size;
  }
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });
  
  await batch.commit();
  console.log(`  ✅ ${count} documentos borrados`);
  
  return count;
}

async function cleanupFirestore(dryRun: boolean = false, confirm: boolean = false) {
  console.log('\n🗑️  CLEANUP FIRESTORE\n');
  console.log(`Modo: ${dryRun ? '🔍 DRY RUN (simulación)' : '⚠️  BORRADO REAL'}`);
  console.log(`Colecciones a procesar: ${COLLECTIONS_TO_DELETE.length}\n`);
  
  if (!dryRun && !confirm) {
    console.error('❌ ERROR: Para borrar de verdad, debes usar --confirm');
    console.log('Ejemplo: ts-node scripts/cleanup-firestore.ts --confirm');
    process.exit(1);
  }
  
  if (!dryRun) {
    console.log('⚠️  ¡ADVERTENCIA! Esto borrará PERMANENTEMENTE los datos.');
    console.log('⚠️  Asegúrate de tener un backup si es necesario.\n');
  }
  
  let totalDeleted = 0;
  
  for (const collectionName of COLLECTIONS_TO_DELETE) {
    try {
      const deleted = await deleteCollection(collectionName, dryRun);
      totalDeleted += deleted;
    } catch (error) {
      console.error(`  ❌ Error en ${collectionName}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total documentos ${dryRun ? 'que se borrarían' : 'borrados'}: ${totalDeleted}`);
  
  if (dryRun) {
    console.log('\n💡 Para borrar de verdad, ejecuta:');
    console.log('   ts-node scripts/cleanup-firestore.ts --confirm\n');
  } else {
    console.log('\n✅ Limpieza completada!\n');
  }
}

// Parse argumentos
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const confirm = args.includes('--confirm') || args.includes('-c');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Cleanup Firestore - Borrar colecciones

Uso:
  ts-node scripts/cleanup-firestore.ts --confirm    Borrar de verdad
  ts-node scripts/cleanup-firestore.ts --dry-run    Simular (no borra)
  ts-node scripts/cleanup-firestore.ts --help       Mostrar ayuda

Colecciones que se borrarán:
  ${COLLECTIONS_TO_DELETE.map(c => `- ${c}`).join('\n  ')}

Colecciones que NO se tocan:
  - users (comerciales)
  - items (productos)
  `);
  process.exit(0);
}

// Ejecutar
cleanupFirestore(dryRun, confirm);
