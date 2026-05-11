// scripts/migrate-orders-flow-simple.ts
// Migración simple: Todos los pedidos sin flow → DIRECT
// PLACEMENT solo se asigna manualmente por comerciales

import { adminDb as db } from '../src/server/firebase';

async function migrateOrdersFlow() {
  console.log('🔄 Starting flow migration...');
  console.log('📋 Rule: All orders without flow → DIRECT');
  console.log('📋 PLACEMENT must be set manually by sales team\n');
  
  try {
    // 1. Obtener todos los pedidos sin flow
    const ordersRef = db.collection('ordersSellOut');
    const snapshot = await ordersRef.get();
    
    console.log(`📊 Total orders in database: ${snapshot.size}`);
    
    // Filtrar los que no tienen flow
    const ordersWithoutFlow = snapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.flow;
    });
    
    console.log(`📊 Orders without flow: ${ordersWithoutFlow.length}\n`);
    
    if (ordersWithoutFlow.length === 0) {
      console.log('✅ All orders already have flow assigned!');
      return;
    }
    
    // 2. Procesar en lotes de 500
    const batchSize = 500;
    let count = 0;
    
    for (let i = 0; i < ordersWithoutFlow.length; i += batchSize) {
      const batch = db.batch();
      const chunk = ordersWithoutFlow.slice(i, i + batchSize);
      
      chunk.forEach(doc => {
        batch.update(doc.ref, { 
          flow: 'DIRECT',
          updatedAt: new Date().toISOString()
        });
        count++;
      });
      
      await batch.commit();
      console.log(`✅ Migrated ${count}/${ordersWithoutFlow.length} orders...`);
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   Total migrated: ${count}`);
    console.log(`   All set to: DIRECT`);
    console.log('\n✅ Migration complete!');
    console.log('ℹ️  PLACEMENT orders must be set manually by sales team in NewOrderDrawer');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Ejecutar migración
migrateOrdersFlow()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
