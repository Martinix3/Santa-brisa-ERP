// src/server/integrations/holded/normalize-all.ts
// =================================================================
// NORMALIZACIÓN DE MIRRORS HOLDED → SSOT
// =================================================================
// Lee datos RAW de mirrors y los normaliza al SSOT con TODOS los campos

import { adminDb } from '@/server/firebase';
import { MAPPERS } from './mappers';

// =================================================================
// CONFIGURACIÓN
// =================================================================

const ENTITIES_TO_NORMALIZE = [
  { mirror: 'contacts_mirror', collection: 'accounts', mapper: 'contacts' },
  { mirror: 'products_mirror', collection: 'items', mapper: 'products' },
  { mirror: 'warehouses_mirror', collection: 'warehouses', mapper: 'warehouses' },
  { mirror: 'documents_mirror', collection: 'orders', mapper: 'documents' },
] as const;

type EntityConfig = typeof ENTITIES_TO_NORMALIZE[number];

// =================================================================
// HELPERS
// =================================================================

async function normalizeEntity(config: EntityConfig): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> {
  const mirrorPath = `integrations/holded/${config.mirror}`;
  const collectionPath = config.collection;
  const mapper = MAPPERS[config.mapper];

  console.log(`[Normalize] Processing ${config.mirror} → ${collectionPath}...`);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    // Leer todos los documentos del mirror
    const mirrorSnap = await adminDb.collection(mirrorPath).get();
    
    console.log(`[Normalize] Found ${mirrorSnap.size} documents in ${config.mirror}`);

    // Procesar en batches de 500
    const BATCH_SIZE = 500;
    const docs = mirrorSnap.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        try {
          const mirrorData = doc.data();
          const raw = mirrorData.raw || {};

          if (!raw.id) {
            console.warn(`[Normalize] Skipping document without id in ${config.mirror}:`, doc.id);
            errors++;
            continue;
          }

          // Aplicar mapper
          const normalized = mapper(raw);

          // Verificar si ya existe
          const targetRef = adminDb.collection(collectionPath).doc(normalized.id);
          const existing = await targetRef.get();

          // Escribir con merge: false para forzar estructura completa
          batch.set(targetRef, normalized, { merge: false });

          if (existing.exists) {
            updated++;
          } else {
            created++;
          }

          processed++;
        } catch (error) {
          console.error(`[Normalize] Error processing document in ${config.mirror}:`, error);
          errors++;
        }
      }

      await batch.commit();
      console.log(`[Normalize] Batch ${Math.floor(i / BATCH_SIZE) + 1} committed for ${config.mirror}`);
    }

    console.log(`[Normalize] ✅ ${config.mirror}: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors`);
  } catch (error) {
    console.error(`[Normalize] ❌ Failed to normalize ${config.mirror}:`, error);
    errors++;
  }

  return { processed, created, updated, errors };
}

// =================================================================
// NORMALIZACIÓN PRINCIPAL
// =================================================================

export async function normalizeAllHoldedData(): Promise<{
  success: boolean;
  summary: Record<string, { processed: number; created: number; updated: number; errors: number }>;
  totalTime: number;
}> {
  const startTime = Date.now();
  const summary: Record<string, any> = {};

  console.log('[Normalize] ==========================================');
  console.log('[Normalize] INICIANDO NORMALIZACIÓN HOLDED → SSOT');
  console.log('[Normalize] ==========================================');

  for (const config of ENTITIES_TO_NORMALIZE) {
    console.log(`\n[Normalize] Processing ${config.mirror}...`);

    const stats = await normalizeEntity(config);
    summary[config.collection] = stats;
  }

  const totalTime = Date.now() - startTime;

  console.log('\n[Normalize] ==========================================');
  console.log('[Normalize] RESUMEN DE NORMALIZACIÓN:');
  console.log('[Normalize] ==========================================');

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const [collection, stats] of Object.entries(summary)) {
    console.log(`[Normalize] ${collection}:`);
    console.log(`  - Processed: ${stats.processed}`);
    console.log(`  - Created: ${stats.created}`);
    console.log(`  - Updated: ${stats.updated}`);
    console.log(`  - Errors: ${stats.errors}`);

    totalProcessed += stats.processed;
    totalCreated += stats.created;
    totalUpdated += stats.updated;
    totalErrors += stats.errors;
  }

  console.log('\n[Normalize] TOTALES:');
  console.log(`  - Procesados: ${totalProcessed}`);
  console.log(`  - Creados: ${totalCreated}`);
  console.log(`  - Actualizados: ${totalUpdated}`);
  console.log(`  - Errores: ${totalErrors}`);
  console.log(`  - Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('[Normalize] ==========================================\n');

  return {
    success: totalErrors === 0,
    summary: summary as any,
    totalTime,
  };
}

// =================================================================
// EJECUCIÓN DIRECTA (para testing)
// =================================================================

if (require.main === module) {
  normalizeAllHoldedData()
    .then((result) => {
      if (result.success) {
        console.log('✅ Normalización completada exitosamente');
        process.exit(0);
      } else {
        console.log('⚠️  Normalización completada con errores');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('❌ Normalización fallida:', err);
      process.exit(1);
    });
}
