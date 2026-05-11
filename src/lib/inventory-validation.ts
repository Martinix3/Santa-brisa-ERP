/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Inventory Validation Module
 * 
 * CRÍTICO: Validaciones para garantizar integridad de calidad en operaciones de inventario
 * 
 * Este módulo implementa las reglas de negocio R1.4 - Consumo de Lotes
 * Ver: SANTA_BRISA_BUSINESS_RULES_AND_IMPROVEMENTS.md
 */

import { QcStatus, Lot } from '@/domain/ssot';

/**
 * Estados de QC que permiten el consumo de un lote
 */
export const APPROVED_QC_STATUSES: QcStatus[] = ['PASSED', 'CONDITIONAL', 'WAIVED'];

/**
 * Excepción lanzada cuando se intenta consumir un lote no aprobado
 */
export class LotNotApprovedException extends Error {
  constructor(
    public lotNumber: string,
    public currentStatus: QcStatus,
    message?: string
  ) {
    super(message || `Lote ${lotNumber} no puede ser consumido. Estado: ${currentStatus}`);
    this.name = 'LotNotApprovedException';
  }
}

/**
 * Excepción lanzada cuando se intenta consumir un lote caducado
 */
export class LotExpiredException extends Error {
  constructor(
    public lotNumber: string,
    public expDate: string,
    message?: string
  ) {
    super(message || `Lote ${lotNumber} ha caducado el ${expDate}`);
    this.name = 'LotExpiredException';
  }
}

/**
 * Resultado de validación de lote
 */
export interface LotValidationResult {
  valid: boolean;
  lotNumber: string;
  qcStatus: QcStatus;
  errors: string[];
  warnings: string[];
}

/**
 * FUNCIÓN CRÍTICA: Valida que un lote puede ser consumido
 * 
 * Reglas de negocio:
 * - MUST verificar qcStatus antes de consumir
 * - ONLY permitir consumo si qcStatus in [PASSED, CONDITIONAL, WAIVED]
 * - NEVER permitir consumo de PENDING, IN_PROGRESS, HOLD, FAILED
 * - Verificar fecha de caducidad
 * 
 * @param lot - Lote a validar
 * @throws {LotNotApprovedException} Si el lote no está aprobado
 * @throws {LotExpiredException} Si el lote ha caducado
 */
export function validateLotConsumption(lot: Lot): void {
  if (!lot) {
    throw new Error('Lote no proporcionado para validación');
  }

  // Validación 1: Estado QC
  if (!APPROVED_QC_STATUSES.includes(lot.qcStatus)) {
    const errorMessage = buildQcStatusErrorMessage(lot.lotNumber, lot.qcStatus);
    throw new LotNotApprovedException(lot.lotNumber, lot.qcStatus, errorMessage);
  }

  // Validación 2: Fecha de caducidad
  if (lot.expDate) {
    const expiryDate = new Date(lot.expDate);
    const now = new Date();
    
    if (expiryDate < now) {
      throw new LotExpiredException(
        lot.lotNumber,
        lot.expDate,
        `Lote ${lot.lotNumber} ha caducado el ${expiryDate.toLocaleDateString()}`
      );
    }
  }

  // Validación 3: Cantidad disponible
  if (lot.quantity <= 0) {
    throw new Error(`Lote ${lot.lotNumber} no tiene stock disponible`);
  }
}

/**
 * Validación no-throwing para usar en filtros y lógica de negocio
 * 
 * @param lot - Lote a validar
 * @returns Resultado de validación con detalles
 */
export function checkLotConsumptionEligibility(lot: Lot): LotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check QC Status
  if (!APPROVED_QC_STATUSES.includes(lot.qcStatus)) {
    errors.push(`Estado QC no aprobado: ${lot.qcStatus}`);
  }

  // Check expiry
  if (lot.expDate) {
    const expiryDate = new Date(lot.expDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expiryDate < now) {
      errors.push(`Lote caducado el ${expiryDate.toLocaleDateString()}`);
    } else if (daysUntilExpiry <= 7) {
      warnings.push(`Lote caduca en ${daysUntilExpiry} días`);
    } else if (daysUntilExpiry <= 30) {
      warnings.push(`Lote caduca en ${daysUntilExpiry} días`);
    }
  }

  // Check quantity
  if (lot.quantity <= 0) {
    errors.push('Sin stock disponible');
  }

  return {
    valid: errors.length === 0,
    lotNumber: lot.lotNumber,
    qcStatus: lot.qcStatus,
    errors,
    warnings
  };
}

/**
 * Construye mensaje de error detallado según el estado QC
 */
function buildQcStatusErrorMessage(lotNumber: string, qcStatus: QcStatus): string {
  const baseMessage = `Lote ${lotNumber} no puede ser consumido.`;
  
  const statusMessages: Record<QcStatus, string> = {
    PENDING: `${baseMessage} Estado: PENDIENTE DE QC. El lote debe ser aprobado por el departamento de Calidad antes de su uso.`,
    IN_PROGRESS: `${baseMessage} Estado: EN REVISIÓN QC. El lote está siendo evaluado por Calidad.`,
    HOLD: `${baseMessage} Estado: RETENIDO. El lote ha sido bloqueado por Calidad y requiere investigación adicional.`,
    FAILED: `${baseMessage} Estado: RECHAZADO. El lote no cumple con los estándares de calidad y no puede ser utilizado.`,
    PASSED: '', // No debería llegar aquí
    CONDITIONAL: '', // No debería llegar aquí
    WAIVED: '' // No debería llegar aquí
  };

  const specificMessage = statusMessages[qcStatus] || baseMessage;
  
  return `${specificMessage}\n\nEstados permitidos: ${APPROVED_QC_STATUSES.join(', ')}`;
}

/**
 * Filtra lotes consumibles de una lista
 * 
 * @param lots - Lista de lotes a filtrar
 * @returns Lista de lotes que pueden ser consumidos
 */
export function filterConsumableLots(lots: Lot[]): Lot[] {
  return lots.filter(lot => {
    const validation = checkLotConsumptionEligibility(lot);
    return validation.valid;
  });
}

/**
 * Ordena lotes por FEFO (First Expired, First Out)
 * Solo incluye lotes consumibles
 * 
 * @param lots - Lista de lotes
 * @returns Lotes ordenados por fecha de caducidad ascendente
 */
export function sortLotsByFEFO(lots: Lot[]): Lot[] {
  const consumableLots = filterConsumableLots(lots);
  
  return consumableLots.sort((a, b) => {
    // Sin fecha de caducidad van al final
    if (!a.expDate) return 1;
    if (!b.expDate) return -1;
    
    // Comparar fechas
    return new Date(a.expDate).getTime() - new Date(b.expDate).getTime();
  });
}

/**
 * Obtiene el mejor lote disponible según FEFO
 * 
 * @param lots - Lista de lotes del mismo SKU
 * @param minQuantity - Cantidad mínima requerida
 * @returns Mejor lote o null si no hay disponible
 */
export function selectBestLotFEFO(lots: Lot[], minQuantity: number): Lot | null {
  const sortedLots = sortLotsByFEFO(lots);
  
  // Buscar el primer lote con cantidad suficiente
  const lotWithEnoughQty = sortedLots.find(lot => lot.quantity >= minQuantity);
  
  if (lotWithEnoughQty) {
    return lotWithEnoughQty;
  }
  
  // Si no hay uno solo con suficiente, devolver el primero (FEFO)
  return sortedLots[0] || null;
}

/**
 * Información de lote no consumible
 */
export interface NonConsumableLotInfo {
  lot: Lot;
  reason: string;
  canBeResolved: boolean;
  suggestedAction?: string;
}

/**
 * Analiza lotes no consumibles y proporciona información útil
 * 
 * @param lots - Lista de lotes
 * @returns Información sobre lotes no consumibles
 */
export function analyzeNonConsumableLots(lots: Lot[]): NonConsumableLotInfo[] {
  const result: NonConsumableLotInfo[] = [];
  
  for (const lot of lots) {
    const validation = checkLotConsumptionEligibility(lot);
    if (validation.valid) continue;
    
    let reason = validation.errors.join(', ');
    let canBeResolved = false;
    let suggestedAction: string | undefined;
    
    // Analizar si puede resolverse
    if (lot.qcStatus === 'PENDING' || lot.qcStatus === 'IN_PROGRESS') {
      canBeResolved = true;
      suggestedAction = 'Completar proceso de QC';
    } else if (lot.qcStatus === 'HOLD') {
      canBeResolved = true;
      suggestedAction = 'Resolver investigación de Calidad';
    } else if (lot.qcStatus === 'FAILED') {
      canBeResolved = false;
      suggestedAction = 'Gestionar devolución o descarte';
    }
    
    result.push({
      lot,
      reason,
      canBeResolved,
      suggestedAction
    });
  }
  
  return result;
}
