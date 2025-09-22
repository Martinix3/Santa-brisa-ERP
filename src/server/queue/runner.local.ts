// src/server/queue/runner.local.ts
import { dispatchOnce } from './dispatcher';

const WORKER_ID = `local_${process.pid}`;
const INTERVAL_MS = 5_000; // cada 5s

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
