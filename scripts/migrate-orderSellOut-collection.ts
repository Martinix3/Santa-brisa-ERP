#!/usr/bin/env tsx
/**
 * Migración: orderSellOut → ordersSellOut
 * 
 * Copia los documentos de la colección `orderSellOut` a `ordersSellOut` (plural)
 * para alinear con el naming del resto de colecciones.
 * 
 * Uso:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx tsx scripts/migrate-orderSellOut-collection.ts [--dry-run]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`
🔄 Migración: orderSellOut → ordersSellOut
═════════════════════════════════════════

Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '✏️  APPLY CHANGES'}
`);

  // Inicializar Firebase Admin
  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS no definido');
      console.log('\n💡 Ejecuta: export GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json');
      process.exit(1);
    }

    try {
      initializeApp({ credential: cert(credPath) });
      console.log(`✅ Firebase inicializado con credenciales: ${credPath}\n`);
    } catch (error) {
      console.error('❌ Error al inicializar Firebase:', error);
      process.exit(1);
    }
  }

  const db = getFirestore();
  const srcCollection = 'orderSellOut';
  const dstCollection = 'ordersSellOut';

  console.log(`📂 Leyendo colección: ${srcCollection}...`);

  try {
    const srcSnap = await db.collection(srcCollection).get();
    console.log(`✅ Encontrados ${srcSnap.size} documentos en ${srcCollection}\n`);

    if (srcSnap.size === 0) {
      console.log('ℹ️  No hay documentos que migrar. Finalizando.');
      return;
    }

    let copied = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`📋 Procesando documentos...\n`);

    for (const doc of srcSnap.docs) {
      const docId = doc.id;
      const data = doc.data();
      const dstRef = db.collection(dstCollection).doc(docId);

      try {
        // Verificar si ya existe en destino (idempotencia)
        const dstSnap = await dstRef.get();

        if (dstSnap.exists) {
          console.log(`⏭️  ${docId}: Ya existe en ${dstCollection} (skip)`);
          skipped++;
          continue;
        }

        // Copiar documento
        if (!isDryRun) {
          await dstRef.set(data);
          console.log(`✅ ${docId}: Copiado → ${dstCollection}`);
          copied++;
        } else {
          console.log(`🔍 ${docId}: Se copiaría → ${dstCollection}`);
          copied++;
        }
      } catch (error) {
        console.error(`❌ ${docId}: Error al copiar`, error);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESUMEN`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📄 Total documentos:  ${srcSnap.size}`);
    console.log(`✅ Copiados:          ${copied}`);
    console.log(`⏭️  Omitidos:          ${skipped}`);
    console.log(`❌ Errores:           ${errors}`);

    if (isDryRun) {
      console.log(`\n💡 Dry run completado. Ejecuta sin --dry-run para aplicar cambios.`);
    } else {
      console.log(`\n✅ Migración completada!`);
      console.log(`\n📋 Próximos pasos:`);
      console.log(`   1. Verifica los datos en Firestore Console`);
      console.log(`   2. Actualiza código para usar 'ordersSellOut'`);
      console.log(`   3. Considera archivar colección antigua después de rollout exitoso`);
      console.log(`\n⚠️  Nota: La colección antigua '${srcCollection}' NO se elimina automáticamente.`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
