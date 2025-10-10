import { adminDb as db } from '@/server/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Job, JobKind } from './types';
import { enqueue } from './queue';

// --- Registro de handlers ---
// NOTA: Workers comentados temporalmente hasta implementación
const HANDLERS: Record<JobKind, (payload: any) => Promise<any>> = {
  CREATE_MANUAL_SHIPMENT: async () => { throw new Error('Worker not implemented'); },
  VALIDATE_SHIPMENT: async () => { throw new Error('Worker not implemented'); },
  CREATE_DELIVERY_NOTE_CRM: async () => { throw new Error('Worker not implemented'); },
  CREATE_SENDCLOUD_LABEL: async () => { throw new Error('Worker not implemented'); },
  CREATE_INHOUSE_PALLET_LABEL: async () => { throw new Error('Worker not implemented'); },
  MARK_SHIPMENT_SHIPPED: async () => { throw new Error('Worker not implemented'); },
  CREATE_HOLDED_INVOICE: async () => { throw new Error('Worker not implemented'); },
  CREATE_INVOICE_FROM_ORDER: async () => { throw new Error('Worker not implemented'); },
  SYNC_HOLDED_CONTACTS: async () => { throw new Error('Worker not implemented'); },
  SYNC_HOLDED_PURCHASES: async () => { throw new Error('Worker not implemented'); },
  SYNC_HOLDED_PRODUCTS: async () => { throw new Error('Worker not implemented'); },
  UPDATE_SHOPIFY_FULFILLMENT: async () => { throw new Error('Worker not implemented'); },
  CREATE_SHIPMENT_FROM_ORDER: async () => { throw new Error('Worker not implemented'); },
  CREATE_HOLDED_INVOICE_FROM_SHIPMENT: async () => { throw new Error('Worker not implemented'); },
  WITHDRAW_STOCK_FROM_SHIPMENT: async () => { throw new Error('Worker not implemented'); },
};


const LEASE_MS = 60_000;
const BASE_BACKOFF_MS = 30_000;

export async function processJob(workerId: string, job: Job): Promise<void> {
  const jobRef = db.collection('jobs').doc(job.id);
  const handler = HANDLERS[job.kind];

  if (!handler) {
    await jobRef.update({ status: 'FAILED', error: `No handler for kind: ${job.kind}`, updatedAt: Timestamp.now() });
    return;
  }

  try {
    const result = await handler(job.payload);
    await jobRef.update({ status: 'DONE', finishedAt: Timestamp.now(), updatedAt: Timestamp.now(), result });
    console.log(`[${workerId}] Job ${job.id} (${job.kind}) completed successfully.`);
    
    if (result?.nextPage) {
        await enqueue({ 
            kind: job.kind as any, 
            payload: { page: result.nextPage, dryRun: (job.payload as any).dryRun }, 
            maxAttempts: job.maxAttempts 
        });
        console.log(`[${workerId}] Enqueued next page ${result.nextPage} for ${job.kind}`);
    }

  } catch (error: any) {
    console.error(`[${workerId}] Job ${job.id} (${job.kind}) failed:`, error.message);
    const attempts = (job.attempts || 0) + 1;
    const isRetriable = attempts < (job.maxAttempts || 5);
    
    if (isRetriable) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempts);
      await jobRef.update({
        status: 'RETRY',
        error: error.message,
        attempts: FieldValue.increment(1),
        nextRunAt: Timestamp.fromMillis(Date.now() + backoff),
        updatedAt: Timestamp.now(),
      });
    } else {
      await jobRef.update({ status: 'DEAD', error: error.message, updatedAt: Timestamp.now() });
    }
  }
}
