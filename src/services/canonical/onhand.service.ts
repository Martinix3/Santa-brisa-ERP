// src/services/canonical/onhand.service.ts
import { adminDb as db } from '@/server/firebase';

export type QcBucket = 'RELEASED' | 'HOLD' | 'REJECTED';

export interface OnHand {
  id: string;                    // `${itemId}::${lotCode}::${locationId}`
  
  // REFERENCIAS
  itemId: string;               // FK canónica a items
  lotCode: string;              // Código de lote canónico
  locationId: string;           // FK a locations
  
  // SALDOS POR BUCKET QC (no negativos)
  qty: {
    RELEASED: number;           // Disponible para venta/consumo
    HOLD: number;               // En revisión QC
    REJECTED: number;           // Rechazado definitivamente
  };
  
  // RESERVAS (solo de RELEASED)
  reservedQty?: {
    RELEASED?: number;          // Reservado para pedidos
  };
  
  // DERIVADOS (redundantes para fast-reads)
  totalQty: number;             // sum(qty.RELEASED + qty.HOLD + qty.REJECTED)
  availableQty: number;         // qty.RELEASED - reservedQty.RELEASED
  
  // AUDITORÍA
  updatedAt: Date;
  updatedBy?: string;           // userId del responsable
  
  schemaVersion: 1;
}

/**
 * Invariantes de negocio que SIEMPRE deben cumplirse
 */
export const OnHandInvariants = {
  // 1. Consistencia de totales
  totalQty: (oh: OnHand): boolean => 
    oh.totalQty === oh.qty.RELEASED + oh.qty.HOLD + oh.qty.REJECTED,
  
  // 2. Disponibilidad correcta  
  availableQty: (oh: OnHand): boolean => 
    oh.availableQty === oh.qty.RELEASED - (oh.reservedQty?.RELEASED || 0),
  
  // 3. No negativos
  noNegatives: (oh: OnHand): boolean => 
    oh.qty.RELEASED >= 0 && oh.qty.HOLD >= 0 && oh.qty.REJECTED >= 0 &&
    (oh.reservedQty?.RELEASED || 0) >= 0,
  
  // 4. Reservas válidas
  validReservations: (oh: OnHand): boolean => 
    (oh.reservedQty?.RELEASED || 0) <= oh.qty.RELEASED
};

/**
 * Servicio canónico para gestión de OnHand
 * CRÍTICO: Todos los métodos requieren transacción de Firestore
 */
export class OnHandService {
  
  /**
   * Construye ID canónico para OnHand
   */
  static buildOnHandId(itemId: string, lotCode: string, locationId: string): string {
    return `${itemId}::${lotCode}::${locationId}`;
  }

  /**
   * Actualiza saldos OnHand dentro de transacción
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   */
  static async updateBalance(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      bucket: QcBucket;
      deltaQty: number;           // Puede ser negativo
      reason: string;             // Para auditoría
      userId?: string;
      currentOnHand?: OnHand;     // NUEVO: OnHand pre-leído para evitar tx.get()
    }
  ): Promise<OnHand> {
    const { itemId, lotCode, locationId, bucket, deltaQty, reason, userId, currentOnHand } = params;
    
    // 1. Construir ID canónico
    const onHandId = OnHandService.buildOnHandId(itemId, lotCode, locationId);
    const ohRef = db.doc(`onHand/${onHandId}`);
    
    // 2. Usar OnHand pre-leído o leer estado actual
    let current: OnHand;
    
    if (currentOnHand) {
      // Usar OnHand ya leído (evita tx.get() para cumplir regla de Firestore)
      current = {
        ...currentOnHand,
        qty: currentOnHand.qty || { RELEASED: 0, HOLD: 0, REJECTED: 0 },
        reservedQty: currentOnHand.reservedQty || { RELEASED: 0 }
      };
    } else {
      // Leer estado actual (solo si no se proporcionó)
      const ohSnap = await tx.get(ohRef);
      
      if (ohSnap.exists) {
        const data = ohSnap.data() as OnHand;
        current = {
          ...data,
          qty: data.qty || { RELEASED: 0, HOLD: 0, REJECTED: 0 },
          reservedQty: data.reservedQty || { RELEASED: 0 }
        };
      } else {
        current = {
          id: onHandId,
          itemId,
          lotCode,
          locationId,
          qty: { RELEASED: 0, HOLD: 0, REJECTED: 0 },
          reservedQty: { RELEASED: 0 },
          totalQty: 0,
          availableQty: 0,
          updatedAt: new Date(),
          schemaVersion: 1
        };
      }
    }
    
    // 3. Asegurar que el bucket específico existe
    if (current.qty[bucket] === undefined) {
      current.qty[bucket] = 0;
    }
    
    // 4. Aplicar delta
    current.qty[bucket] += deltaQty;
    
    // 4. Validar invariantes - NO NEGATIVOS
    if (current.qty[bucket] < 0) {
      throw new Error(
        `OnHand.${bucket} cannot be negative. ` +
        `ItemId: ${itemId}, LotCode: ${lotCode}, ` +
        `Current: ${current.qty[bucket]}, Delta: ${deltaQty}, Reason: ${reason}`
      );
    }
    
    // 5. Recalcular derivados
    current.totalQty = current.qty.RELEASED + current.qty.HOLD + current.qty.REJECTED;
    current.availableQty = current.qty.RELEASED - (current.reservedQty?.RELEASED || 0);
    current.updatedAt = new Date();
    current.updatedBy = userId;
    
    // 6. Validar TODOS los invariantes
    Object.entries(OnHandInvariants).forEach(([name, validator]) => {
      if (!validator(current)) {
        console.error('OnHand state:', current);
        throw new Error(`OnHand invariant violation: ${name} for ${onHandId}`);
      }
    });
    
    // 7. Escribir a Firestore
    tx.set(ohRef, current, { merge: true });
    
    return current;
  }
  
  /**
   * Transfiere stock entre buckets (cambios de estado QC)
   * Ejemplo: HOLD → RELEASED cuando QC aprueba lote
   */
  static async transferBetweenBuckets(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      fromBucket: QcBucket;
      toBucket: QcBucket;
      qty: number;
      userId?: string;
      reason?: string;
      currentOnHand?: OnHand;     // NUEVO: OnHand pre-leído
    }
  ): Promise<void> {
    const { fromBucket, toBucket, qty, reason, currentOnHand } = params;
    
    // Restar del bucket origen (pasar currentOnHand para evitar lectura)
    const afterSubtract = await OnHandService.updateBalance(tx, {
      ...params,
      bucket: fromBucket,
      deltaQty: -qty,
      reason: reason || `QC_TRANSFER_OUT_${toBucket}`,
      currentOnHand
    });
    
    // Sumar al bucket destino (usar el OnHand actualizado del paso anterior)
    await OnHandService.updateBalance(tx, {
      ...params,
      bucket: toBucket,
      deltaQty: qty,
      reason: reason || `QC_TRANSFER_IN_${fromBucket}`,
      currentOnHand: afterSubtract
    });
  }
  
  /**
   * Reserva stock para pedidos (solo de bucket RELEASED)
   */
  static async reserveStock(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      qty: number;
      orderId?: string;
      userId?: string;
    }
  ): Promise<OnHand> {
    const { itemId, lotCode, locationId, qty, userId } = params;
    
    const onHandId = OnHandService.buildOnHandId(itemId, lotCode, locationId);
    const ohRef = db.doc(`onHand/${onHandId}`);
    const ohSnap = await tx.get(ohRef);
    
    if (!ohSnap.exists) {
      throw new Error(`OnHand not found: ${onHandId}`);
    }
    
    const current = ohSnap.data() as OnHand;
    
    // Verificar disponibilidad
    const currentReserved = current.reservedQty?.RELEASED || 0;
    const newReserved = currentReserved + qty;
    
    if (newReserved > current.qty.RELEASED) {
      throw new Error(
        `Insufficient RELEASED stock for reservation. ` +
        `Available: ${current.qty.RELEASED}, Currently Reserved: ${currentReserved}, ` +
        `Requested: ${qty}, Would Need: ${newReserved}`
      );
    }
    
    // Actualizar reservas
    current.reservedQty = { RELEASED: newReserved };
    current.availableQty = current.qty.RELEASED - newReserved;
    current.updatedAt = new Date();
    current.updatedBy = userId;
    
    // Validar invariantes
    Object.entries(OnHandInvariants).forEach(([name, validator]) => {
      if (!validator(current)) {
        throw new Error(`OnHand invariant violation after reservation: ${name}`);
      }
    });
    
    tx.set(ohRef, current, { merge: true });
    
    return current;
  }

  /**
   * Libera reservas de stock
   */
  static async releaseReservation(
    tx: FirebaseFirestore.Transaction,
    params: {
      itemId: string;
      lotCode: string;
      locationId: string;
      qty: number;
      userId?: string;
    }
  ): Promise<OnHand> {
    const { itemId, lotCode, locationId, qty, userId } = params;
    
    const onHandId = OnHandService.buildOnHandId(itemId, lotCode, locationId);
    const ohRef = db.doc(`onHand/${onHandId}`);
    const ohSnap = await tx.get(ohRef);
    
    if (!ohSnap.exists) {
      throw new Error(`OnHand not found: ${onHandId}`);
    }
    
    const current = ohSnap.data() as OnHand;
    const currentReserved = current.reservedQty?.RELEASED || 0;
    
    if (currentReserved < qty) {
      throw new Error(
        `Cannot release more than reserved. Reserved: ${currentReserved}, Requested: ${qty}`
      );
    }
    
    // Liberar reserva
    current.reservedQty = { RELEASED: currentReserved - qty };
    current.availableQty = current.qty.RELEASED - (current.reservedQty?.RELEASED || 0);
    current.updatedAt = new Date();
    current.updatedBy = userId;
    
    // Validar invariantes
    Object.entries(OnHandInvariants).forEach(([name, validator]) => {
      if (!validator(current)) {
        throw new Error(`OnHand invariant violation after release: ${name}`);
      }
    });
    
    tx.set(ohRef, current, { merge: true });
    
    return current;
  }

  /**
   * Obtiene saldo OnHand (solo lectura, no transaccional)
   */
  static async getBalance(
    itemId: string,
    lotCode: string,
    locationId: string
  ): Promise<OnHand | null> {
    const onHandId = OnHandService.buildOnHandId(itemId, lotCode, locationId);
    const doc = await db.doc(`onHand/${onHandId}`).get();
    
    return doc.exists ? doc.data() as OnHand : null;
  }

  /**
   * Obtiene la cantidad total disponible para un item en todas las ubicaciones y lotes.
   */
  static async getAvailableQty(itemId: string): Promise<number> {
    const balances = await OnHandService.getBalancesByItem(itemId);
    return balances.reduce((total, balance) => total + balance.availableQty, 0);
  }

  /**
   * Lista todos los OnHand para un item específico
   */
  static async getBalancesByItem(itemId: string): Promise<OnHand[]> {
    const snapshot = await db.collection('onHand')
      .where('itemId', '==', itemId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as OnHand);
  }

  /**
   * Valida invariantes de un OnHand sin modificarlo
   */
  static validateInvariants(onHand: OnHand): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    Object.entries(OnHandInvariants).forEach(([name, validator]) => {
      if (!validator(onHand)) {
        violations.push(name);
      }
    });
    
    return {
      valid: violations.length === 0,
      violations
    };
  }
}
