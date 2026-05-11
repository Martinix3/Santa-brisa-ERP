// src/services/canonical/reconciliation.service.ts
import { adminDb as db } from '@/server/firebase';
import { DEFAULT_LOCATION } from '@/config/locations';
import { OnHandService, OnHandInvariants } from './onhand.service';
import type { OnHand, QcBucket } from './onhand.service';

/**
 * Reconciliation Service - Garantiza consistencia OnHand vs StockMoves
 * Job idempotente para reconstruir/verificar saldos
 */
export class ReconciliationService {
  
  /**
   * Determina bucket QC desde reason de StockMove
   */
  private static getBucketFromStockMoveReason(reason: string): QcBucket {
    const normalizedReason = reason.toUpperCase();
    
    // Mapeo de reasons a buckets
    if (normalizedReason.includes('QC_RELEASED') || 
        normalizedReason.includes('APPROVED') ||
        normalizedReason.includes('CONSUMPTION') ||
        normalizedReason.includes('SALE')) {
      return 'RELEASED';
    }
    
    if (normalizedReason.includes('REJECTED') || 
        normalizedReason.includes('QC_FAILED')) {
      return 'REJECTED';
    }
    
    // Por defecto, todo va a HOLD (recepción inicial, etc.)
    return 'HOLD';
  }
  
  /**
   * Determina signo del movimiento (+ entrada, - salida)
   */
  private static getSignFromStockMoveReason(reason: string): number {
    const outReasons = [
      'CONSUMPTION', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT_NEG',
      'PRODUCTION_OUT', 'SHIPMENT', 'RETURN_OUT'
    ];
    
    const normalizedReason = reason.toUpperCase();
    
    if (outReasons.some(r => normalizedReason.includes(r))) {
      return -1; // Salida
    }
    
    return 1; // Entrada (por defecto)
  }

  /**
   * Reconstruye OnHand desde StockMoves para item/ubicación específica
   */
  static async reconcileOnHandFromStockMoves(params: {
    itemId?: string;              // Item específico, o todos si no se especifica
    locationId?: string;          // Ubicación específica
    lotCode?: string;             // Lote específico
    dryRun?: boolean;             // Solo calcular, no escribir
    maxStockMoves?: number;       // Límite de StockMoves a procesar (default: 10000)
  }): Promise<{
    processed: number;
    calculated: Map<string, OnHand>;
    differences: Array<{
      onHandId: string;
      calculated: OnHand;
      current?: OnHand;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      violations?: string[];
    }>;
  }> {
    
    const { itemId, locationId, lotCode, dryRun = false, maxStockMoves = 10000 } = params;
    
    // 1. Construir query para StockMoves
    let stockMovesQuery = db.collection('stockMoves')
      .orderBy('occurredAt', 'asc')  // Procesar en orden cronológico
      .limit(maxStockMoves);
    
    if (itemId) {
      stockMovesQuery = stockMovesQuery.where('itemId', '==', itemId);
    }
    
    const stockMovesSnap = await stockMovesQuery.get();
    const calculatedOnHand = new Map<string, OnHand>();
    
    // 2. Reducir StockMoves a OnHand calculado
    for (const smDoc of stockMovesSnap.docs) {
      const sm = smDoc.data();
      
      // Validar que tenemos datos mínimos
      if (!sm.itemId || !sm.lotCode) {
        console.warn(`Skipping StockMove ${smDoc.id}: missing itemId or lotCode`);
        continue;
      }
      
      // Determinar ubicación (priorizar toLocationId para entradas)
      const targetLocationId = sm.toLocationId || sm.fromLocationId || locationId || DEFAULT_LOCATION;
      
      // Filtrar por ubicación si se especifica
      if (locationId && targetLocationId !== locationId) {
        continue;
      }
      
      // Filtrar por lote si se especifica
      if (lotCode && sm.lotCode !== lotCode) {
        continue;
      }
      
      const onHandId = OnHandService.buildOnHandId(sm.itemId, sm.lotCode, targetLocationId);
      
      // Inicializar OnHand si no existe
      if (!calculatedOnHand.has(onHandId)) {
        calculatedOnHand.set(onHandId, {
          id: onHandId,
          itemId: sm.itemId,
          lotCode: sm.lotCode,
          locationId: targetLocationId,
          qty: { RELEASED: 0, HOLD: 0, REJECTED: 0 },
          reservedQty: { RELEASED: 0 },
          totalQty: 0,
          availableQty: 0,
          updatedAt: new Date(),
          schemaVersion: 1
        });
      }
      
      const current = calculatedOnHand.get(onHandId)!;
      
      // Determinar bucket y signo del movimiento
      const bucket = ReconciliationService.getBucketFromStockMoveReason(sm.reason);
      const sign = ReconciliationService.getSignFromStockMoveReason(sm.reason);
      const deltaQty = sign * sm.qty;
      
      // Aplicar movimiento
      current.qty[bucket] += deltaQty;
      
      // Validar no negativos después de cada movimiento
      if (current.qty[bucket] < 0) {
        console.error(`Negative balance detected in reconciliation:`, {
          onHandId,
          bucket,
          newBalance: current.qty[bucket],
          stockMove: { id: smDoc.id, reason: sm.reason, qty: sm.qty, deltaQty }
        });
        
        // Resetear a 0 para continuar reconciliación
        current.qty[bucket] = 0;
      }
      
      // Recalcular derivados
      current.totalQty = current.qty.RELEASED + current.qty.HOLD + current.qty.REJECTED;
      current.availableQty = current.qty.RELEASED - (current.reservedQty?.RELEASED || 0);
      current.updatedAt = new Date();
    }
    
    // 3. Comparar con OnHand actual y detectar diferencias
    const differences: Array<any> = [];
    
    for (const [onHandId, calculated] of calculatedOnHand) {
      const currentSnap = await db.doc(`onHand/${onHandId}`).get();
      const current = currentSnap.exists ? currentSnap.data() as OnHand : undefined;
      
      // Validar invariantes en el calculado
      const validation = OnHandService.validateInvariants(calculated);
      
      if (!current) {
        // OnHand no existe, debería crearse
        differences.push({ 
          onHandId, 
          calculated, 
          action: 'CREATE',
          violations: validation.valid ? undefined : validation.violations
        });
      } else {
        // Comparar balances
        const hasBalanceDifference = 
          current.qty.RELEASED !== calculated.qty.RELEASED ||
          current.qty.HOLD !== calculated.qty.HOLD ||
          current.qty.REJECTED !== calculated.qty.REJECTED;
        
        if (hasBalanceDifference) {
          differences.push({ 
            onHandId, 
            calculated, 
            current, 
            action: 'UPDATE',
            violations: validation.valid ? undefined : validation.violations
          });
        }
      }
    }
    
    // 4. Aplicar cambios si no es dry run
    if (!dryRun && differences.length > 0) {
      const batch = db.batch();
      let batchCount = 0;
      
      for (const diff of differences) {
        if (diff.violations?.length) {
          console.error(`Skipping OnHand with violations:`, diff.onHandId, diff.violations);
          continue;
        }
        
        if (diff.action === 'CREATE' || diff.action === 'UPDATE') {
          batch.set(db.doc(`onHand/${diff.onHandId}`), diff.calculated, { merge: true });
          batchCount++;
          
          // Firestore batch limit = 500
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    
    return {
      processed: calculatedOnHand.size,
      calculated: calculatedOnHand,
      differences
    };
  }

  /**
   * Verifica consistencia entre StockMoves y OnHand existente
   * Identifica discrepancias sin modificar datos
   */
  static async verifyStockMovesConsistency(params: {
    itemIds?: string[];
    reportLimit?: number;
  }): Promise<{
    consistent: boolean;
    totalChecked: number;
    discrepancies: Array<{
      onHandId: string;
      expectedBalance: OnHand['qty'];
      actualBalance: OnHand['qty'];
      difference: {
        RELEASED: number;
        HOLD: number;
        REJECTED: number;
      };
    }>;
    summary: {
      itemsChecked: number;
      onHandChecked: number;
      discrepanciesFound: number;
      largestDiscrepancy: number;
    };
  }> {
    
    const { itemIds, reportLimit = 50 } = params;
    
    // Obtener muestra de OnHand para verificar
    let onHandQuery = db.collection('onHand').limit(reportLimit);
    
    if (itemIds?.length) {
      // Verificar items específicos
      onHandQuery = db.collection('onHand').where('itemId', 'in', itemIds.slice(0, 10));
    }
    
    const onHandSnap = await onHandQuery.get();
    const discrepancies: Array<any> = [];
    let largestDiscrepancy = 0;
    
    for (const onHandDoc of onHandSnap.docs) {
      const actualOnHand = onHandDoc.data() as OnHand;
      
      // Recalcular desde StockMoves para este OnHand específico
      const reconciliation = await ReconciliationService.reconcileOnHandFromStockMoves({
        itemId: actualOnHand.itemId,
        locationId: actualOnHand.locationId,
        lotCode: actualOnHand.lotCode,
        dryRun: true
      });
      
      const calculatedOnHand = reconciliation.calculated.get(actualOnHand.id);
      
      if (calculatedOnHand) {
        const releasedDiff = Math.abs(actualOnHand.qty.RELEASED - calculatedOnHand.qty.RELEASED);
        const holdDiff = Math.abs(actualOnHand.qty.HOLD - calculatedOnHand.qty.HOLD);
        const rejectedDiff = Math.abs(actualOnHand.qty.REJECTED - calculatedOnHand.qty.REJECTED);
        
        const totalDiff = releasedDiff + holdDiff + rejectedDiff;
        
        if (totalDiff > 0) {
          discrepancies.push({
            onHandId: actualOnHand.id,
            expectedBalance: calculatedOnHand.qty,
            actualBalance: actualOnHand.qty,
            difference: {
              RELEASED: actualOnHand.qty.RELEASED - calculatedOnHand.qty.RELEASED,
              HOLD: actualOnHand.qty.HOLD - calculatedOnHand.qty.HOLD,
              REJECTED: actualOnHand.qty.REJECTED - calculatedOnHand.qty.REJECTED
            }
          });
          
          largestDiscrepancy = Math.max(largestDiscrepancy, totalDiff);
        }
      }
    }
    
    // Agrupar estadísticas
    const uniqueItemIds = new Set(onHandSnap.docs.map(doc => doc.data().itemId));
    
    return {
      consistent: discrepancies.length === 0,
      totalChecked: onHandSnap.size,
      discrepancies,
      summary: {
        itemsChecked: uniqueItemIds.size,
        onHandChecked: onHandSnap.size,
        discrepanciesFound: discrepancies.length,
        largestDiscrepancy
      }
    };
  }

  /**
   * Backup de OnHand actual antes de reconciliación
   */
  static async backupOnHandCollection(): Promise<{
    backupId: string;
    documentsBackedUp: number;
  }> {
    const backupId = `onhand_backup_${Date.now()}`;
    const onHandSnap = await db.collection('onHand').get();
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of onHandSnap.docs) {
      const backupRef = db.collection(backupId).doc(doc.id);
      batch.set(backupRef, {
        ...doc.data(),
        backedUpAt: new Date(),
        originalId: doc.id
      });
      count++;
      
      // Firestore batch limit
      if (count % 450 === 0) {
        await batch.commit();
      }
    }
    
    if (count % 450 !== 0) {
      await batch.commit();
    }
    
    return {
      backupId,
      documentsBackedUp: count
    };
  }

  /**
   * Restaura OnHand desde backup
   */
  static async restoreFromBackup(backupId: string): Promise<{
    restored: number;
  }> {
    const backupSnap = await db.collection(backupId).get();
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of backupSnap.docs) {
      const data = doc.data();
      const { backedUpAt, originalId, ...onHandData } = data;
      
      const onHandRef = db.collection('onHand').doc(originalId);
      batch.set(onHandRef, onHandData);
      count++;
      
      if (count % 450 === 0) {
        await batch.commit();
      }
    }
    
    if (count % 450 !== 0) {
      await batch.commit();
    }
    
    return { restored: count };
  }

  /**
   * Job principal de reconciliación con respaldo automático
   */
  static async performFullReconciliation(params: {
    createBackup?: boolean;
    dryRun?: boolean;
    maxItems?: number;
  }): Promise<{
    success: boolean;
    backupId?: string;
    reconciliationResult?: any;
    error?: string;
  }> {
    
    try {
      const { createBackup = true, dryRun = false, maxItems = 1000 } = params;
      
      console.log('🔄 Starting full reconciliation...');
      
      // 1. Backup opcional
      let backupId: string | undefined;
      if (createBackup && !dryRun) {
        console.log('📦 Creating backup...');
        const backup = await ReconciliationService.backupOnHandCollection();
        backupId = backup.backupId;
        console.log(`📦 Backup created: ${backupId} (${backup.documentsBackedUp} docs)`);
      }
      
      // 2. Reconciliar por lotes para evitar timeouts
      console.log('🧮 Calculating reconciliation...');
      const reconciliationResult = await ReconciliationService.reconcileOnHandFromStockMoves({
        dryRun: true  // Primero calcular todo
      });
      
      console.log(`📊 Reconciliation calculated:`);
      console.log(`  - Processed: ${reconciliationResult.processed} OnHand records`);
      console.log(`  - Differences: ${reconciliationResult.differences.length}`);
      
      // 3. Validar que no hay violaciones críticas
      const criticalViolations = reconciliationResult.differences.filter(
        diff => diff.violations?.length
      );
      
      if (criticalViolations.length > 0) {
        console.error('❌ Critical violations detected:', criticalViolations.length);
        return {
          success: false,
          error: `Critical invariant violations detected: ${criticalViolations.length}`,
          reconciliationResult
        };
      }
      
      // 4. Aplicar cambios si no es dry run
      if (!dryRun) {
        console.log('✍️  Applying reconciliation...');
        await ReconciliationService.reconcileOnHandFromStockMoves({
          dryRun: false
        });
        console.log('✅ Reconciliation applied successfully');
      }
      
      return {
        success: true,
        backupId,
        reconciliationResult
      };
      
    } catch (error: any) {
      console.error('❌ Reconciliation failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown reconciliation error'
      };
    }
  }

  /**
   * Monitoreo continuo de consistencia
   * Ejecutar como cron job o Cloud Function
   */
  static async monitorConsistency(): Promise<{
    healthy: boolean;
    alerts: Array<{
      type: 'CRITICAL' | 'WARNING';
      message: string;
      data?: any;
    }>;
  }> {
    
    const alerts: Array<any> = [];
    
    try {
      // 1. Verificar muestra de OnHand
      const verification = await ReconciliationService.verifyStockMovesConsistency({
        reportLimit: 20  // Muestra pequeña para monitoreo
      });
      
      if (!verification.consistent) {
        alerts.push({
          type: 'WARNING' as const,
          message: `Stock inconsistency detected in ${verification.discrepancies.length} records`,
          data: {
            discrepancies: verification.discrepancies.length,
            largestDiscrepancy: verification.summary.largestDiscrepancy
          }
        });
      }
      
      // 2. Verificar que no hay invariantes violados
      const onHandSample = await db.collection('onHand').limit(10).get();
      
      for (const doc of onHandSample.docs) {
        const onHand = doc.data() as OnHand;
        const validation = OnHandService.validateInvariants(onHand);
        
        if (!validation.valid) {
          alerts.push({
            type: 'CRITICAL' as const,
            message: `OnHand invariant violations: ${doc.id}`,
            data: {
              violations: validation.violations,
              onHandId: doc.id
            }
          });
        }
      }
      
      return {
        healthy: alerts.length === 0,
        alerts
      };
      
    } catch (error: any) {
      return {
        healthy: false,
        alerts: [{
          type: 'CRITICAL' as const,
          message: `Monitoring failed: ${error.message}`,
          data: { error: error.message }
        }]
      };
    }
  }
}
