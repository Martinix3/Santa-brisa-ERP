// ============================================================================
// src/app/(app)/quality/parametros/actions.ts
// Server actions para persistencia de Parámetros por SKU, Planes QC y Protocolos APPCC
// ============================================================================

'use server';

import { z } from 'zod';

// Si tienes este helper en tu proyecto (lo usas en Producción):
let upsertMany: undefined | ((collection: string, rows: any[]) => Promise<any>);
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  upsertMany = require('@/lib/dataprovider/actions').upsertMany;
} catch { /* fallback si aún no existe */ }

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

// ============================================================================
// Persistencia — colecciones sugeridas (ajusta si ya tienes nombres):
//   - quality_parameters_by_sku
//   - quality_qcplans_by_sku
//   - quality_protocols
// ============================================================================

// Fallback mínimo si no está upsertMany: guarda en un KV local del servidor no persistente.
// (De todos modos el cliente tiene otro fallback a localStorage)
const memory = {
  parameters: new Map<string, ParameterBySku>(),
  plans: new Map<string, QcPlanBySku>(),
  protocols: new Map<string, Protocol>(),
};

async function saveBatch(collection: 'quality_parameters_by_sku' | 'quality_qcplans_by_sku' | 'quality_protocols', rows: any[]) {
  if (upsertMany) {
    return upsertMany(collection, rows);
  }
  // Fallback en memoria
  const bucket = collection === 'quality_parameters_by_sku'
    ? memory.parameters
    : collection === 'quality_qcplans_by_sku'
      ? memory.plans
      : memory.protocols;
  rows.forEach((r) => bucket.set(r.id, r));
  return { ok: true, count: rows.length };
}

// ---------- Parameters by SKU ----------
export async function listParametersBySku(sku: string): Promise<ParameterBySku[]> {
  if (!sku) return [];
  if (upsertMany) {
    // Si tienes un fetcher genérico, cámbialo por tu método real (ej. queryMany)
    // Aquí hacemos un pequeño truco: upsertMany con rows=[] no sirve para leer.
    // Implementa en tu proyecto un `queryMany({collection, where: [...]})` y úsalo aquí.
  }
  // Fallback memoria:
  return Array.from(memory.parameters.values()).filter(p => p.sku === sku);
}

export async function upsertParameterBySku(p: ParameterBySku): Promise<{ok:boolean; data?:ParameterBySku}> {
  const parsed = ParameterBySkuSchema.parse({
    ...p,
    updatedAt: new Date().toISOString(),
    createdAt: p.createdAt ?? new Date().toISOString(),
  });
  await saveBatch('quality_parameters_by_sku', [parsed]);
  return { ok: true, data: parsed };
}

export async function deleteParameterBySku(id: string) {
  if (upsertMany) {
    // Implementa deleteMany en tu proyecto si lo tienes. Fallback a "tombstone" si no.
  }
  memory.parameters.delete(id);
  return { ok: true, id };
}

// ---------- QC Plans by SKU ----------
export async function listPlansBySku(sku: string): Promise<QcPlanBySku[]> {
  if (!sku) return [];
  if (upsertMany) {
    // idem nota de lectura
  }
  return Array.from(memory.plans.values()).filter(p => p.sku === sku);
}

export async function upsertPlanBySku(plan: QcPlanBySku): Promise<{ok:boolean; data?:QcPlanBySku}> {
  const parsed = QcPlanBySkuSchema.parse({
    ...plan,
    updatedAt: new Date().toISOString(),
    createdAt: plan.createdAt ?? new Date().toISOString(),
  });
  await saveBatch('quality_qcplans_by_sku', [parsed]);
  return { ok: true, data: parsed };
}

export async function deletePlanBySku(id: string) {
  if (upsertMany) {
    // implementar delete
  }
  memory.plans.delete(id);
  return { ok: true, id };
}

// ---------- Protocolos APPCC ----------
export async function listProtocols(sku?: string): Promise<Protocol[]> {
  const all = Array.from(memory.protocols.values());
  if (!sku) return all;
  return all.filter(p => (p.appliesToSkus?.length ? p.appliesToSkus.includes(sku) : true));
}

export async function upsertProtocol(proto: Protocol): Promise<{ok:boolean; data?:Protocol}> {
  const parsed = ProtocolSchema.parse({
    ...proto,
    updatedAt: new Date().toISOString(),
    createdAt: proto.createdAt ?? new Date().toISOString(),
  });
  await saveBatch('quality_protocols', [parsed]);
  return { ok: true, data: parsed };
}

export async function deleteProtocol(id: string) {
  if (upsertMany) {
    // implementar delete
  }
  memory.protocols.delete(id);
  return { ok: true, id };
}
