// src/app/(app)/quality/parametros/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { revalidatePath } from 'next/cache';
import { ok, fail, type ActionResult } from '@/lib/result';
import { ParameterBySkuSchema, QcPlanBySkuSchema, ProtocolSchema } from './schemas';
import type { ParameterBySku, QcPlanBySku, Protocol } from './schemas';

const PATH = '/quality/parametros'; // Ruta para revalidar

// ---------- Parameters by SKU ----------
export async function listParametersBySku(sku: string): Promise<ActionResult<ParameterBySku[]>> {
  if (!sku) return ok([]);
  
  // 1. Busca el plan de calidad para este SKU.
  const planSnap = await db.collection('qcPlans').where('sku', '==', sku).limit(1).get();
  if (planSnap.empty) return ok([]);

  const plan = planSnap.docs[0].data() as QcPlanBySku;
  const parameterIds = (plan.specs || []).map(spec => spec.parameterId).filter(Boolean);

  if (parameterIds.length === 0) return ok([]);
  
  // 2. Obtiene los documentos de los parámetros a partir de sus IDs.
  const paramsSnap = await db.collection('qcParameters').where('id', 'in', parameterIds).get();
  const data = paramsSnap.docs.map(doc => doc.data() as ParameterBySku);

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


// ---------- QC Plans by SKU ----------
export async function listPlans(sku: string): Promise<ActionResult<QcPlanBySku[]>> {
  if (!sku) return ok([]);
  const snap = await db.collection('qcPlans').where('sku', '==', sku).get();
  const data = snap.docs.map(doc => doc.data() as QcPlanBySku);
  return ok(data);
}

export async function upsertPlan(plan: QcPlanBySku): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = QcPlanBySkuSchema.parse({ ...plan, updatedAt: new Date().toISOString() });
    await db.collection('qcPlans').doc(parsed.id).set(parsed, { merge: true });
    revalidatePath(PATH);
    return ok({ id: parsed.id });
  } catch(e:any) { return fail(e.message); }
}

export async function deletePlan(id: string): Promise<ActionResult<{ id: string }>> {
    try {
        await db.collection('qcPlans').doc(id).delete();
        revalidatePath(PATH);
        return ok({ id });
    } catch(e:any) { return fail(e.message); }
}


// ---------- Protocolos APPCC ----------
export async function listProtocols(): Promise<ActionResult<Protocol[]>> {
  const snap = await db.collection('qcProtocols').get(); // Usaremos 'qcProtocols' como nombre de colección
  const data = snap.docs.map(doc => doc.data() as Protocol);
  return ok(data);
}

export async function upsertProtocol(proto: Protocol): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = ProtocolSchema.parse({ ...proto, updatedAt: new Date().toISOString() });
    await db.collection('qcProtocols').doc(parsed.id).set(parsed, { merge: true });
    revalidatePath(PATH);
    return ok({ id: parsed.id });
  } catch(e:any) { return fail(e.message); }
}

export async function deleteProtocol(id: string): Promise<ActionResult<{ id: string }>> {
    try {
        await db.collection('qcProtocols').doc(id).delete();
        revalidatePath(PATH);
        return ok({ id });
    } catch(e:any) { return fail(e.message); }
}
