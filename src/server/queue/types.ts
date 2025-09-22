// src/server/queue/types.ts
import type { Timestamp } from 'firebase-admin/firestore';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'RETRY' | 'DEAD';
export type JobKind = 'CREATE_HOLDED_INVOICE' | 'UPDATE_SHOPIFY_FULFILLMENT' | 'SYNC_STOCK' | 'CREATE_SENDCLOUD_LABEL';

export interface Job {
  id: string;
  kind: JobKind;
  payload: any;
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
  delaySec?: number;
}
