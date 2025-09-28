// src/app/(app)/quality/parametros/schemas.ts
import { z } from 'zod';

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
