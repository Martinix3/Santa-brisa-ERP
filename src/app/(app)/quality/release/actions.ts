
// src/app/(app)/quality/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { revalidatePath } from 'next/cache';
import type { QcStatus, QcTest } from '@/domain/ssot';
import { ActionResult, ok, fail } from '@/lib/result';

/**
 * Guarda la decisión de calidad para un lote específico y opcionalmente
 * registra los resultados de los análisis individuales.
 */
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
        batch.update(lotRef, {
            qcStatus: decision,
            updatedAt: now,
        });

        // 2. Opcional: Guardar cada resultado como un documento en qcTests
        // Esto crea un historial de análisis muy detallado
        for (const [parameterId, value] of Object.entries(results)) {
            const testRef = db.collection('qcTests').doc();
            const testResult: Partial<QcTest> = {
                id: testRef.id,
                lotNumber,
                parameterId,
                valueText: typeof value === 'string' ? value : undefined,
                valueNumeric: typeof value === 'number' ? value : undefined,
                testedBy: reviewerId,
                testedAt: now,
                createdAt: now,
            };
            batch.set(testRef, testResult);
        }

        await batch.commit();
        
        // Invalida el caché de la ruta para que el cliente vea los datos actualizados
        revalidatePath('/quality/release');

        return ok({ lotNumber });

    } catch (error: any) {
        console.error("Error al guardar la decisión de QC:", error);
        return fail(error.message || "Ocurrió un error en el servidor.");
    }
}
