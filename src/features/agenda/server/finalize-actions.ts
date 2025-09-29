// src/features/agenda/server/finalize-actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function finalizeTaskWithOutcome({ taskId, outcome }: {
  taskId: string;
  outcome: { type: "ORDER", orderId: string } | { type: "INTERACTION" } | { type: "POS" };
}) {
  const ref = db.collection('interactions').doc(taskId);
  await ref.update({
    status: 'done',
    updatedAt: Timestamp.now(),
    outcome: outcome, // Store the outcome for reporting
  });
  return { ok: true, taskId };
}
