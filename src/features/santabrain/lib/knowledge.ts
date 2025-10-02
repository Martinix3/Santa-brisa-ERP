// src/features/santabrain/lib/knowledge.ts
import { firestoreDb } from '@/lib/firebaseClient'; // CORREGIDO: Usar el cliente, no /lib/db

export async function learnCorrection(input: {
  text: string;
  chosenKind: string;
  metadata?: Record<string, any>;
  userId: string;
}) {
  const id = crypto.randomUUID();
  const doc = { id, ...input, createdAt: new Date().toISOString() };
  // La escritura se hará a través del DataProvider, esta función solo prepara el doc.
  // En una implementación real con backend, aquí iría la llamada a Firestore Admin SDK.
  console.log('[Learn Correction] Data to save:', doc);
  return doc;
}

export async function getRecentLearnings(limit = 50) {
  // Esta función necesitaría una implementación real con el DataProvider o una server action.
  // Por ahora, devuelve un array vacío.
  console.log('[Get Learnings] Mock implementation returning empty array.');
  return [];
}
