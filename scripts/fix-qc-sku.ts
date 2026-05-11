// scripts/fix-qc-sku.ts
// Script para arreglar SKUs en qcPlans, qcParameters y actualizar datos relacionados

import { adminDb as db } from '../src/server/firebase';

async function fixQcSkus() {
  console.log('🔧 Iniciando corrección de SKUs en datos de QC...\n');

  // 1. Obtener todos los items para el mapping id -> sku
  const itemsSnap = await db.collection('items').get();
  const itemMap = new Map();
  itemsSnap.docs.forEach(doc => {
    const data = doc.data();
    itemMap.set(data.id, data.sku);
    console.log(`Item: ${data.name} (${data.id}) → SKU: ${data.sku}`);
  });

  console.log(`\n📦 Total items encontrados: ${itemMap.size}\n`);

  // 2. Corregir qcPlans
  console.log('🔄 Corrigiendo qcPlans...');
  const plansSnap = await db.collection('qcPlans').get();
  let plansFixed = 0;
  
  for (const doc of plansSnap.docs) {
    const plan = doc.data();
    const currentSku = plan.sku;
    
    // Si el SKU parece ser un itemId (tiene caracteres especiales típicos de IDs)
    if (currentSku && itemMap.has(currentSku)) {
      const correctSku = itemMap.get(currentSku);
      console.log(`  ✅ Plan "${plan.name}": "${currentSku}" → "${correctSku}"`);
      await doc.ref.update({ sku: correctSku });
      plansFixed++;
    }
  }
  console.log(`✅ ${plansFixed} planes corregidos\n`);

  // 3. Corregir qcParameters
  console.log('🔄 Corrigiendo qcParameters...');
  const paramsSnap = await db.collection('qcParameters').get();
  let paramsFixed = 0;
  
  for (const doc of paramsSnap.docs) {
    const param = doc.data();
    const currentSku = param.sku;
    
    if (currentSku && itemMap.has(currentSku)) {
      const correctSku = itemMap.get(currentSku);
      console.log(`  ✅ Param "${param.name}": "${currentSku}" → "${correctSku}"`);
      await doc.ref.update({ sku: correctSku });
      paramsFixed++;
    }
  }
  console.log(`✅ ${paramsFixed} parámetros corregidos\n`);

  console.log('✅ Corrección completada!');
}

fixQcSkus()
  .then(() => {
    console.log('\n🎉 Script finalizado exitosamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
