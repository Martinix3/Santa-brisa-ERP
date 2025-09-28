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
  const snap = await db.collection('qcParameters').where('sku', '==', sku).get();
  const data = snap.docs.map(doc => doc.data() as ParameterBySku);
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
// ... (deleteParameterBySku funcionaría de forma similar, con db.collection('qcParameters').doc(id).delete())

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
// ... (deletePlan similar)

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
// ... (deleteProtocol similar)
