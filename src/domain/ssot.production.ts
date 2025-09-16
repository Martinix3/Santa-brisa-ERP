// domain/ssot.production.ts - Canónico de Producción
import type { Uom } from './ssot.core';

// --- LOTES (RM, SFG, FG) ---
export type LotStatus = 'OPEN' | 'QUARANTINE' | 'APPROVED' | 'REJECTED' | 'CONSUMED' | 'CLOSED';
export interface Lot {
    id: string;
    sku: string;
    kind: 'RM' | 'SFG' | 'FG';
    source?: {
        supplierAccountId?: string;
        poNumber?: string;
        harvestYear?: number;
        originCountry?: string;
        farmLotCode?: string;
    };
    status: LotStatus;
    qty: {
        uom: Uom;
        onHand: number;
        reserved: number;
    };
    dates: {
        producedAt?: string;
        receivedAt?: string;
        approvedAt?: string;
        rejectedAt?: string;
        expDate?: string;
    };
    trace?: {
        parentBatchId?: string;
        parentLotIds?: string[];
    };
    createdAt: string;
    updatedAt: string;
}


// --- CALIDAD (QC) ---
export type CheckResult = 'PASS' | 'FAIL' | 'CONDITIONAL';
export interface QACheck {
    id: string;
    lotId: string;
    scope: 'INBOUND' | 'INPROCESS' | 'RELEASE' | 'RETEST';
    checklist: {
        code: string;
        name: string;
        type: 'NUM' | 'BOOL' | 'TEXT' | 'IMG';
        uom?: string;
        valueNum?: number;
        valueBool?: boolean;
        valueText?: string;
        photoUrl?: string;
    }[];
    result: CheckResult;
    reviewerId: string;
    reviewedAt: string;
    ncIds?: string[];
    attachments?: any[];
    createdAt: string;
}

export interface NonConformity {
    id: string;
    lotId: string;
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    description: string;
    action: 'REWORK' | 'BLOCK' | 'SCRAP';
    status: 'OPEN' | 'CLOSED';
    createdAt: string;
    closedAt?: string;
}


// --- PRODUCCIÓN (BOMs, Batches, Envasado) ---
export interface Batch {
    id: string;
    recipeId: string;
    name?: string;
    baseUnit: 'L' | 'kg' | string;
    plannedSize: number;
    actualSize?: number;
    startAt?: string;
    endAt?: string;
    status: 'PLANNED' | 'RUNNING' | 'PAUSED' | 'DONE' | 'CANCELLED';
    inputs: {
        lotId: string;
        materialSku: string;
        qty: number;
        uom: Uom;
    }[];
    outputs: {
        lotId: string;
        sku: string;
        qty: number;
        uom: Uom;
        kind: 'SFG' | 'FG';
    }[];
    protocol: {
        steps: {
            id: string;
            text: string;
            doneById?: string;
            doneAt?: string;
            ok?: boolean;
            notes?: string;
        }[];
        deviations?: any[];
    };
    createdAt: string;
    updatedAt: string;
}

export interface PackRun {
    id: string;
    batchId: string;
    finishedSku: string;
    bottleSizeML: number;
    packagingSpecId?: string;
    startAt?: string;
    endAt?: string;
    outputs: {
        lotId: string;
        qty: number;
        uom: 'bottle' | 'case';
    }[];
    qcReleaseCheckId?: string;
    createdAt: string;
}

// --- EVENTOS DE TRAZABILIDAD (Unified Timeline) ---
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type TraceEventKind =
  | 'FARM_DATA' | 'SUPPLIER_PO'
  | 'ARRIVED' | 'BOOKED'
  | 'CHECK_PASS' | 'CHECK_FAIL' | 'NC_OPEN' | 'NC_CLOSE'
  | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT'
  | 'PACK_START' | 'PACK_END'
  | 'MOVE' | 'RESERVE'
  | 'ORDER_ALLOC' | 'SHIPMENT_PICKED'
  | 'SHIPPED' | 'DELIVERED';

export interface TraceEvent {
    id: string;
    subject: {
        type: 'LOT' | 'BATCH' | 'ORDER' | 'SHIPMENT';
        id: string;
    };
    phase: TraceEventPhase;
    kind: TraceEventKind;
    occurredAt: string;
    actorId?: string;
    locationId?: string;
    links?: {
        lotId?: string;
        batchId?: string;
        orderId?: string;
        shipmentId?: string;
        receiptId?: string;
        qaCheckId?: string;
    };
    data?: any; // Payload compacto específico del evento
}
