#!/usr/bin/env tsx
// scripts/rebuild-onhand.ts

import { adminDb as db } from '../src/server/firebase';
import { ReconciliationService } from '../src/services/canonical/reconciliation.service';
import { OnHandService } from '../src/services/canonical/onhand.service';

/**
 * Reconstruye la colección OnHand desde StockMoves migrados
 * CRÍTICO: Solo ejecutar después de migrar lots y stockMoves
 * Ejecutar: npx tsx scripts/rebuild-onhand.ts [--verify|--execute|--restore]
 */

interface RebuildReport {
  stockMovesProcessed: number;
  onHandCreated: number;
  onHandUpdated: number;
  onHandDeleted: number;
  invariantViolations: number;
  backupId?: string;
  errors: Array<{
    onHandId: string;
    error: string;
  }>;
}

async function rebuildOnHandCollection(params: {
  dryRun?: boolean;
  createBackup?: boolean;
  maxStockMoves?: number;
}): Promise<RebuildReport> {
  
  const { dryRun = false, createBackup = true, maxStockMoves = 50000 } = params;
  
  console.log(`🔄 Starting OnHand rebuild (${dryRun ? 'DRY RUN' : 'EXECUTE'})`);
  
  const report: RebuildReport = {
    stockMovesProcessed: 0,
    onHandCreated: 0,
    onHandUpdated: 0,
    onHandDeleted: 0,
    invariantViolations: 0,
    errors: []
  };
  
  try {
    // 1. Backup opcional de OnHand actual
    if (createBackup && !dryRun) {
      console.log('📦 Creating backup of current OnHand...');
      const backup = await ReconciliationService.backupOnHandCollection();
      report.backupId = backup.backupId;
      console.log(`📦 Backup created: ${backup.backupId} (${backup.documentsBackedUp} docs)`);
    }
    
    // 2. Ejecutar reconciliación completa
    console.log('🧮 Rebuilding OnHand from StockMoves...');
    const reconciliation = await ReconciliationService.reconcileOnHandFromStockMoves({
      dryRun,
      maxStockMoves
    });
    
    report.stockMovesProcessed = reconciliation.processed;
    
    // 3. Analizar diferencias
    const creates = reconciliation.differences.filter(d => d.action === 'CREATE');
    const updates = reconciliation.differences.filter(d => d.action === 'UPDATE');
    const deletes = reconciliation.differences.filter(d => d.action === 'DELETE');
    const violations = reconciliation.differences.filter(d => d.violations?.length);
    
    report.onHandCreated = creates.length;
    report.onHandUpdated = updates.length;
    report.onHandDeleted = deletes.length;
    report.invariantViolations = violations.length;
    
    // 4. Reportar violaciones críticas
    violations.forEach(violation => {
      report.errors.push({
        onHandId: violation.onHandId,
        error: `Invariant violations: ${violation.violations?.join(', ')}`
      });
    });
    
    console.log(`📊 Rebuild Analysis:`);
    console.log(`  - StockMoves processed: ${report.stockMovesProcessed}`);
    console.log(`  - OnHand to create: ${report.onHandCreated}`);
    console.log(`  - OnHand to update: ${report.onHandUpdated}`);
    console.log(`  - OnHand to delete: ${report.onHandDeleted}`);
    console.log(`  - Invariant violations: ${report.invariantViolations}`);
    
    // 5. Bloquear si hay violaciones críticas
    if (report.invariantViolations > 0 && !dryRun) {
      console.error('❌ BLOCKED: Invariant violations detected. Cannot proceed with rebuild.');
      console.log('   Review violations and fix StockMoves data before retrying');
      throw new Error(`${report.invariantViolations} invariant violations detected`);
    }
    
    return report;
    
  } catch (error: any) {
    console.error('❌ OnHand rebuild failed:', error);
    throw error;
  }
}

async function verifyOnHandIntegrity(): Promise<{
  valid: boolean;
  totalChecked: number;
  invariantViolations: number;
  consistencyIssues: number;
  issues: string[];
}> {
  
  console.log('🔍 Verifying OnHand integrity...');
  
  const issues: string[] = [];
  let invariantViolations = 0;
  
  try {
    // 1. Verificar invariantes en toda la colección OnHand
    const onHandSnap = await db.collection('onHand').get();
    console.log(`📊 Checking ${onHandSnap.docs.length} OnHand records...`);
    
    for (const doc of onHandSnap.docs) {
      const onHand = doc.data() as any;  // Type assertion para migración
      
      // Validar estructura básica
      if (!onHand.itemId || !onHand.lotCode || !onHand.locationId) {
        issues.push(`OnHand ${doc.id}: Missing required fields (itemId, lotCode, locationId)`);
        continue;
      }
      
      // Validar que el ID sigue el patrón canónico
      const expectedId = `${onHand.itemId}::${onHand.lotCode}::${onHand.locationId}`;
      if (doc.id !== expectedId) {
        issues.push(`OnHand ${doc.id}: ID doesn't follow canonical pattern. Expected: ${expectedId}`);
      }
      
      // Validar invariantes usando OnHandService
      const validation = OnHandService.validateInvariants(onHand);
      
      if (!validation.valid) {
        invariantViolations++;
        issues.push(`OnHand ${doc.id}: Invariant violations: ${validation.violations.join(', ')}`);
      }
    }
    
    // 2. Verificar consistencia con StockMoves (muestra)
    console.log('🔍 Checking consistency with StockMoves (sample)...');
    const consistency = await ReconciliationService.verifyStockMovesConsistency({
      reportLimit: 20
    });
    
    if (!consistency.consistent) {
      issues.push(`Stock inconsistency detected in ${consistency.discrepancies.length} records`);
    }
    
    return {
      valid: issues.length === 0,
      totalChecked: onHandSnap.docs.length,
      invariantViolations,
      consistencyIssues: consistency.discrepancies.length,
      issues
    };
    
  } catch (error: any) {
    issues.push(`Verification failed: ${error.message}`);
    return {
      valid: false,
      totalChecked: 0,
      invariantViolations,
      consistencyIssues: 0,
      issues
    };
  }
}

async function clearOnHandCollection(): Promise<{
  deleted: number;
}> {
  console.log('🗑️  Clearing OnHand collection...');
  
  const snapshot = await db.collection('onHand').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  console.log(`🗑️  Deleted ${snapshot.docs.length} OnHand records`);
  
  return { deleted: snapshot.docs.length };
}

async function restoreOnHandFromBackup(backupId: string): Promise<void> {
  console.log(`🔄 Restoring OnHand from backup: ${backupId}`);
  
  const result = await ReconciliationService.restoreFromBackup(backupId);
  
  console.log(`✅ Restored ${result.restored} OnHand records from backup`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldVerify = args.includes('--verify');
  const shouldExecute = args.includes('--execute');
  const shouldRestore = args.includes('--restore');
  const backupId = args.find(arg => arg.startsWith('--backup-id='))?.split('=')[1];
  const skipBackup = args.includes('--skip-backup');
  
  try {
    if (shouldRestore) {
      if (!backupId) {
        console.error('❌ --restore requires --backup-id=<backup_id>');
        process.exit(1);
      }
      await restoreOnHandFromBackup(backupId);
      return;
    }
    
    if (shouldVerify) {
      const verification = await verifyOnHandIntegrity();
      console.log('\n📋 OnHand Integrity Report:');
      console.log(`Valid: ${verification.valid ? '✅' : '❌'}`);
      console.log(`Total checked: ${verification.totalChecked}`);
      console.log(`Invariant violations: ${verification.invariantViolations}`);
      console.log(`Consistency issues: ${verification.consistencyIssues}`);
      
      if (verification.issues.length > 0) {
        console.log('\nIssues (first 10):');
        verification.issues.slice(0, 10).forEach(issue => console.log(`  ❌ ${issue}`));
        
        if (verification.issues.length > 10) {
          console.log(`  ... and ${verification.issues.length - 10} more issues`);
        }
      }
      return;
    }
    
    if (!shouldExecute) {
      console.log('🔍 DRY RUN mode - calculating rebuild...');
    }
    
    // Ejecutar rebuild
    const report = await rebuildOnHandCollection({
      dryRun: !shouldExecute,
      createBackup: !skipBackup,
      maxStockMoves: 50000
    });
    
    // Mostrar reporte
    console.log('\n📋 OnHand Rebuild Report:');
    console.log(`  📊 StockMoves processed: ${report.stockMovesProcessed}`);
    console.log(`  ✅ OnHand created: ${report.onHandCreated}`);
    console.log(`  📝 OnHand updated: ${report.onHandUpdated}`);
    console.log(`  🗑️  OnHand deleted: ${report.onHandDeleted}`);
    console.log(`  ❌ Invariant violations: ${report.invariantViolations}`);
    console.log(`  🆔 Backup ID: ${report.backupId || 'None'}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ Errors (first 5):');
      report.errors.slice(0, 5).forEach(err => {
        console.log(`  ${err.onHandId}: ${err.error}`);
      });
    }
    
    if (!shouldExecute) {
      console.log('\n🔍 This was a DRY RUN. To execute rebuild:');
      console.log('   npx tsx scripts/rebuild-onhand.ts --execute');
      console.log('\n🔍 To verify after rebuild:');
      console.log('   npx tsx scripts/rebuild-onhand.ts --verify');
      console.log('\n🚨 To restore from backup:');
      console.log(`   npx tsx scripts/rebuild-onhand.ts --restore --backup-id=${report.backupId || 'BACKUP_ID'}`);
    } else {
      console.log('\n✅ OnHand rebuild completed successfully!');
      console.log('   Run verification: npx tsx scripts/rebuild-onhand.ts --verify');
      
      if (report.backupId) {
        console.log(`\n🚨 BACKUP AVAILABLE for rollback:`);
        console.log(`   npx tsx scripts/rebuild-onhand.ts --restore --backup-id=${report.backupId}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Rebuild script failed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { rebuildOnHandCollection, verifyOnHandIntegrity, clearOnHandCollection, restoreOnHandFromBackup };
