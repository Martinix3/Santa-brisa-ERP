// src/server/queue/dispatcher.ts
import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Job, JobKind, JobStatus } from './types';

const JOBS_COLL = 'jobs';
const DEFAULT_BATCH = 10;
const LEASE_MS = 60_000;
const BASE_BACKOFF_MS = 30_000;

// --- Registro de handlers ---
const HANDLERS: Record<JobKind, (payload: any) => Promise<void>> = {
  CREATE_SHIPMENT_FROM_ORDER: async (payload) => (await import('../workers/createShipment.worker')).run(payload),
  VALIDATE_SHIPMENT: async (payload) => (await import('../workers/validateShipment.worker')).run(payload),
  CREATE_DELIVERY_NOTE_CRM: async (payload) => (await import('../workers/createDeliveryNote.worker')).run(payload),
  CREATE_SENDCLOUD_LABEL: async (payload) => (await import('../workers/createSendcloudLabel.worker')).run(payload),
  CREATE_INHOUSE_PALLET_LABEL: async (payload) => (await import('../workers/createInhouseLabel.worker')).run(payload),
  MARK_SHIPMENT_SHIPPED: async (payload) => (await import('../workers/markShipped.worker')).run(payload),
  SYNC_HOLDED_PURCHASES: async (payload) => (await import('../integrations/holded/syncPurchases')).handleSyncHoldedPurchases(payload),
  CREATE_HOLDED_INVOICE: async (payload) => (await import('../integrations/holded/createInvoice.worker')).handleCreateHoldedInvoice(payload),
};


export async function claimJobs(workerId: string, batch = DEFAULT_BATCH): Promise<Job[]> {
  const now = Timestamp.now();
  const lockUntilExpired = Timestamp.fromMillis(now.toMillis() - LEASE_MS);

  // Re-queue stuck jobs
  const stuckJobsSnap = await adminDb.collection(JOBS_COLL)
    .where('status', '==', 'RUNNING')
    .where('updatedAt', '<', lockUntilExpired)
    .limit(batch)
    .get();

  for (const doc of stuckJobsSnap.docs) {
    await doc.ref.update({ status: 'QUEUED', updatedAt: now, lockedBy: null });
    console.log(`Re-queued stuck job: ${doc.id}`);
  }

  // Claim new jobs
  const queuedJobsSnap = await adminDb.collection(JOBS_COLL)
    .where('status', '==', 'QUEUED')
    .where('nextRunAt', '<=', now)
    .orderBy('nextRunAt')
    .limit(batch)
    .get();

  const claimedJobs: Job[] = [];
  for (const doc of queuedJobsSnap.docs) {
    try {
      await adminDb.runTransaction(async (tx) => {
        const freshDoc = await tx.get(doc.ref);
        if (freshDoc.data()?.status === 'QUEUED') {
          tx.update(doc.ref, {
            status: 'RUNNING',
            updatedAt: Timestamp.now(),
            lockedBy: workerId,
            attempts: FieldValue.increment(1)
          });
          claimedJobs.push({ id: doc.id, ...freshDoc.data() } as Job);
        }
      });
    } catch (e) {
      console.error(`Error claiming job ${doc.id}:`, e);
    }
  }
  return claimedJobs;
}

export async function processJob(workerId: string, job: Job): Promise<void> {
  const jobRef = adminDb.collection(JOBS_COLL).doc(job.id);
  const handler = HANDLERS[job.kind];

  if (!handler) {
    await jobRef.update({ status: 'FAILED', error: `No handler for kind: ${job.kind}`, updatedAt: Timestamp.now() });
    return;
  }

  try {
    await handler(job.payload);
    await jobRef.update({ status: 'DONE', finishedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    console.log(`[${workerId}] Job ${job.id} (${job.kind}) completed successfully.`);
  } catch (error: any) {
    console.error(`[${workerId}] Job ${job.id} (${job.kind}) failed:`, error.message);
    const attempts = (job.attempts || 0) + 1;
    const isRetriable = attempts < (job.maxAttempts || 5);
    
    if (isRetriable) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempts);
      await jobRef.update({
        status: 'RETRY',
        error: error.message,
        nextRunAt: Timestamp.fromMillis(Date.now() + backoff),
        updatedAt: Timestamp.now(),
      });
    } else {
      await jobRef.update({ status: 'DEAD', error: error.message, updatedAt: Timestamp.now() });
    }
  }
}

export async function dispatchOnce(workerId = `worker_${process.pid}`): Promise<number> {
  const jobs = await claimJobs(workerId);
  if (jobs.length > 0) {
    console.log(`[${workerId}] Claimed ${jobs.length} jobs.`);
    await Promise.all(jobs.map(job => processJob(workerId, job)));
  }
  return jobs.length;
}
