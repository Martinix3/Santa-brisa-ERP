/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * TraceEvent Factory
 * 
 * Factory centralizado para crear eventos de trazabilidad con tipos consistentes
 * 
 * Este módulo implementa la creación estandarizada de TraceEvents
 * Ver: SANTA_BRISA_BUSINESS_RULES_AND_IMPROVEMENTS.md - Sección 3, Mejora #2
 */

import { TraceEvent, TraceEventKind, TraceEventPhase } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebase';

/**
 * Parámetros para crear un TraceEvent
 */
export interface CreateTraceEventParams {
  kind: TraceEventKind;
  phase: TraceEventPhase;
  title: string;
  details: string;
  links?: {
    lotNumber?: string;
    prodOrderId?: string;
    orderId?: string;
    shipmentId?: string;
    receiptId?: string;
    qaCheckId?: string;
    batchId?: string;
  };
  data?: Record<string, any>;
  userId?: string;
}

/**
 * Genera una clave única para alertas/tasks basada en el evento
 */
function generateAlertKey(kind: TraceEventKind, phase: TraceEventPhase, lotNumber?: string): string {
  const timestamp = Date.now();
  const lotPart = lotNumber ? `-${lotNumber}` : '';
  return `${phase}-${kind}${lotPart}-${timestamp}`;
}

/**
 * Genera un ID único para el trace event
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determina si un evento debe disparar análisis de Gemini
 */
function shouldTriggerGemini(kind: TraceEventKind, phase: TraceEventPhase): boolean {
  // Eventos críticos que requieren análisis
  const criticalEvents: Array<{kind: TraceEventKind, phase: TraceEventPhase}> = [
    { kind: 'QC_TEST', phase: 'QC' },
    { kind: 'OUTPUT', phase: 'PRODUCTION' },
    { kind: 'ALERT', phase: 'WAREHOUSE' },
    { kind: 'SHIPMENT', phase: 'DELIVERY' }
  ];
  
  return criticalEvents.some(e => e.kind === kind && e.phase === phase);
}

/**
 * Clase Factory para crear TraceEvents de forma estandarizada
 */
export class TraceEventFactory {
  /**
   * Crea un nuevo TraceEvent y lo persiste en Firestore
   * 
   * @param params - Parámetros del evento
   * @returns TraceEvent creado
   */
  static async create(params: CreateTraceEventParams): Promise<TraceEvent> {
    const now = new Date().toISOString();
    
    const event: TraceEvent = {
      id: generateTraceId(),
      at: now,
      kind: params.kind,
      phase: params.phase,
      title: params.title,
      details: params.details,
      links: params.links || {},
      data: {
        ...params.data,
        alertKey: generateAlertKey(params.kind, params.phase, params.links?.lotNumber),
        userId: params.userId,
        timestamp: now,
        _version: 2 // Versión del esquema de TraceEvent
      }
    };
    
    // Persistir en Firestore
    try {
      await db.collection('traceEvents').doc(event.id).set(event);
    } catch (error) {
      console.error('Error persisting TraceEvent:', error);
      throw new Error(`Failed to persist TraceEvent: ${error}`);
    }
    
    // Opcional: Trigger Gemini analysis (async, no-blocking)
    if (shouldTriggerGemini(params.kind, params.phase)) {
      triggerGeminiAnalysis(event).catch(err => {
        console.error('Gemini analysis failed (non-blocking):', err);
      });
    }
    
    return event;
  }
  
  // ============================================================================
  // MÉTODOS HELPER PARA EVENTOS COMUNES
  // ============================================================================
  
  /**
   * Registra la llegada/recepción de material
   */
  static async logReceipt(params: {
    receiptId: string;
    supplierName: string;
    supplierPartyId: string;
    deliveryNote?: string;
    lotNumbers?: string[];
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    return this.create({
      kind: 'ARRIVED',
      phase: 'RECEIPT',
      title: 'Material recibido',
      details: `Recepción de material del proveedor: ${params.supplierName}`,
      links: { 
        receiptId: params.receiptId,
        lotNumber: params.lotNumbers?.[0] // Primer lote para el link
      },
      data: {
        ...params.data,
        supplierPartyId: params.supplierPartyId,
        deliveryNote: params.deliveryNote,
        lotNumbers: params.lotNumbers,
        itemCount: params.lotNumbers?.length || 0
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra un test de QC
   */
  static async logQcTest(params: {
    lotNumber: string;
    result: 'PASS' | 'FAIL' | 'CONDITIONAL';
    parameterId?: string;
    parameterName?: string;
    value?: string | number;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    const resultLabels = {
      PASS: 'Aprobado',
      FAIL: 'Rechazado',
      CONDITIONAL: 'Condicional'
    };
    
    return this.create({
      kind: 'QC_TEST',
      phase: 'QC',
      title: `Test QC: ${resultLabels[params.result]}`,
      details: `Resultado de test para lote ${params.lotNumber}: ${params.parameterName || 'Test general'}`,
      links: { lotNumber: params.lotNumber },
      data: {
        ...params.data,
        result: params.result,
        parameterId: params.parameterId,
        parameterName: params.parameterName,
        value: params.value
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra liberación o rechazo de lote por QC
   */
  static async logQcDecision(params: {
    lotNumber: string;
    decision: 'APPROVED' | 'REJECTED' | 'HOLD';
    reason?: string;
    conditions?: string[];
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    const decisionLabels = {
      APPROVED: 'aprobado',
      REJECTED: 'rechazado',
      HOLD: 'retenido'
    };
    
    return this.create({
      kind: 'QC_TEST',
      phase: 'QC',
      title: `Lote ${decisionLabels[params.decision]}`,
      details: `Lote ${params.lotNumber} ha sido ${decisionLabels[params.decision]} por QC${params.reason ? `: ${params.reason}` : ''}`,
      links: { lotNumber: params.lotNumber },
      data: {
        ...params.data,
        decision: params.decision,
        reason: params.reason,
        conditions: params.conditions
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra consumo de material en producción
   */
  static async logProductionConsume(params: {
    prodOrderId: string;
    lotNumber: string;
    itemId: string;
    itemName: string;
    quantity: number;
    uom: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    return this.create({
      kind: 'CONSUME',
      phase: 'PRODUCTION',
      title: 'Consumo de material',
      details: `Lote ${params.lotNumber} (${params.itemName}) consumido en producción: ${params.quantity} ${params.uom}`,
      links: { 
        prodOrderId: params.prodOrderId,
        lotNumber: params.lotNumber
      },
      data: {
        ...params.data,
        itemId: params.itemId,
        itemName: params.itemName,
        quantity: params.quantity,
        uom: params.uom
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra salida de producción (producto terminado)
   */
  static async logProductionOutput(params: {
    prodOrderId: string;
    newLotNumber: string;
    itemId: string;
    itemName: string;
    quantity: number;
    uom: string;
    qcStatus?: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    return this.create({
      kind: 'OUTPUT',
      phase: 'PRODUCTION',
      title: 'Producción completada',
      details: `Generado lote ${params.newLotNumber} (${params.itemName}): ${params.quantity} ${params.uom}`,
      links: { 
        prodOrderId: params.prodOrderId,
        lotNumber: params.newLotNumber
      },
      data: {
        ...params.data,
        itemId: params.itemId,
        itemName: params.itemName,
        quantity: params.quantity,
        uom: params.uom,
        qcStatus: params.qcStatus || 'PENDING'
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra genealogía: relación padre-hijo entre lotes
   */
  static async logGenealogy(params: {
    parentLotNumber: string;
    childLotNumber: string;
    relationship: 'PARENT' | 'CHILD';
    prodOrderId?: string;
    quantity?: number;
    uom?: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    const kind: TraceEventKind = params.relationship === 'PARENT' 
      ? 'GENEALOGY_PARENT' 
      : 'GENEALOGY_CHILD';
    
    return this.create({
      kind,
      phase: 'PRODUCTION',
      title: `Genealogía: ${params.relationship === 'PARENT' ? 'Material origen' : 'Producto derivado'}`,
      details: `Lote ${params.parentLotNumber} → Lote ${params.childLotNumber}`,
      links: { 
        lotNumber: params.relationship === 'PARENT' ? params.parentLotNumber : params.childLotNumber,
        prodOrderId: params.prodOrderId
      },
      data: {
        ...params.data,
        parentLotNumber: params.parentLotNumber,
        childLotNumber: params.childLotNumber,
        quantity: params.quantity,
        uom: params.uom
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra un envío
   */
  static async logShipment(params: {
    shipmentId: string;
    orderId: string;
    customerName: string;
    trackingCode?: string;
    carrier?: string;
    lotNumbers?: string[];
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    return this.create({
      kind: 'SHIPMENT',
      phase: 'DELIVERY',
      title: 'Envío realizado',
      details: `Pedido enviado a ${params.customerName}${params.trackingCode ? ` (Tracking: ${params.trackingCode})` : ''}`,
      links: { 
        shipmentId: params.shipmentId,
        orderId: params.orderId,
        lotNumber: params.lotNumbers?.[0]
      },
      data: {
        ...params.data,
        trackingCode: params.trackingCode,
        carrier: params.carrier,
        lotNumbers: params.lotNumbers
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra un movimiento de stock
   */
  static async logStockMove(params: {
    itemId: string;
    lotNumber: string;
    fromLocationId?: string;
    toLocationId: string;
    quantity: number;
    uom: string;
    reason: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    return this.create({
      kind: 'MOVE',
      phase: 'WAREHOUSE',
      title: 'Movimiento de stock',
      details: `Lote ${params.lotNumber}: ${params.quantity} ${params.uom} ${params.fromLocationId ? `de ${params.fromLocationId} ` : ''}a ${params.toLocationId}`,
      links: { lotNumber: params.lotNumber },
      data: {
        ...params.data,
        itemId: params.itemId,
        fromLocationId: params.fromLocationId,
        toLocationId: params.toLocationId,
        quantity: params.quantity,
        uom: params.uom,
        reason: params.reason
      },
      userId: params.userId
    });
  }
  
  /**
   * Registra una alerta del sistema
   */
  static async logAlert(params: {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    alertType: string;
    message: string;
    details: string;
    module: 'QUALITY' | 'WAREHOUSE' | 'PRODUCTION' | 'SALES' | 'LOGISTICS';
    entityId?: string;
    lotNumber?: string;
    userId?: string;
    data?: Record<string, any>;
  }): Promise<TraceEvent> {
    const phaseMap = {
      QUALITY: 'QC' as TraceEventPhase,
      WAREHOUSE: 'WAREHOUSE' as TraceEventPhase,
      PRODUCTION: 'PRODUCTION' as TraceEventPhase,
      SALES: 'SALE' as TraceEventPhase,
      LOGISTICS: 'DELIVERY' as TraceEventPhase
    };
    
    return this.create({
      kind: 'ALERT',
      phase: phaseMap[params.module],
      title: `⚠️ ${params.message}`,
      details: params.details,
      links: { 
        lotNumber: params.lotNumber
      },
      data: {
        ...params.data,
        severity: params.severity,
        alertType: params.alertType,
        module: params.module,
        entityId: params.entityId
      },
      userId: params.userId
    });
  }
}

/**
 * Dispara análisis de Gemini para un evento (async, non-blocking)
 * TODO: Implementar integración real con Gemini
 */
async function triggerGeminiAnalysis(event: TraceEvent): Promise<void> {
  // Placeholder: implementar cuando Gemini esté activo
  console.log('[TraceEventFactory] Gemini analysis triggered for:', event.id);
  
  // En el futuro, algo como:
  // await geminiService.analyze({
  //   domain: event.phase,
  //   event,
  //   context: { ... }
  // });
}
