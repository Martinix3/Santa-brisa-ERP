// src/server/integrations/queue.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function enqueue(job: {
  kind: string;
  payload: any;
  correlationId?: string;
  maxAttempts?: number;
  delaySec?: number;
}) {
  const ref = adminDb.collection('jobs').doc();
  await ref.set({
    ...job,
    status: 'QUEUED',
    attempts: 0,
    nextRunAt: Timestamp.fromDate(new Date(Date.now() + (job.delaySec ?? 0) * 1000)),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}
