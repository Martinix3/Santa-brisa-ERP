// src/app/(app)/quality/parametros/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { revalidatePath } from 'next/cache';
import { ok, fail, type ActionResult } from '@/lib/result';
import { ParameterBySkuSchema } from './schemas';
import type { ParameterBySku } from './schemas';

const PATH = '/quality/parametros';

// SÓLO NECESITAMOS LAS ACCIONES PARA LOS PARÁMETROS
export async function listParametersBySku(sku: string): Promise<ActionResult<ParameterBySku[]>> {
  if (!sku) return ok([]);
  const snap = await db.collection('qcParameters').where('sku', '==', sku).get();
  const data = snap.docs.map(doc => doc.data() as ParameterBySku).sort((a, b) => a.name.localeCompare(b.name));
  return ok(data);
}

export async function upsertParameterBySku(p: ParameterBySku): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = ParameterBySkuSchema.parse({ ...p, updatedAt: new Date().toISOString() });
    await db.collection('qcParameters').doc(parsed.id).set(parsed, { merge: true });
    revalidatePath(PATH);
    return ok({ id: parsed.id });
  } catch(e:any) { return fail(e.message); }
}

export async function deleteParameterBySku(id: string): Promise<ActionResult<{ id: string }>> {
    try {
        await db.collection('qcParameters').doc(id).delete();
        revalidatePath(PATH);
        return ok({ id });
    } catch(e:any) { return fail(e.message); }
}