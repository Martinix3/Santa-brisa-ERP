#!/usr/bin/env tsx
// scripts/migrate-lot-codes.ts

import { adminDb as db } from '../src/server/firebase';
import { LotService } from '../src/services/canonical/lot.service';

/**
 * Migra lotes existentes al formato lotCode canónico
 * Ejecutar: npx tsx scripts/migrate-lot-codes.ts [--dry-run|--execute]
 */

interface LegacyLot {
  id: string;
  lotNumber: string;
  itemId?: string;
  sku?: string;
  receivedAt?: any;
  createdAt?: any;
  [key: string]: any;
}

interface MigrationReport {
  processed: number;
  migrated: number;
  skipped: number;
  errors: number;
  conflicts: Array<{
    lotId: string;
    oldLotNumber: string;
    newLotCode: string;
    conflict: string;
  }>;
  sample: Array<{
    lotId: string;
    oldLotNumber: string;
    newLotCode: string;
    preserved?: boolean;
  }>;
}

async function migrateLotCodes(dryRun: boolean = true): Promise<MigrationReport> {
  const report: MigrationReport = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    conflicts: [],
    sample: []
  };
  
  console.log(`🚀 Starting lot codes migration (${dryRun ? 'DRY RUN' : 'EXECUTE'})`);
  
  try {
    // 1. Obtener todos los lotes existentes
    const lotsSnapshot = await db.collection('lots').get();
    console.log(`📊 Found ${lotsSnapshot.docs.length} lots to process`);
    
    const batch = db.batch();
    const existingLotCodes = new Set<string>();
    let batchCount = 0;
    
    // 2. Procesar cada lote
    for (const lotDoc of lotsSnapshot.docs) {
      const lot = lotDoc.data() as LegacyLot;
      report.processed++;
      
      try {
        // Verificar si ya tiene lotCode válido
        if (lot.lotCode && LotService.validateLotCode(lot.lotCode)) {
          console.log(`  ✅ ${lot.id}: Already has valid lotCode: ${lot.lotCode}`);
          existingLotCodes.add(lot.lotCode);
          report.skipped++;
          continue;
        }
        
        // Generar nuevo lotCode desde datos legacy
        let newLotCode = LotService.generateLotCodeFromLegacy(lot);
        
        // Verificar que no hay conflictos
        if (existingLotCodes.has(newLotCode)) {
          // Generar variante única
          let variant = 1;
          let uniqueLotCode: string;
          
          do {
            variant++;
            const parts = newLotCode.split('-');
            parts[parts.length - 1] = variant.toString().padStart(3, '0');
            uniqueLotCode = parts.join('-');
          } while (existingLotCodes.has(uniqueLotCode) && variant < 999);
          
          if (variant >= 999) {
            report.conflicts.push({
              lotId: lot.id,
              oldLotNumber: lot.lotNumber,
              newLotCode: newLotCode,
              conflict: 'Too many variants, manual resolution required'
            });
            report.errors++;
            continue;
          }
          
          report.conflicts.push({
            lotId: lot.id,
            oldLotNumber: lot.lotNumber,
            newLotCode: uniqueLotCode,
            conflict: `Original ${newLotCode} conflicts, using ${uniqueLotCode}`
          });
          
          newLotCode = uniqueLotCode;
        }
        
        existingLotCodes.add(newLotCode);
        
        // Preparar actualización
        const updates = {
          lotCode: newLotCode,
          // Preservar lotNumber legacy para compatibilidad temporal
          lotNumberLegacy: lot.lotNumber,
          schemaVersion: 2,
          updatedAt: new Date().toISOString(),
          migratedAt: new Date().toISOString()
        };
        
        if (!dryRun) {
          batch.update(lotDoc.ref, updates);
          batchCount++;
          
          // Firestore batch limit
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
            console.log(`  📝 Batch committed: ${report.migrated} lots processed`);
          }
        }
        
        report.migrated++;
        
        // Añadir a muestra para reporte
        if (report.sample.length < 10) {
          report.sample.push({
            lotId: lot.id,
            oldLotNumber: lot.lotNumber,
            newLotCode: newLotCode,
            preserved: lot.lotNumber === newLotCode
          });
        }
        
        if (report.processed % 100 === 0) {
          console.log(`  📊 Progress: ${report.processed}/${lotsSnapshot.docs.length} lots processed`);
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error processing lot ${lot.id}:`, error.message);
        report.errors++;
      }
    }
    
    // 3. Commit final batch
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`  📝 Final batch committed`);
    }
    
    return report;
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function validateMigration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  console.log('🔍 Validating migration...');
  
  const issues: string[] = [];
  
  try {
    // 1. Verificar que todos los lotes tienen lotCode válido
    const lotsSnap = await db.collection('lots').get();
    
    for (const doc of lotsSnap.docs) {
      const lot = doc.data();
      
      if (!lot.lotCode) {
        issues.push(`Lot ${doc.id}: Missing lotCode`);
      } else if (!LotService.validateLotCode(lot.lotCode)) {
        issues.push(`Lot ${doc.id}: Invalid lotCode format: ${lot.lotCode}`);
      }
    }
    
    // 2. Verificar unicidad de lotCodes
    const lotCodes = lotsSnap.docs
      .map(doc => doc.data().lotCode)
      .filter(Boolean);
    
    const uniqueLotCodes = new Set(lotCodes);
    
    if (lotCodes.length !== uniqueLotCodes.size) {
      const duplicates = lotCodes.length - uniqueLotCodes.size;
      issues.push(`Found ${duplicates} duplicate lot codes`);
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
      const validation = await validateMigration();
      console.log('\n📋 Migration Validation Report:');
      console.log(`Valid: ${validation.valid ? '✅' : '❌'}`);
      
      if (validation.issues.length > 0) {
        console.log('\nIssues:');
        validation.issues.forEach(issue => console.log(`  ❌ ${issue}`));
      } else {
        console.log('  ✅ All lots have valid lotCodes');
      }
      return;
    }
    
    // Ejecutar migración
    const report = await migrateLotCodes(isDryRun);
    
    // Mostrar reporte
    console.log('\n📋 Migration Report:');
    console.log(`  📊 Processed: ${report.processed} lots`);
    console.log(`  ✅ Migrated: ${report.migrated} lots`);
    console.log(`  ⏭️  Skipped: ${report.skipped} lots (already valid)`);
    console.log(`  ❌ Errors: ${report.errors} lots`);
    console.log(`  ⚠️  Conflicts: ${report.conflicts.length} lots`);
    
    if (report.sample.length > 0) {
      console.log('\n📝 Sample migrations:');
      report.sample.forEach(s => {
        console.log(`  ${s.oldLotNumber} → ${s.newLotCode} ${s.preserved ? '(preserved)' : '(migrated)'}`);
      });
    }
    
    if (report.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts detected:');
      report.conflicts.slice(0, 5).forEach(c => {
        console.log(`  ${c.oldLotNumber} → ${c.newLotCode}: ${c.conflict}`);
      });
    }
    
    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. To execute migration:');
      console.log('   npx tsx scripts/migrate-lot-codes.ts --execute');
      console.log('\n🔍 To validate after migration:');
      console.log('   npx tsx scripts/migrate-lot-codes.ts --validate');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('   Run validation: npx tsx scripts/migrate-lot-codes.ts --validate');
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

export { migrateLotCodes, validateMigration };
