// src/server/integrations/worker.dispatcher.ts
// ESTO NO ES UNA FUNCIÓN EJECUTABLE DIRECTAMENTE.
// Representa la lógica que correría en un Cloud Scheduler/Function.
// Para este proyecto, se puede simular su ejecución con un endpoint de API de desarrollo.

import { adminDb } from '@/server/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { handleCreateHoldedInvoice } from './holded/createInvoice.worker';
import { handleUpdateShopifyFulfillment } from './shopify/shopify.fulfillment.worker';

export async function runJobDispatcher() {
  const now = Timestamp.now();
  const snap = await adminDb.collection('jobs')
    .where('status', 'in', ['QUEUED','RETRY'])
    .where('nextRunAt', '<=', now)
    .limit(20)
    .get();

  if (snap.empty) {
    console.log('[Dispatcher] No pending jobs.');
    return { processed: 0 };
  }

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'RUNNING', startedAt: Timestamp.now() });
  }
  await batch.commit();

  let processedCount = 0;
  const results = await Promise.allSettled(snap.docs.map(async (d) => {
    const job = d.data();
    try {
      console.log(`[Dispatcher] Running job ${d.id} of kind ${job.kind}`);
      switch (job.kind) {
        case 'CREATE_HOLDED_INVOICE':
          await handleCreateHoldedInvoice(job.payload);
          break;
        case 'UPDATE_SHOPIFY_FULFILLMENT':
          await handleUpdateShopifyFulfillment(job.payload);
          break;
        default:
          throw new Error(`Unknown job kind: ${job.kind}`);
      }
      await d.ref.update({ status: 'DONE', finishedAt: Timestamp.now() });
      processedCount++;
    } catch (e:any) {
      console.error(`[Dispatcher] Job ${d.id} failed:`, e);
      const attempts = (job.attempts ?? 0) + 1;
      const max = job.maxAttempts ?? 5;
      const backoff = Math.min(60 * 60, 2 ** attempts * 15);
      
      const updatePayload: any = {
        status: attempts >= max ? 'DEAD' : 'RETRY',
        attempts,
        error: e?.message?.slice(0, 500) || 'Unknown error',
        nextRunAt: Timestamp.fromDate(new Date(Date.now() + backoff * 1000)),
        updatedAt: Timestamp.now(),
      };

      await d.ref.update(updatePayload);

      if (updatePayload.status === 'DEAD') {
        await adminDb.collection('dead_letters').doc(d.id).set({ ...job, ...updatePayload, finalError: e?.message });
      }
    }
  }));

  return { processed: processedCount, results };
}
