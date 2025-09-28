// src/app/(app)/quality/parametros/actions.ts
'use server';

import { upsertMany } from '@/lib/dataprovider/actions';
import { ok, fail, type ActionResult } from '@/lib/result';
import {
    ParameterBySkuSchema,
    type ParameterBySku,
    QcPlanBySkuSchema,
    type QcPlanBySku,
    ProtocolSchema,
    type Protocol
} from './schemas';


const memory = {
  parameters: new Map<string, ParameterBySku>(),
  plans: new Map<string, QcPlanBySku>(),
  protocols: new Map<string, Protocol>(),
};

async function saveBatch(collection: 'qcParameters' | 'qc_plans' | 'safety_protocols', rows: any[]) {
    try {
        return await upsertMany(collection, rows);
    } catch(e) {
        // Fallback en memoria si upsertMany no está disponible o falla
        const bucket = collection === 'qcParameters'
            ? memory.parameters
            : collection === 'qc_plans'
            ? memory.plans
            : memory.protocols;
        rows.forEach((r) => bucket.set(r.id, r));
        return { ok: true, count: rows.length, inserted: 0, updated: 0, ids: [] };
    }
}

// ---------- Parameters by SKU ----------
export async function listParametersBySku(sku: string): Promise<ActionResult<ParameterBySku[]>> {
  if (!sku) return ok([]);
  // En un entorno real, aquí se consultaría la base de datos
  // Fallback memoria:
  const data = Array.from(memory.parameters.values()).filter(p => p.sku === sku);
  return ok(data);
}

export async function upsertParameterBySku(p: ParameterBySku): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = ParameterBySkuSchema.parse({
      ...p,
      updatedAt: new Date().toISOString(),
      createdAt: p.createdAt ?? new Date().toISOString(),
    });
    await saveBatch('qcParameters', [parsed]);
    return ok({ id: parsed.id });
  } catch(e:any) {
    return fail(e.message);
  }
}

export async function deleteParameterBySku(id: string): Promise<ActionResult<{ id: string }>> {
  memory.parameters.delete(id);
  // En un entorno real se haría un delete en DB
  return ok({ id });
}

// ---------- QC Plans by SKU ----------
export async function listPlans(sku: string): Promise<ActionResult<QcPlanBySku[]>> {
  if (!sku) return ok([]);
  const data = Array.from(memory.plans.values()).filter(p => p.sku === sku);
  return ok(data);
}

export async function upsertPlan(plan: QcPlanBySku): Promise<ActionResult<{ id: string }>> {
    try {
        const parsed = QcPlanBySkuSchema.parse({
            ...plan,
            updatedAt: new Date().toISOString(),
            createdAt: plan.createdAt ?? new Date().toISOString(),
        });
        await saveBatch('qc_plans', [parsed]);
        return ok({ id: parsed.id });
    } catch(e:any) {
        return fail(e.message);
    }
}

export async function deletePlan(id: string): Promise<ActionResult<{ id: string }>> {
  memory.plans.delete(id);
  return ok({ id });
}

// ---------- Protocolos APPCC ----------
export async function listProtocols(sku?: string): Promise<ActionResult<Protocol[]>> {
  const all = Array.from(memory.protocols.values());
  if (!sku) return ok(all);
  const data = all.filter(p => (p.appliesToSkus?.length ? p.appliesToSkus.includes(sku) : true));
  return ok(data);
}

export async function upsertProtocol(proto: Protocol): Promise<ActionResult<{ id: string }>> {
    try {
        const parsed = ProtocolSchema.parse({
            ...proto,
            updatedAt: new Date().toISOString(),
            createdAt: proto.createdAt ?? new Date().toISOString(),
        });
        await saveBatch('safety_protocols', [parsed]);
        return ok({ id: parsed.id });
    } catch(e:any) {
        return fail(e.message);
    }
}

export async function deleteProtocol(id: string): Promise<ActionResult<{ id: string }>> {
  memory.protocols.delete(id);
  return ok({ id });
}
