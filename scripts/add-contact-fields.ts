#!/usr/bin/env tsx
// scripts/add-contact-fields.ts

/**
 * Añade campos necesarios para la página de Contactos:
 * - nameLower (para búsqueda por prefijo)
 * - originType ('client' | 'supplier' | 'customer')
 */

import { adminDb } from '../src/server/firebase';

async function addContactFields() {
  console.log('🔧 Añadiendo campos para Contactos...\n');
  
  let updated = 0;
  
  try {
    // ========================================================================
    // 1. ACCOUNTS (B2B) → originType: 'client'
    // ========================================================================
    console.log('📝 Actualizando accounts...');
    
    const accountsSnap = await adminDb.collection('accounts').get();
    
    for (const doc of accountsSnap.docs) {
      const data = doc.data();
      const name = data.name || '';
      
      await doc.ref.update({
        nameLower: name.toLowerCase(),
        originType: 'client',
      });
      
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Actualizados ${updated}...`);
      }
    }
    
    console.log(`   ✅ ${accountsSnap.size} accounts actualizados\n`);
    
    // ========================================================================
    // 2. CUSTOMERS (ONLINE) → originType: 'customer'
    // ========================================================================
    console.log('📝 Actualizando customers...');
    
    const customersSnap = await adminDb.collection('customers').get();
    
    for (const doc of customersSnap.docs) {
      const data = doc.data();
      const name = data.name || '';
      
      await doc.ref.update({
        nameLower: name.toLowerCase(),
        originType: 'customer',
      });
      
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Actualizados ${updated}...`);
      }
    }
    
    console.log(`   ✅ ${customersSnap.size} customers actualizados\n`);
    
    // ========================================================================
    // 3. SUPPLIERS → originType: 'supplier'
    // ========================================================================
    console.log('📝 Actualizando suppliers...');
    
    const suppliersSnap = await adminDb.collection('suppliers').get();
    
    for (const doc of suppliersSnap.docs) {
      const data = doc.data();
      const name = data.name || '';
      
      await doc.ref.update({
        nameLower: name.toLowerCase(),
        originType: 'supplier',
      });
      
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Actualizados ${updated}...`);
      }
    }
    
    console.log(`   ✅ ${suppliersSnap.size} suppliers actualizados\n`);
    
    // ========================================================================
    // REPORT
    // ========================================================================
    console.log('═'.repeat(60));
    console.log(`✅ Total actualizados: ${updated} documentos`);
    console.log('═'.repeat(60));
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Deploy índices Firestore');
    console.log('   2. Crear página de Contactos\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
addContactFields().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
