// ============================================================================
// src/app/(app)/quality/parametros/actions.ts
// Server actions para persistencia de Parámetros por SKU, Planes QC y Protocolos APPCC
// ============================================================================

'use server';

import { z } from 'zod';
import { upsertMany } from '@/lib/dataprovider/actions';
import { ok, fail, type ActionResult } from '@/lib/result';

const Id = z.string().min(1);
const ISO = z.string().optional();

export const ParameterBySkuSchema = z.object({
  id: Id,               // param_<sku>_<code> (único)
  sku: z.string().min(1),
  code: z.string().min(1),     // p.ej. 'pH', 'ALC_VOL', 'BRIX'
  name: z.string().min(1),     // legible
  unit: z.string().optional(),
  method: z.string().optional(), // LAB / SENSORIAL / INSTRUMENTAL
  target: z.number().optional(),
  tolerance: z.number().optional(),
  range: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    inclusiveMin: z.boolean().optional(),
    inclusiveMax: z.boolean().optional(),
  }).optional(),
  notes: z.string().optional(),
  createdAt: ISO,
  updatedAt: ISO,
});
export type ParameterBySku = z.infer<typeof ParameterBySkuSchema>;

export const QcSpecSchema = z.object({
  id: Id, // spec_<...>
  parameterId: Id, // referencia a ParameterBySku.id
  point: z.string().min(1), // RECEPCION | PROCESO | ENVASADO | ALMACEN | PRE-ENVIO
  method: z.string().optional(),
  unit: z.string().optional(),
  target: z.number().optional(),
  tolerance: z.number().optional(),
  range: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    inclusiveMin: z.boolean().optional(),
    inclusiveMax: z.boolean().optional(),
  }).optional(),
});
export type QcSpec = z.infer<typeof QcSpecSchema>;


export const QcPlanBySkuSchema = z.object({
  id: Id, // plan_<sku>_<slug>
  sku: z.string().min(1),
  name: z.string().min(1),
  specs: z.array(QcSpecSchema),
  createdAt: ISO, updatedAt: ISO,
});
export type QcPlanBySku = z.infer<typeof QcPlanBySkuSchema>;

export const ProtocolSchema = z.object({
  id: Id,            // prot_<slug>
  title: z.string().min(1),
  code: z.string().optional(),
  priority: z.enum(['PRP','oPRP','CCP']).default('PRP'),
  active: z.boolean().default(true),
  // APPCC: detalla cada protocolo como plan con sus elementos clave:
  criticalLimits: z.string().optional(),   // solo aplica a CCP
  monitoring: z.string().optional(),
  correctiveActions: z.string().optional(),
  verification: z.string().optional(),
  records: z.string().optional(),
  checklist: z.array(z.string()).default([]),
  appliesToSkus: z.array(z.string()).optional(), // si vacío => global
  createdAt: ISO, updatedAt: ISO,
});
export type Protocol = z.infer<typeof ProtocolSchema>;


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
