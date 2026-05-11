// src/services/canonical/fefo.service.ts
import { adminDb as db } from '@/server/firebase';
import { OnHandService } from './onhand.service';
import type { OnHand } from './onhand.service';

/**
 * FEFO Service - First Expired First Out
 * Implementa selección automática de lotes siguiendo reglas de caducidad
 */
export class FefoService {
  
  /**
   * Selecciona lotes para consumo siguiendo FEFO
   * Solo considera buckets RELEASED con stock disponible
   */
  static async selectLotsForConsumption(params: {
    itemId: string;
    requiredQty: number;
    locationId?: string;        // Si no se especifica, busca en todas las ubicaciones
    maxExpiredDays?: number;    // Máx días de caducidad permitidos (default: 30)
    minShelfLifeDays?: number;  // Mín días de vida útil requeridos (default: 7)
  }): Promise<{
    selection: Array<{
      lotCode: string;
      qtyToTake: number;
      locationId: string;
      expiresAt?: Date;
      daysToExpiry?: number;
      availableQty: number;
    }>;
    totalSelected: number;
    shortfall: number;          // Si no hay suficiente stock
  }> {
    
    const { itemId, requiredQty, locationId, maxExpiredDays = 30, minShelfLifeDays = 7 } = params;
    
    // 1. Buscar OnHand con stock RELEASED disponible
    let onHandQuery = db.collection('onHand')
      .where('itemId', '==', itemId);
    
    if (locationId) {
      onHandQuery = onHandQuery.where('locationId', '==', locationId);
    }
    
    const onHandSnap = await onHandQuery.get();
    
    // 2. Filtrar solo con stock disponible
    const availableLots = await Promise.all(
      onHandSnap.docs
        .map(doc => doc.data() as OnHand)
        .filter(oh => oh.availableQty > 0)  // Solo con stock disponible
        .map(async oh => {
          // Obtener fecha de caducidad del lote
          const lotsSnap = await db.collection('lots')
            .where('lotCode', '==', oh.lotCode)
            .limit(1)
            .get();
          
          const lot = lotsSnap.docs[0]?.data();
          const expiresAt = lot?.expDate ? new Date(lot.expDate) : null;
          
          return {
            lotCode: oh.lotCode,
            locationId: oh.locationId,
            availableQty: oh.availableQty,
            expiresAt,
            daysToExpiry: expiresAt ? 
              Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
              null
          };
        })
    );
    
    // 3. Filtrar por vida útil mínima
    const validLots = availableLots.filter(lot => {
      // Si no tiene fecha de caducidad, es válido
      if (!lot.expiresAt || lot.daysToExpiry === null) return true;
      
      // Verificar vida útil mínima
      return lot.daysToExpiry >= minShelfLifeDays;
    });
    
    if (validLots.length === 0) {
      return {
        selection: [],
        totalSelected: 0,
        shortfall: requiredQty
      };
    }
    
    // 4. Ordenar por FEFO (caducidad ascendente)
    validLots.sort((a, b) => {
      // Lotes sin caducidad van al final
      if (!a.expiresAt && !b.expiresAt) return 0;
      if (!a.expiresAt) return 1;
      if (!b.expiresAt) return -1;
      
      // Ordenar por fecha de caducidad
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });
    
    // 5. Seleccionar hasta cubrir cantidad requerida
    const selection: Array<any> = [];
    let remaining = requiredQty;
    
    for (const lot of validLots) {
      if (remaining <= 0) break;
      
      // Validar caducidad máxima permitida
      if (lot.daysToExpiry !== null && lot.daysToExpiry < 0) {
        // Lote ya caducado, saltar
        continue;
      }
      
      if (maxExpiredDays && lot.daysToExpiry !== null && lot.daysToExpiry > maxExpiredDays) {
        // Lote demasiado fresco para el filtro, saltar
        continue;
      }
      
      const qtyToTake = Math.min(remaining, lot.availableQty);
      
      selection.push({
        lotCode: lot.lotCode,
        qtyToTake,
        locationId: lot.locationId,
        expiresAt: lot.expiresAt,
        daysToExpiry: lot.daysToExpiry,
        availableQty: lot.availableQty
      });
      
      remaining -= qtyToTake;
    }
    
    return {
      selection,
      totalSelected: requiredQty - remaining,
      shortfall: remaining
    };
  }

  /**
   * Valida que un lote es consumible según reglas FEFO
   */
  static validateLotForConsumption(params: {
    expiresAt?: Date;
    minShelfLifeDays?: number;
    allowExpiredLots?: boolean;
  }): {
    valid: boolean;
    reason?: string;
    daysToExpiry?: number;
  } {
    
    const { expiresAt, minShelfLifeDays = 7, allowExpiredLots = false } = params;
    
    // Si no tiene fecha de caducidad, siempre es válido
    if (!expiresAt) {
      return { valid: true };
    }
    
    const now = Date.now();
    const daysToExpiry = Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
    
    // Verificar si está caducado
    if (daysToExpiry < 0) {
      return {
        valid: allowExpiredLots,
        reason: allowExpiredLots ? undefined : `Lot expired ${Math.abs(daysToExpiry)} days ago`,
        daysToExpiry
      };
    }
    
    // Verificar vida útil mínima
    if (daysToExpiry < minShelfLifeDays) {
      return {
        valid: false,
        reason: `Insufficient shelf life. Required: ${minShelfLifeDays} days, Available: ${daysToExpiry} days`,
        daysToExpiry
      };
    }
    
    return {
      valid: true,
      daysToExpiry
    };
  }

  /**
   * Genera reporte de lotes próximos a caducar
   * Útil para alertas proactivas
   */
  static async getLotExpiryReport(params: {
    itemIds?: string[];         // Items específicos, o todos si no se especifica
    warningDays?: number;       // Días de advertencia (default: 30)
    criticalDays?: number;      // Días críticos (default: 7)
    includeExpired?: boolean;   // Incluir ya caducados (default: true)
  }): Promise<{
    critical: Array<{
      lotCode: string;
      itemId: string;
      locationId: string;
      availableQty: number;
      daysToExpiry: number;
      expiresAt: Date;
    }>;
    warning: Array<{
      lotCode: string;
      itemId: string;
      locationId: string;
      availableQty: number;
      daysToExpiry: number;
      expiresAt: Date;
    }>;
    expired: Array<{
      lotCode: string;
      itemId: string;
      locationId: string;
      availableQty: number;
      daysToExpiry: number;
      expiresAt: Date;
    }>;
    summary: {
      totalLots: number;
      criticalLots: number;
      warningLots: number;
      expiredLots: number;
    };
  }> {
    
    const { itemIds, warningDays = 30, criticalDays = 7, includeExpired = true } = params;
    
    // Buscar OnHand con stock disponible
    const onHandSnap = await db.collection('onHand')
      .where('itemId', 'in', itemIds || ['dummy'])  // TODO: mejorar query
      .get();
    
    const lotsWithStock = onHandSnap.docs
      .map(doc => doc.data() as OnHand)
      .filter(oh => oh.availableQty > 0);
    
    // Obtener fechas de caducidad en lotes
    const lotCodes = lotsWithStock.map(oh => oh.lotCode);
    const batchSize = 10; // Firestore limit for 'in' queries
    const allLots: Array<any> = [];
    
    for (let i = 0; i < lotCodes.length; i += batchSize) {
      const batch = lotCodes.slice(i, i + batchSize);
      if (batch.length === 0) continue;
      
      const lotsSnap = await db.collection('lots')
        .where('lotCode', 'in', batch)
        .get();
      
      allLots.push(...lotsSnap.docs.map(doc => doc.data()));
    }
    
    // Combinar OnHand + Lot data con fechas válidas
    const combinedData = lotsWithStock
      .map(oh => {
        const lotData = allLots.find(lot => lot.lotCode === oh.lotCode);
        const expiresAt = lotData?.expDate ? new Date(lotData.expDate) : null;
        const daysToExpiry = expiresAt ? 
          Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) :
          null;
        
        return {
          lotCode: oh.lotCode,
          itemId: oh.itemId,
          locationId: oh.locationId,
          availableQty: oh.availableQty,
          expiresAt,
          daysToExpiry
        };
      })
      .filter(item => item.expiresAt && item.daysToExpiry !== null); // Solo con fechas válidas
    
    // Categorizar por urgencia
    const critical = combinedData.filter(item => 
      item.daysToExpiry! <= criticalDays && item.daysToExpiry! >= 0
    ) as Array<any>;
    
    const warning = combinedData.filter(item => 
      item.daysToExpiry! > criticalDays && item.daysToExpiry! <= warningDays
    ) as Array<any>;
    
    const expired = includeExpired ? 
      combinedData.filter(item => item.daysToExpiry! < 0) as Array<any> :
      [];
    
    return {
      critical,
      warning,
      expired,
      summary: {
        totalLots: combinedData.length,
        criticalLots: critical.length,
        warningLots: warning.length,
        expiredLots: expired.length
      }
    };
  }
}
