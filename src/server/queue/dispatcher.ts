

import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Job, JobKind } from './types';
import { enqueue } from './queue';

// --- Registro de handlers ---
const HANDLERS: Record<JobKind, (payload: any) => Promise<any>> = {
  CREATE_MANUAL_SHIPMENT: async (payload) => (await import('../workers/createManualShipment.worker')).run(payload),
  CREATE_SHIPMENT_FROM_ORDER: async (payload) => (await import('../workers/createShipment.worker')).run(payload),
  VALIDATE_SHIPMENT: async (payload) => (await import('../workers/validateShipment.worker')).run(payload),
  CREATE_DELIVERY_NOTE_CRM: async (payload) => (await import('../workers/createDeliveryNote.worker')).run(payload),
  CREATE_SENDCLOUD_LABEL: async (payload) => (await import('../workers/createSendcloudLabel.worker')).run(payload),
  CREATE_INHOUSE_PALLET_LABEL: async (payload) => (await import('../workers/createInhouseLabel.worker')).run(payload),
  MARK_SHIPMENT_SHIPPED: async (payload) => (await import('../workers/markShipped.worker')).run(payload),
  CREATE_HOLDED_INVOICE: async (payload) => (await import('../integrations/holded/createInvoice.worker')).handleCreateHoldedInvoice(payload),
  CREATE_INVOICE_FROM_ORDER: async (payload) => (await import('../workers/invoicing.createFromOrder')).run(payload),
  SYNC_HOLDED_CONTACTS: async (payload) => (await import('../workers/holded.syncContacts')).handleSyncHoldedContacts(payload),
  SYNC_HOLDED_PURCHASES: async (payload) => (await import('../integrations/holded/syncPurchases')).handleSyncHoldedPurchases(payload),
  SYNC_HOLDED_PRODUCTS: async (payload) => (await import('../workers/holded.syncProducts')).handleSyncHoldedProducts(payload),
  UPDATE_SHOPIFY_FULFILLMENT: async (payload) => (await import('../integrations/shopify/shopify.fulfillment.worker')).handleUpdateShopifyFulfillment(payload),
};


const LEASE_MS = 60_000;
const BASE_BACKOFF_MS = 30_000;

export async function processJob(workerId: string, job: Job): Promise<void> {
  const jobRef = adminDb.collection('jobs').doc(job.id);
  const handler = HANDLERS[job.kind];

  if (!handler) {
    await jobRef.update({ status: 'FAILED', error: `No handler for kind: ${job.kind}`, updatedAt: Timestamp.now() });
    return;
  }

  try {
    const result = await handler(job.payload);
    await jobRef.update({ status: 'DONE', finishedAt: Timestamp.now(), updatedAt: Timestamp.now() });
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
