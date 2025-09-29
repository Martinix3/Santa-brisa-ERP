// src/app/(app)/quality/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { revalidatePath } from 'next/cache';
import type { QcStatus, QcTest, OnHandView } from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';
import { FieldValue } from 'firebase-admin/firestore';

export async function saveQcDecision(
  lotNumber: string,
  decision: QcStatus,
  results: Record<string, string | number>,
  reviewerId: string
): Promise<ActionResult<{ lotNumber: string }>> {
  if (!lotNumber || !decision) {
    return fail("Faltan el número de lote o la decisión.");
  }

  try {
    const now = new Date().toISOString();
    const batch = db.batch();

    // 1. Actualizar el estado del lote maestro
    const lotRef = db.collection('lots').doc(lotNumber);
    batch.update(lotRef, { qcStatus: decision, updatedAt: now });

    // 2. Actualizar el estado denormalizado en TODOS los onHand de ese lote
    const onHandSnap = await db.collection('onHand').where('lotNumber', '==', lotNumber).get();
    onHandSnap.docs.forEach(doc => {
      batch.update(doc.ref, { qcStatus: decision, updatedAt: now });
    });

    // 3. Guardar cada resultado como un documento en qcTests
    for (const [parameterId, value] of Object.entries(results)) {
      const testRef = db.collection('qcTests').doc();
      const numValue = Number(value);
      batch.set(testRef, {
        id: testRef.id,
        lotNumber,
        parameterId,
        valueText: isNaN(numValue) ? String(value) : undefined,
        valueNumeric: !isNaN(numValue) ? numValue : undefined,
        testedBy: reviewerId,
        testedAt: now,
        createdAt: now,
      });
    }

    await batch.commit();

    revalidatePath('/quality/release');
    return ok({ lotNumber });

  } catch (error: any) {
    console.error("Error al guardar la decisión de QC:", error);
    return fail(error.message || "Ocurrió un error en el servidor.");
  }
}
