// src/server/queue/queue.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Job } from './types';

/**
 * Enqueues a new job to be processed by a worker.
 * @param job The job details, including kind, payload, and optional settings.
 * @returns The ID of the newly created job document in Firestore.
 */
export async function enqueue(job: Omit<Job, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt' | 'nextRunAt'> & { delaySec?: number }): Promise<string> {
  const ref = adminDb.collection('jobs').doc();
  
  const newJob: Job = {
    id: ref.id,
    kind: job.kind,
    payload: job.payload,
    correlationId: job.correlationId,
    status: 'QUEUED',
    attempts: 0,
    maxAttempts: job.maxAttempts ?? 5,
    nextRunAt: Timestamp.fromDate(new Date(Date.now() + (job.delaySec ?? 0) * 1000)),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await ref.set(newJob);
  return ref.id;
}
