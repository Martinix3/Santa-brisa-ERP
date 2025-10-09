// src/server/integrations/holded/import-all-raw.ts
// =================================================================
// IMPORTACIÓN CRUDA (RAW) DE TODO EL MODELO HOLDED
// =================================================================
// Este script guarda TODOS los datos de Holded tal cual en colecciones mirror
// SIN transformaciones, SIN mapeos, SIN validaciones
// Posteriormente se normalizarán al SSOT desde estos mirrors

import { adminDb } from '@/server/firebase';
import { callHoldedApi } from './client';

// =================================================================
// ENTIDADES A IMPORTAR
// =================================================================
const HOLDED_ENTITIES = [
  { name: 'contacts', endpoint: '/contacts' },
  { name: 'products', endpoint: '/products' },
  { name: 'documents', endpoint: '/documents' },
  { name: 'warehouses', endpoint: '/warehouses' },
  { name: 'stockmovements', endpoint: '/stockmovements' },
  { name: 'payments', endpoint: '/payments' },
] as const;

type EntityName = typeof HOLDED_ENTITIES[number]['name'];

// =================================================================
// HELPERS
// =================================================================

async function fetchHoldedEntity(endpoint: string): Promise<any[]> {
  try {
    const data = await callHoldedApi(endpoint, 'GET');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[Holded Import] Error fetching ${endpoint}:`, error);
    return [];
  }
}

async function saveToMirror(
  entityName: EntityName,
  items: any[]
): Promise<{ created: number; updated: number; errors: number }> {
  const collectionPath = `integrations/holded/${entityName}_mirror`;
  const now = new Date().toISOString();
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  // Procesar en batches de 500 (límite de Firestore)
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = items.slice(i, i + BATCH_SIZE);
    
    for (const item of chunk) {
      try {
        if (!item.id) {
          console.warn(`[Holded Import] Item without id in ${entityName}, skipping:`, item);
          errors++;
          continue;
        }
        
        const docRef = adminDb.collection(collectionPath).doc(item.id);
        const existingDoc = await docRef.get();
        
        const mirrorDoc = {
          holdedId: item.id,
          raw: item,
          syncedAt: now,
          source: 'API' as const,
          status: existingDoc.exists ? ('UPDATED' as const) : ('NEW' as const),
          createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : now,
          updatedAt: now,
        };
        
        batch.set(docRef, mirrorDoc, { merge: true });
        
        if (existingDoc.exists) {
          updated++;
        } else {
          created++;
        }
      } catch (error) {
        console.error(`[Holded Import] Error processing item in ${entityName}:`, error);
        errors++;
      }
    }
    
    await batch.commit();
    console.log(`[Holded Import] Batch ${i / BATCH_SIZE + 1} committed for ${entityName}`);
  }
  
  return { created, updated, errors };
}

// =================================================================
// IMPORTACIÓN PRINCIPAL
// =================================================================

export async function importAllHoldedRaw(): Promise<{
  success: boolean;
  summary: Record<EntityName, { total: number; created: number; updated: number; errors: number }>;
  totalTime: number;
}> {
  const startTime = Date.now();
  const summary: Record<string, any> = {};
  
  console.log('[Holded Import] ==========================================');
  console.log('[Holded Import] INICIANDO IMPORTACIÓN CRUDA DE HOLDED');
  console.log('[Holded Import] ==========================================');
  
  for (const entity of HOLDED_ENTITIES) {
    console.log(`\n[Holded Import] Fetching ${entity.name} from ${entity.endpoint}...`);
    
    try {
      const items = await fetchHoldedEntity(entity.endpoint);
      console.log(`[Holded Import] Found ${items.length} ${entity.name}`);
      
      if (items.length > 0) {
        console.log(`[Holded Import] Saving ${items.length} ${entity.name} to mirror...`);
        const stats = await saveToMirror(entity.name, items);
        
        summary[entity.name] = {
          total: items.length,
          ...stats,
        };
        
        console.log(`[Holded Import] ✅ ${entity.name}: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`);
      } else {
        summary[entity.name] = {
          total: 0,
          created: 0,
          updated: 0,
          errors: 0,
        };
        console.log(`[Holded Import] ⚠️  No ${entity.name} found`);
      }
    } catch (error) {
      console.error(`[Holded Import] ❌ Failed to import ${entity.name}:`, error);
      summary[entity.name] = {
        total: 0,
        created: 0,
        updated: 0,
        errors: 1,
      };
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log('\n[Holded Import] ==========================================');
  console.log('[Holded Import] RESUMEN DE IMPORTACIÓN:');
  console.log('[Holded Import] ==========================================');
  
  let totalItems = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  for (const [entityName, stats] of Object.entries(summary)) {
    console.log(`[Holded Import] ${entityName}:`);
    console.log(`  - Total: ${stats.total}`);
    console.log(`  - Created: ${stats.created}`);
    console.log(`  - Updated: ${stats.updated}`);
    console.log(`  - Errors: ${stats.errors}`);
    
    totalItems += stats.total;
    totalCreated += stats.created;
    totalUpdated += stats.updated;
    totalErrors += stats.errors;
  }
  
  console.log('\n[Holded Import] TOTALES:');
  console.log(`  - Items procesados: ${totalItems}`);
  console.log(`  - Nuevos: ${totalCreated}`);
  console.log(`  - Actualizados: ${totalUpdated}`);
  console.log(`  - Errores: ${totalErrors}`);
  console.log(`  - Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('[Holded Import] ==========================================\n');
  
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
  importAllHoldedRaw()
    .then((result) => {
      if (result.success) {
        console.log('✅ Importación completada exitosamente');
        process.exit(0);
      } else {
        console.log('⚠️  Importación completada con errores');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('❌ Importación fallida:', err);
      process.exit(1);
    });
}
