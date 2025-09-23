// src/server/queue/types.ts
import type { Timestamp } from 'firebase-admin/firestore';
import type { Shipment } from '@/domain/ssot';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'RETRY' | 'DEAD' | 'FAILED';

// Definición de cada tipo de trabajo
export type JobPayloads =
 | { kind:'CREATE_MANUAL_SHIPMENT'; payload: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'> }
 | { kind:'CREATE_SHIPMENT_FROM_ORDER'; payload:{ orderId: string }; }
 | { kind:'VALIDATE_SHIPMENT'; payload: { shipmentId: string, visualOk: boolean, carrier?: string, weightKg?: number, dimsCm?: any, lotMap?: any }; }
 | { kind:'CREATE_DELIVERY_NOTE_CRM'; payload:{ shipmentId: string }; }
 | { kind:'CREATE_SENDCLOUD_LABEL'; payload:{ shipmentId: string }; }
 | { kind:'CREATE_INHOUSE_PALLET_LABEL'; payload:{ shipmentId: string }; }
 | { kind:'MARK_SHIPMENT_SHIPPED'; payload:{ shipmentId: string }; }
 | { kind: 'CREATE_HOLDED_INVOICE'; payload: { orderId: string }; }
 | { kind: 'CREATE_INVOICE_FROM_ORDER'; payload: { orderId: string, force?: boolean }; }
 | { kind:'SYNC_HOLDED_CONTACTS'; payload:{ page?: number; dryRun?: boolean } }
 | { kind:'SYNC_HOLDED_PURCHASES'; payload:{ page?: number; dryRun?: boolean } }
 | { kind:'SYNC_HOLDED_PRODUCTS'; payload:{ page?: number; dryRun?: boolean } };


export type JobKind = JobPayloads['kind'];

export type Job<T extends JobPayloads = JobPayloads> = T & {
  id: string;
  correlationId?: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  error?: string;
}
