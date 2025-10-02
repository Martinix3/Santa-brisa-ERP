// src/features/santabrain/lib/knowledge.ts
import { db } from '@/lib/db';

export async function learnCorrection(input: {
  text: string;
  chosenKind: string;
  metadata?: Record<string, any>;
  userId: string;
}) {
  const id = crypto.randomUUID();
  const doc = { id, ...input, createdAt: new Date().toISOString() };
  await db.collection('sb_knowledge').doc(id).set(doc);
  return doc;
}

export async function getRecentLearnings(limit = 50) {
  const snap = await db.collection('sb_knowledge').orderBy('createdAt','desc').limit(limit).get();
  return snap.docs.map(d => d.data());
}
