#!/usr/bin/env tsx
// scripts/migrate-stock-moves.ts

import { adminDb as db } from '../src/server/firebase';

/**
 * Migra StockMoves existentes al formato v2 con itemId + lotCode
 * Ejecutar: npx tsx scripts/migrate-stock-moves.ts [--dry-run|--execute]
 */

interface LegacyStockMove {
  id: string;
  sku?: string;
  itemId?: string;
  lotNumber?: string;
  qty: number;
  uom: string;
  reason: string;
  fromLocationId?: string;
  toLocationId?: string;
  warehouseId?: string;        // DEPRECATED
  toWarehouseId?: string;      // DEPRECATED
  occurredAt?: any;
  date?: any;                  // DEPRECATED
  createdAt?: any;
  [key: string]: any;
}

interface StockMoveMigrationReport {
  processed: number;
  migrated: number;
  skipped: number;
  errors: number;
  warnings: Array<{
    stockMoveId: string;
    issue: string;
    resolution: string;
  }>;
  sample: Array<{
    stockMoveId: string;
    before: string;
    after: string;
  }>;
}

async function migrateStockMoves(dryRun: boolean = true): Promise<StockMoveMigrationReport> {
  const report: StockMoveMigrationReport = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    warnings: [],
    sample: []
  };
  
  console.log(`🚀 Starting StockMoves migration (${dryRun ? 'DRY RUN' : 'EXECUTE'})`);
  
  try {
    // 1. Obtener SKU → itemId mapping para migración
    const itemsSnapshot = await db.collection('items').get();
    const skuToItemId = new Map<string, string>();
    
    itemsSnapshot.docs.forEach(doc => {
      const item = doc.data();
      if (item.sku) {
        skuToItemId.set(item.sku, doc.id);
      }
    });
    
    console.log(`📊 Built SKU mapping: ${skuToItemId.size} items`);
    
    // 2. Obtener lotNumber → lotCode mapping para migración
    const lotsSnapshot = await db.collection('lots').get();
    const lotNumberToLotCode = new Map<string, string>();
    
    lotsSnapshot.docs.forEach(doc => {
      const lot = doc.data();
      if (lot.lotNumber && lot.lotCode) {
        lotNumberToLotCode.set(lot.lotNumber, lot.lotCode);
      }
    });
    
    console.log(`📊 Built lot mapping: ${lotNumberToLotCode.size} lots`);
    
    // 3. Obtener todos los StockMoves existentes
    const stockMovesSnapshot = await db.collection('stockMoves').get();
    console.log(`📊 Found ${stockMovesSnapshot.docs.length} stock moves to process`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    // 4. Procesar cada StockMove
    for (const smDoc of stockMovesSnapshot.docs) {
      const sm = smDoc.data() as LegacyStockMove;
      report.processed++;
      
      try {
        // Verificar si ya está migrado (tiene schemaVersion 2)
        if (sm.schemaVersion === 2) {
          console.log(`  ✅ ${sm.id}: Already migrated (schema v2)`);
          report.skipped++;
          continue;
        }
        
        // Mapear SKU → itemId
        let itemId = sm.itemId;
        if (!itemId && sm.sku) {
          itemId = skuToItemId.get(sm.sku);
          
          if (!itemId) {
            report.warnings.push({
              stockMoveId: sm.id,
              issue: `SKU not found: ${sm.sku}`,
              resolution: 'Skipped - requires manual mapping'
            });
            report.errors++;
            continue;
          }
        }
        
        if (!itemId) {
          report.warnings.push({
            stockMoveId: sm.id,
            issue: 'No itemId or sku found',
            resolution: 'Skipped - missing item reference'
          });
          report.errors++;
          continue;
        }
        
        // Mapear lotNumber → lotCode
        let lotCode = sm.lotCode;
        if (!lotCode && sm.lotNumber) {
          lotCode = lotNumberToLotCode.get(sm.lotNumber);
          
          if (!lotCode) {
            report.warnings.push({
              stockMoveId: sm.id,
              issue: `LotNumber not found: ${sm.lotNumber}`,
              resolution: 'Skipped - requires lot migration first'
            });
            report.errors++;
            continue;
          }
        }
        
        if (!lotCode) {
          report.warnings.push({
            stockMoveId: sm.id,
            issue: 'No lotCode or lotNumber found',
            resolution: 'Skipped - missing lot reference'
          });
          report.errors++;
          continue;
        }
        
        // Migrar ubicaciones deprecated
        let fromLocationId = sm.fromLocationId;
        let toLocationId = sm.toLocationId;
        
        // Migrar warehouseId → fromLocationId/toLocationId
        if (!fromLocationId && sm.warehouseId) {
          fromLocationId = sm.warehouseId;
          report.warnings.push({
            stockMoveId: sm.id,
            issue: 'Using deprecated warehouseId',
            resolution: `Mapped to fromLocationId: ${fromLocationId}`
          });
        }
        
        if (!toLocationId && sm.toWarehouseId) {
          toLocationId = sm.toWarehouseId;
          report.warnings.push({
            stockMoveId: sm.id,
            issue: 'Using deprecated toWarehouseId',
            resolution: `Mapped to toLocationId: ${toLocationId}`
          });
        }
        
        // Migrar timestamp deprecated
        let occurredAt = sm.occurredAt;
        if (!occurredAt && sm.date) {
          occurredAt = sm.date;
          report.warnings.push({
            stockMoveId: sm.id,
            issue: 'Using deprecated date field',
            resolution: `Mapped to occurredAt: ${occurredAt}`
          });
        }
        
        // Si no tiene occurredAt, usar createdAt
        if (!occurredAt) {
          occurredAt = sm.createdAt || new Date().toISOString();
        }
        
        // Preparar datos v2
        const v2Updates = {
          // NUEVOS CAMPOS CANÓNICOS
          itemId,                              // FK canónica
          lotCode,                             // Código de lote canónico
          
          // MANTENER CAMPOS ACTUALES
          qty: sm.qty,
          uom: sm.uom,
          reason: sm.reason.toUpperCase(),     // Normalizar
          fromLocationId,
          toLocationId,
          occurredAt,
          createdAt: sm.createdAt || occurredAt,
          
          // CAMPOS OPCIONALES
          userId: sm.userId || sm.createdBy,
          unitCost: sm.unitCost,
          
          // METADATA DE MIGRACIÓN
          schemaVersion: 2,
          migratedAt: new Date().toISOString(),
          
          // PRESERVAR LEGACY PARA COMPATIBILIDAD TEMPORAL
          skuLegacy: sm.sku,
          lotNumberLegacy: sm.lotNumber,
          warehouseIdLegacy: sm.warehouseId,
          dateLegacy: sm.date
        };
        
        if (!dryRun) {
          batch.update(smDoc.ref, v2Updates);
          batchCount++;
          
          // Firestore batch limit
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
            console.log(`  📝 Batch committed: ${report.migrated} moves processed`);
          }
        }
        
        report.migrated++;
        
        // Añadir a muestra
        if (report.sample.length < 10) {
          report.sample.push({
            stockMoveId: sm.id,
            before: `${sm.sku || sm.itemId}/${sm.lotNumber} @ ${sm.warehouseId || sm.fromLocationId}`,
            after: `${itemId}/${lotCode} @ ${fromLocationId || toLocationId}`
          });
        }
        
        if (report.processed % 100 === 0) {
          console.log(`  📊 Progress: ${report.processed}/${stockMovesSnapshot.docs.length}`);
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error processing StockMove ${sm.id}:`, error.message);
        report.errors++;
      }
    }
    
    // 5. Commit final batch
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`  📝 Final batch committed`);
    }
    
    return report;
    
  } catch (error: any) {
    console.error('❌ StockMoves migration failed:', error);
    throw error;
  }
}

async function validateStockMoveMigration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  console.log('🔍 Validating StockMoves migration...');
  
  const issues: string[] = [];
  
  try {
    // 1. Verificar que todos tienen itemId + lotCode
    const stockMovesSnap = await db.collection('stockMoves').get();
    
    for (const doc of stockMovesSnap.docs) {
      const sm = doc.data();
      
      if (!sm.itemId) {
        issues.push(`StockMove ${doc.id}: Missing itemId`);
      }
      
      if (!sm.lotCode) {
        issues.push(`StockMove ${doc.id}: Missing lotCode`);
      }
      
      if (!sm.occurredAt) {
        issues.push(`StockMove ${doc.id}: Missing occurredAt`);
      }
      
      // Verificar que locationIds son válidos
      if (!sm.fromLocationId && !sm.toLocationId) {
        issues.push(`StockMove ${doc.id}: Missing both fromLocationId and toLocationId`);
      }
    }
    
    // 2. Verificar que itemIds existen
    const itemIds = new Set(stockMovesSnap.docs.map(doc => doc.data().itemId).filter(Boolean));
    const itemsSnap = await db.collection('items').get();
    const existingItemIds = new Set(itemsSnap.docs.map(doc => doc.id));
    
    for (const itemId of itemIds) {
      if (!existingItemIds.has(itemId)) {
        issues.push(`Referenced itemId not found: ${itemId}`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
    
  } catch (error: any) {
    issues.push(`Validation failed: ${error.message}`);
    return { valid: false, issues };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  const shouldValidate = args.includes('--validate');
  
  try {
    if (shouldValidate) {
      const validation = await validateStockMoveMigration();
      console.log('\n📋 StockMoves Validation Report:');
      console.log(`Valid: ${validation.valid ? '✅' : '❌'}`);
      
      if (validation.issues.length > 0) {
        console.log('\nIssues:');
        validation.issues.slice(0, 10).forEach(issue => console.log(`  ❌ ${issue}`));
        
        if (validation.issues.length > 10) {
          console.log(`  ... and ${validation.issues.length - 10} more issues`);
        }
      } else {
        console.log('  ✅ All StockMoves have valid v2 format');
      }
      return;
    }
    
    // Ejecutar migración
    const report = await migrateStockMoves(isDryRun);
    
    // Mostrar reporte
    console.log('\n📋 StockMoves Migration Report:');
    console.log(`  📊 Processed: ${report.processed} moves`);
    console.log(`  ✅ Migrated: ${report.migrated} moves`);
    console.log(`  ⏭️  Skipped: ${report.skipped} moves (already v2)`);
    console.log(`  ❌ Errors: ${report.errors} moves`);
    console.log(`  ⚠️  Warnings: ${report.warnings.length} moves`);
    
    if (report.sample.length > 0) {
      console.log('\n📝 Sample migrations:');
      report.sample.forEach(s => {
        console.log(`  ${s.before} → ${s.after}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings (first 5):');
      report.warnings.slice(0, 5).forEach(w => {
        console.log(`  ${w.issue}: ${w.resolution}`);
      });
    }
    
    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. To execute migration:');
      console.log('   npx tsx scripts/migrate-stock-moves.ts --execute');
      console.log('\n🔍 To validate after migration:');
      console.log('   npx tsx scripts/migrate-stock-moves.ts --validate');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('   Run validation: npx tsx scripts/migrate-stock-moves.ts --validate');
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { migrateStockMoves, validateStockMoveMigration };
