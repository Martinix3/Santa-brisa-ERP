/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/integration-jobs.ts
import 'server-only';
import { adminDb as db } from '@/server/firebase';
import admin from 'firebase-admin';

export type IntegrationProvider = 'holded' | 'sendcloud' | 'shopify' | 'gmail';
export type IntegrationJobType = 'create_invoice' | 'create_shipment' | 'sync_order' | 'create_label' | 'send_email' | 'sync_email';
export type IntegrationJobStatus = 'pending' | 'running' | 'success' | 'failed' | 'retry';

export interface IntegrationJob {
  id: string;
  provider: IntegrationProvider;
  jobType: IntegrationJobType;
  refId: string;  // shipmentId, orderId, etc.
  status: IntegrationJobStatus;
  attempts: number;
  maxAttempts: number;
  lastRun?: string;
  nextRun?: string;
  error?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Crea un nuevo job de integración
 */
export async function createJob(
  job: Omit<IntegrationJob, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const doc = await db.collection('integration_jobs').add({
    ...job,
    createdAt: now,
    updatedAt: now
  });
  return doc.id;
}

/**
 * Actualiza el estado de un job
 */
export async function updateJobStatus(
  jobId: string,
  status: IntegrationJobStatus,
  error?: string,
  latencyMs?: number
): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = {
    status,
    attempts: admin.firestore.FieldValue.increment(1),
    lastRun: now,
    updatedAt: now
  };

  if (error) updates.error = error;
  if (latencyMs !== undefined) updates.latencyMs = latencyMs;

  await db.collection('integration_jobs').doc(jobId).update(updates);

  // Si falló y alcanzó max attempts, crear alerta
  if (status === 'failed') {
    const jobDoc = await db.collection('integration_jobs').doc(jobId).get();
    const job = jobDoc.data() as IntegrationJob;

    if (job && job.attempts >= job.maxAttempts) {
      await db.collection('alerts').add({
        department: 'OPS',
        kind: 'INTEGRATION_FAILURE',
        severity: 80,
        title: `${job.provider} integration failed`,
        message: `Job ${job.jobType} failed after ${job.attempts} attempts: ${error || 'Unknown error'}`,
        entities: {
          jobId,
          refId: job.refId,
          provider: job.provider
        },
        metadata: {
          jobType: job.jobType,
          attempts: job.attempts,
          latencyMs: job.latencyMs
        },
        createdAt: now,
        resolved: false
      });
    }
  }
}

/**
 * Obtiene jobs fallidos, opcionalmente filtrados por provider
 */
export async function getFailedJobs(provider?: IntegrationProvider): Promise<IntegrationJob[]> {
  let query: any = db.collection('integration_jobs')
    .where('status', '==', 'failed');

  if (provider) {
    query = query.where('provider', '==', provider);
  }

  const snap = await query.limit(100).get();
  return snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  } as IntegrationJob));
}

/**
 * Obtiene jobs pendientes para retry
 */
export async function getPendingRetryJobs(): Promise<IntegrationJob[]> {
  const now = new Date().toISOString();
  const snap = await db.collection('integration_jobs')
    .where('status', '==', 'retry')
    .where('nextRun', '<=', now)
    .limit(50)
    .get();

  return snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  } as IntegrationJob));
}

/**
 * Marca un job para retry
 */
export async function scheduleRetry(
  jobId: string,
  delayMinutes: number = 5
): Promise<void> {
  const nextRun = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  await db.collection('integration_jobs').doc(jobId).update({
    status: 'retry',
    nextRun,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Obtiene estadísticas de jobs por provider
 */
export async function getJobStats(provider?: IntegrationProvider): Promise<{
  total: number;
  success: number;
  failed: number;
  avgLatencyMs: number;
  successRate: number;
}> {
  let query: any = db.collection('integration_jobs');

  if (provider) {
    query = query.where('provider', '==', provider);
  }

  const snap = await query.get();
  const jobs = snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as IntegrationJob);

  const total = jobs.length;
  const success = jobs.filter((j: IntegrationJob) => j.status === 'success').length;
  const failed = jobs.filter((j: IntegrationJob) => j.status === 'failed').length;
  const avgLatencyMs = jobs.reduce((sum: number, j: IntegrationJob) => sum + (j.latencyMs || 0), 0) / total || 0;
  const successRate = total > 0 ? (success / total) * 100 : 0;

  return {
    total,
    success,
    failed,
    avgLatencyMs: Math.round(avgLatencyMs),
    successRate: Math.round(successRate * 100) / 100
  };
}
