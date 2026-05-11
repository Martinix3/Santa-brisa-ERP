#!/usr/bin/env tsx
// scripts/cleanup-previous-migration.ts

/**
 * Limpia la migración anterior (62 accounts + 62 parties)
 * para permitir re-migración con nueva arquitectura
 */

import { adminDb } from '../src/server/firebase';

async function cleanupPreviousMigration() {
  console.log('🧹 Limpiando migración anterior...\n');
  
  try {
    // 1. Contar accounts con external.holded
    const accountsSnap = await adminDb
      .collection('accounts')
      .where('external.holded', '!=', null)
      .get();
    
    console.log(`📊 Encontrados ${accountsSnap.size} accounts con external.holded`);
    
    if (accountsSnap.empty) {
      console.log('✅ No hay accounts para limpiar. Continuar con migración.\n');
      return;
    }
    
    // 2. Extraer partyIds
    const partyIds = accountsSnap.docs
      .map(doc => doc.data().partyId)
      .filter(Boolean);
    
    console.log(`📊 Asociados a ${partyIds.length} parties\n`);
    
    // 3. Confirmar
    console.log('⚠️  Se eliminarán:');
    console.log(`   - ${accountsSnap.size} accounts`);
    console.log(`   - ${partyIds.length} parties`);
    console.log('\n⏸️  Esperando 3 segundos antes de eliminar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Eliminar en batches
    let deletedAccounts = 0;
    let deletedParties = 0;
    
    // Eliminar accounts
    console.log('🗑️  Eliminando accounts...');
    for (const doc of accountsSnap.docs) {
      await doc.ref.delete();
      deletedAccounts++;
      if (deletedAccounts % 10 === 0) {
        console.log(`   Eliminados ${deletedAccounts}/${accountsSnap.size}`);
      }
    }
    console.log(`   ✅ ${deletedAccounts} accounts eliminados\n`);
    
    // Eliminar parties
    console.log('🗑️  Eliminando parties...');
    for (const partyId of partyIds) {
      await adminDb.collection('parties').doc(partyId).delete();
      deletedParties++;
      if (deletedParties % 10 === 0) {
        console.log(`   Eliminados ${deletedParties}/${partyIds.length}`);
      }
    }
    console.log(`   ✅ ${deletedParties} parties eliminados\n`);
    
    console.log('═'.repeat(60));
    console.log('✅ Limpieza completada exitosamente!');
    console.log('═'.repeat(60));
    console.log('\nAhora puedes ejecutar la nueva migración.\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run
cleanupPreviousMigration().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
