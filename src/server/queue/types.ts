// src/server/queue/types.ts
import type { Timestamp } from 'firebase-admin/firestore';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'RETRY' | 'DEAD';

// Definición de cada tipo de trabajo
export type JobDefinition =
 | { kind:'CREATE_HOLDED_INVOICE'; payload:{ orderId: string }; }
 | { kind:'SYNC_HOLDED_PURCHASES'; payload:{ page?: number }; };
 // ...otros tipos de trabajos futuros

export type JobKind = JobDefinition['kind'];

export interface Job<T extends JobDefinition = JobDefinition> {
  id: string;
  kind: T['kind'];
  payload: T['payload'];
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
