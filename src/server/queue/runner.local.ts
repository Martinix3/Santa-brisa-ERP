// src/server/queue/runner.local.ts
import { processJob } from './dispatcher';
import { adminDb } from '../firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Job } from './types';

const WORKER_ID = `local_${process.pid}`;
const INTERVAL_MS = 5_000; // cada 5s

async function dispatchOnce(workerId: string): Promise<number> {
    const q = adminDb.collection('jobs')
        .where('status', 'in', ['QUEUED', 'RETRY'])
        .where('nextRunAt', '<=', Timestamp.now())
        .orderBy('nextRunAt')
        .limit(10); // Procesa hasta 10 jobs por ciclo

    const snap = await q.get();
    if (snap.empty) return 0;

    let processed = 0;
    const promises = snap.docs.map(async (doc) => {
        const job = doc.data() as Job;
        try {
            await adminDb.runTransaction(async (tx) => {
                const latest = await tx.get(doc.ref);
                if (latest.data()?.status !== job.status) return; // Alguien lo ha cogido
                tx.update(doc.ref, {
                    status: 'RUNNING',
                    startedAt: Timestamp.now(),
                    workerId,
                });
            });
            await processJob(workerId, { ...job, status: 'RUNNING' });
            processed++;
        } catch (e) {
            console.error(`[${workerId}] Error leasing job ${job.id}:`, e);
        }
    });

    await Promise.all(promises);
    return processed;
}

async function loop() {
  console.log(`[${WORKER_ID}] Checking for jobs...`);
  try {
    const n = await dispatchOnce(WORKER_ID);
    if (n > 0) {
        console.log(`[${WORKER_ID}] Processed ${n} jobs.`);
    }
  } catch (e) {
    console.error('[runner] Error in dispatchOnce:', e);
  } finally {
    setTimeout(loop, INTERVAL_MS);
  }
}

console.log(`Starting local worker [${WORKER_ID}]...`);
loop();
