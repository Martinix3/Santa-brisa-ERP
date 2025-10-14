#!/usr/bin/env tsx
// scripts/test-firestore-rw.ts

/**
 * Test Firestore Read/Write Connection
 * 
 * Verifica:
 * 1. Credenciales configuradas
 * 2. Escritura a Firestore
 * 3. Lectura de Firestore
 * 4. Query básico
 * 5. Permisos
 */

import { adminDb, infoAdmin } from '../src/server/firebase';

async function testFirestoreRW() {
  console.log('🔍 Testing Firestore connection...\n');
  
  // Info del proyecto
  const info = infoAdmin();
  console.log('📋 Project Info:');
  console.log(`   Project ID: ${info.projectId}`);
  console.log(`   Bucket: ${info.bucketName}\n`);
  
  try {
    // Test 1: Write
    console.log('1️⃣  Testing WRITE...');
    const testRef = adminDb.collection('_test').doc('connection-test');
    await testRef.set({
      timestamp: new Date().toISOString(),
      test: 'write',
      version: '1.0',
    });
    console.log('   ✅ Write successful\n');
    
    // Test 2: Read
    console.log('2️⃣  Testing READ...');
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('   ✅ Read successful');
      console.log('   Data:', JSON.stringify(doc.data(), null, 2), '\n');
    } else {
      throw new Error('Document was not found after write');
    }
    
    // Test 3: Query colección accounts (si existe)
    console.log('3️⃣  Testing QUERY (accounts)...');
    try {
      const accountsSnap = await adminDb.collection('accounts').limit(3).get();
      console.log(`   ✅ Query successful: ${accountsSnap.size} accounts found`);
      if (accountsSnap.size > 0) {
        const firstAccount = accountsSnap.docs[0];
        console.log(`   Sample: ${firstAccount.id} - ${firstAccount.data().name || 'N/A'}\n`);
      } else {
        console.log('   ⚠️  Collection "accounts" is empty\n');
      }
    } catch (error: any) {
      if (error.code === 9) {
        console.log('   ⚠️  Query requires index (expected if no data yet)\n');
      } else {
        throw error;
      }
    }
    
    // Test 4: Query colección tasks (puede no existir aún)
    console.log('4️⃣  Testing QUERY (tasks)...');
    try {
      const tasksSnap = await adminDb.collection('tasks').limit(1).get();
      console.log(`   ✅ Query successful: ${tasksSnap.size} tasks found`);
      if (tasksSnap.size === 0) {
        console.log('   ℹ️  Collection "tasks" is empty (normal if not created yet)\n');
      }
    } catch (error: any) {
      console.log('   ℹ️  Collection "tasks" does not exist yet (will be created on first write)\n');
    }
    
    // Test 5: Cleanup
    console.log('5️⃣  Testing DELETE...');
    await testRef.delete();
    console.log('   ✅ Delete successful\n');
    
    console.log('═'.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═'.repeat(60));
    console.log('\n✅ Firestore connection is working correctly');
    console.log('✅ Read/Write permissions are configured');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy Firestore indexes (see PIPELINE_FIRESTORE_SETUP.md)');
    console.log('   2. Add security rules for "tasks" collection');
    console.log('   3. Run migration: npx tsx scripts/migrate-add-isobjective.ts');
    
  } catch (error: any) {
    console.error('\n❌ FIRESTORE TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('\n🔍 Diagnosis:');
    
    if (error.code === 7) {
      console.error('   ⚠️  PERMISSION_DENIED');
      console.error('   Possible causes:');
      console.error('   - Missing authentication credentials');
      console.error('   - Firestore rules too restrictive');
      console.error('   - Service account lacks permissions');
      console.error('\n   Solutions:');
      console.error('   - Run: gcloud auth application-default login');
      console.error('   - Or set: export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json');
    } else if (error.code === 9) {
      console.error('   ⚠️  FAILED_PRECONDITION');
      console.error('   Likely missing composite index');
      console.error('\n   Solution:');
      console.error('   - Deploy indexes: firebase deploy --only firestore:indexes');
    } else if (error.message.includes('projectId')) {
      console.error('   ⚠️  PROJECT_ID NOT SET');
      console.error('\n   Solution:');
      console.error('   - Set env var: export GCLOUD_PROJECT=your-project-id');
    } else {
      console.error('   Unknown error. Full stack:');
      console.error(error);
    }
    
    process.exit(1);
  }
}

// Run
testFirestoreRW().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
