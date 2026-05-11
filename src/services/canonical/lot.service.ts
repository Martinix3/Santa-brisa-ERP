// src/services/canonical/lot.service.ts
import { adminDb as db } from '@/server/firebase';
import { OnHandService, type OnHand } from './onhand.service';
import type { QcBucket } from './onhand.service';

/**
 * Servicio canónico para gestión de lotes
 * Implementa generación race-free y creación transaccional
 */
export class LotService {
  
  /**
   * Genera lotCode race-free usando contadores atómicos
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   * 
   * Patrón: YYJJJ-PL[-LN]-SEQ
   * - YY: Año (25 para 2025)
   * - JJJ: Día del año (001-366)
   * - PL: Plant code (SB, MAD, BCN)
   * - LN: Line code opcional (L1, L2, PKG)
   * - SEQ: Secuencia 001-999
   */
  static async generateLotCode(
    txOrNull: FirebaseFirestore.Transaction | null | undefined,
    params: {
      plant: string;              // Ej: 'SB', 'MAD', 'BCN'
      line?: string;              // Ej: 'L1', 'L2', 'PKG'
      date?: Date;
    }
  ): Promise<string> {
    const { plant, line, date = new Date() } = params;

    const exec = async (tx: FirebaseFirestore.Transaction) => {
      // 1. Formato YYJJJ (año + día del año)
      const year = date.getFullYear().toString().slice(-2);
      const startOfYear = new Date(date.getFullYear(), 0, 0);
      const dayOfYear = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );
      const yyjjj = year + dayOfYear.toString().padStart(3, '0');
      
      // 2. Ámbito del contador (único por planta-día-línea)
      const scope = line 
        ? `LOT:${plant}:${yyjjj}:${line}`
        : `LOT:${plant}:${yyjjj}`;
      
      const counterRef = db.doc(`counters/${scope}`);
      
      // 3. Incremento atómico dentro de la transacción
      const counterSnap = await tx.get(counterRef);
      const currentValue = counterSnap.exists ? counterSnap.data()?.value || 0 : 0;
      const nextValue = currentValue + 1;
      
      // Validar que no exceda límite (999 lotes por día)
      if (nextValue > 999) {
        throw new Error(
          `Daily lot limit exceeded for ${scope}. ` +
          `Max: 999, Current: ${nextValue}`
        );
      }
      
      tx.set(counterRef, { 
        value: nextValue, 
        lastUsed: date.toISOString(),
        scope,
        updatedAt: new Date()
      }, { merge: true });
      
      // 4. Construir código final
      const head = line ? `${yyjjj}-${plant}-${line}` : `${yyjjj}-${plant}`;
      const sequence = nextValue.toString().padStart(3, '0');
      
      return `${head}-${sequence}`;
    };

    if (txOrNull) return exec(txOrNull);
    // fallback: abre su propia transacción (evita el error de tx=null)
    return db.runTransaction(async (tx) => exec(tx));
  }

  /**
   * Crea un código de lote garantizando unicidad mediante un contador atómico.
   * @param prefix - 'P' para Producción, 'E' para Envasado.
   * @returns El nuevo código de lote.
   */
  static async createRaceFreeLotCode(prefix: 'P' | 'E'): Promise<string> {
    return db.runTransaction(async (tx) => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const startOfYear = new Date(date.getFullYear(), 0, 0);
      const dayOfYear = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );
      const yjjj = year + dayOfYear.toString().padStart(3, '0');

      const scope = `LOT:${prefix}:${yjjj}`;
      const counterRef = db.doc(`counters/${scope}`);

      const counterSnap = await tx.get(counterRef);
      const currentValue = counterSnap.exists ? counterSnap.data()?.value || 0 : 0;
      const nextValue = currentValue + 1;

      if (nextValue > 999) {
        throw new Error(`Daily lot limit exceeded for ${scope}.`);
      }

      tx.set(counterRef, {
        value: nextValue,
        lastUsed: date.toISOString(),
        scope,
        updatedAt: new Date(),
      }, { merge: true });

      const sequence = nextValue.toString().padStart(3, '0');
      return `${yjjj}-SB-${prefix}-${sequence}`;
    });
  }
  
  /**
   * Crea nuevo lote con código generado automáticamente
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   */
  static async createLot(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      plant: string;
      line?: string;
      quantity: number;
      uom: string;
      locationId: string;
      supplierId?: string;
      externalLot?: string;
      expiryDate?: Date;
      userId?: string;
    }
  ): Promise<{ lotId: string; lotCode: string }> {
    const { itemId, quantity, uom, locationId, userId, ...lotParams } = params;
    
    // ===== FASE 1: TODAS LAS LECTURAS PRIMERO =====
    
    // 1. Validar que item existe
    const itemRef = db.doc(`items/${itemId}`);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists) {
      throw new Error(`Item not found: ${itemId}`);
    }
    
    // 2. Validar que location existe
    const locationRef = db.doc(`locations/${locationId}`);
    const locationSnap = await tx.get(locationRef);
    if (!locationSnap.exists) {
      throw new Error(`Location not found: ${locationId}`);
    }
    
    // 3. Generar lotCode (incluye write en counter, así que debe ser el ÚLTIMO read)
    const lotCode = await LotService.generateLotCode(tx, {
      plant: lotParams.plant,
      line: lotParams.line,
      date: new Date()
    });
    
    // ===== FASE 2: TODAS LAS ESCRITURAS DESPUÉS =====
    // IMPORTANTE: Después de generateLotCode NO podemos hacer más reads
    
    // 4. Crear documento de lote
    const lotRef = db.collection('lots').doc();
    const lotData = {
      id: lotRef.id,
      lotCode,
      itemId,
      quantity,
      uom,
      qcStatus: 'PENDING' as const,
      status: 'HOLD' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      supplierId: params.supplierId,
      externalLot: params.externalLot,
      expDate: params.expiryDate?.toISOString(),
      schemaVersion: 2
    };
    
    tx.set(lotRef, lotData);
    
    // 5. Crear OnHand inicial (asumimos que es nuevo, no hacemos read)
    const onHandId = OnHandService.buildOnHandId(itemId, lotCode, locationId);
    const ohRef = db.doc(`onHand/${onHandId}`);
    
    const newOnHand: OnHand = {
      id: onHandId,
      itemId,
      lotCode,
      locationId,
      qty: { RELEASED: 0, HOLD: quantity, REJECTED: 0 },
      reservedQty: { RELEASED: 0 },
      totalQty: quantity,
      availableQty: 0,
      updatedAt: new Date(),
      updatedBy: userId,
      schemaVersion: 1
    };
    
    tx.set(ohRef, newOnHand, { merge: true });

    // TODO: Implement OnHandService.createInitialHold
    // OnHandService.createInitialHold(itemId, lotCode, locationId, quantity);
    
    return { lotId: lotRef.id, lotCode };
  }

  /**
   * Valida formato de lotCode canónico
   */
  static validateLotCode(lotCode: string): boolean {
    // Patrón: YYJJJ-PL[-LN]-SEQ
    // Ejemplos: "25001-SB-001", "25365-MAD-L1-999"
    const pattern = /^\d{5}-[A-Z]+(-[A-Z0-9]+)?-\d{3}$/;
    return pattern.test(lotCode);
  }

  /**
   * Extrae información del lotCode
   */
  static parseLotCode(lotCode: string): {
    year: number;
    dayOfYear: number;
    plant: string;
    line?: string;
    sequence: number;
    date: Date;
  } | null {
    
    if (!LotService.validateLotCode(lotCode)) {
      return null;
    }
    
    const parts = lotCode.split('-');
    const yyjjj = parts[0];
    const plant = parts[1];
    
    // Determinar si hay línea o no
    let line: string | undefined;
    let sequenceStr: string;
    
    if (parts.length === 4) {
      // Formato con línea: YYJJJ-PL-LN-SEQ
      line = parts[2];
      sequenceStr = parts[3];
    } else if (parts.length === 3) {
      // Formato sin línea: YYJJJ-PL-SEQ
      sequenceStr = parts[2];
    } else {
      return null;
    }
    
    const year = 2000 + parseInt(yyjjj.slice(0, 2));
    const dayOfYear = parseInt(yyjjj.slice(2));
    const sequence = parseInt(sequenceStr);
    
    // Calcular fecha real
    const date = new Date(year, 0, dayOfYear);
    
    return {
      year,
      dayOfYear,
      plant,
      line,
      sequence,
      date
    };
  }

  /**
   * Migra lote legacy a nuevo formato con lotCode
   * Preserva la fecha original si está disponible
   */
  static generateLotCodeFromLegacy(legacyLot: any): string {
    // Intentar preservar fecha de manufactura/recepción
    const manufacturedAt = legacyLot.receivedAt || legacyLot.createdAt;
    const date = manufacturedAt ? new Date(manufacturedAt) : new Date();
    
    // Detectar planta desde datos existentes (por ahora defaultear a SB)
    const plant = 'SB';
    
    // Detectar línea desde lotNumber legacy si es posible
    // Patrón común: "SB-ICE-001-2410-001" → line podría ser "ICE"
    let line: string | undefined;
    if (legacyLot.lotNumber && typeof legacyLot.lotNumber === 'string') {
      const parts = legacyLot.lotNumber.split('-');
      if (parts.length >= 3) {
        line = parts[1]; // Tomar segunda parte como línea
      }
    }
    
    // Generar usando formato nuevo
    const year = date.getFullYear().toString().slice(-2);
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    const yyjjj = year + dayOfYear.toString().padStart(3, '0');
    
    // Para migración, usar timestamp como secuencia para evitar conflictos
    const sequence = (Date.now() % 1000).toString().padStart(3, '0');
    
    const head = line ? `${yyjjj}-${plant}-${line}` : `${yyjjj}-${plant}`;
    return `${head}-${sequence}`;
  }
}
