// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (ejecución)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Si tienes estos tipos en tu SSOT, impórtalos desde '@/domain/ssot'.
// Aquí definimos mínimos para no romper si aún no están exportados.
type Uom = 'L' | 'kg' | 'unit';
type ProductionStage = 'PRODUCCION' | 'ENVASADO';
type ProductionStatus =
  | 'DRAFT' | 'PLANNED' | 'IN_PROGRESS'
  | 'PAUSED' | 'PACKAGING' | 'QC_HOLD'
  | 'CLOSED' | 'CANCELLED';
type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

type ProductionIOLine = { itemId: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number };
type ProductionOutput = { itemId: string; uom: Extract<Uom, 'L' | 'unit'>; qty: number; lotNumber: string };
type Incident = { id: string; at: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string };
type QcRecord = { status: QcStatus; measuredAt?: string; measuredById?: string; checks?: Array<{name:string;value:number|string;spec?:string;pass?:boolean}>; remarks?: string };

type ProductionOrder = {
  id: string;
  bomId: string;
  stage: ProductionStage;
  outputItemId: string;
  name?: string;
  plannedQty: number;
  baseUnit: Extract<Uom, 'L' | 'unit'>;
  status: ProductionStatus;

  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  endedAt?: string;

  operatorsCount?: number;
  protocolsAcknowledged?: boolean;
  protocolsAckAt?: string;

  // Seguimiento de pausas para tiempo efectivo
  pauseLog?: Array<{ pausedAt: string; resumedAt?: string }>;

  lotNumber?: string;
  parentLotNumber?: string;

  nominal: ProductionIOLine[];
  consumption: ProductionIOLine[];
  output: ProductionOutput[];

  qc?: QcRecord;
  scrap?: Array<{ at: string; itemId?: string; uom: Uom; qty: number; reason?: string }>;
  incidents?: Incident[];

  calcInput?: {
    raws: Array<{ itemId: string; abvPct?: number; acidity_gpl?: number; sugar_gpl?: number; uom: Uom; qty: number }>;
  };
  calcResult?: {
    estimatedAbvPct?: number;
    estimatedAcidity_gpl?: number;
    estimatedSugar_gpl?: number;
  };

  createdAt: string;
  createdById: string;
  updatedAt?: string;
};

// ===== Helpers de lectura (usa tu dataprovider/reads real) =====
async function reads() {
  const mod = await import("@/lib/dataprovider/reads").catch(() => null as any);
  return {
    getOne: mod?.getOne ?? mod?.getDoc,
    getManyByIds: mod?.getManyByIds ?? mod?.getDocsByIds,
  };
}

function newLot(prefix='SB'): string { return `${prefix}-${Date.now()}`; }

async function readBOM(bomId: string): Promise<any> {
  const { getOne } = await reads();
  if (!getOne) throw new Error("readBOM no disponible");
  return await getOne('billOfMaterials', bomId);
}

async function readItems(ids: string[]): Promise<any[]> {
  const { getManyByIds } = await reads();
  if (!getManyByIds) throw new Error("readItems no disponible");
  return await getManyByIds('items', ids);
}

async function readOrder(id: string): Promise<ProductionOrder | null> {
  const { getOne } = await reads();
  if (!getOne) return null as any;
  return await getOne('productionOrders', id);
}

// ===== Explosión de BOM por cantidad planeada =====
export async function explodeBOM(bomId: string, plannedQty: number): Promise<ActionResult<{ stage: ProductionStage; outputItemId: string; baseUnit: 'L'|'unit'; nominal: ProductionIOLine[] }>> {
  try {
    const bom = await readBOM(bomId);
    if (!bom) return fail('BOM inexistente');
    const stage: ProductionStage = bom.stage ?? 'PRODUCCION';
    const baseUnit: 'L'|'unit' = stage === 'PRODUCCION' ? 'L' : 'unit';
    if (bom.baseUnit !== baseUnit) return fail('Unidad base del BOM no coincide con la etapa.');

    const ids = [bom.outputItemId, ...bom.items.map((i: any) => i.itemId)];
    const docs = await readItems(ids);
    const map = new Map(docs.map(d => [d.id, d]));

    const nominal: ProductionIOLine[] = bom.items.map((l: any) => ({
      itemId: l.itemId,
      role: l.role,
      uom: (map.get(l.itemId)?.uom ?? l.uom ?? 'unit') as Uom,
      qty: Number((l.qty * plannedQty).toFixed(6)),
    }));

    return ok({ stage, outputItemId: bom.outputItemId, baseUnit, nominal });
  } catch (e:any) {
    return fail('No se pudo explotar el BOM.', { code: e?.code });
  }
}

// ===== Planificar orden =====
export async function planProduction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const zPlan = z.object({ bomId: z.string().min(1), plannedQty: z.coerce.number().positive(), name: z.string().optional() });
  try {
    const { bomId, plannedQty, name } = zPlan.parse(input);
    const res = await explodeBOM(bomId, plannedQty);
    if (!res.ok) return res;

    const now = new Date().toISOString();
    const id = `po_${Date.now()}`;

    const po: ProductionOrder = {
      id,
      bomId,
      stage: res.data.stage,
      outputItemId: res.data.outputItemId,
      plannedQty,
      baseUnit: res.data.baseUnit,
      status: 'PLANNED',
      name,
      nominal: res.data.nominal,
      consumption: [],
      output: [],
      incidents: [],
      scrap: [],
      pauseLog: [],
      createdAt: now,
      createdById: 'auto', // TODO: user real
    };

    await upsertMany('productionOrders', [po as any]);
    revalidatePath('/production/execution');
    return ok({ id });
  } catch (e:any) {
    return fail('No se pudo planificar la orden.', { code: e?.code, retryable: true });
  }
}

// ===== Iniciar / Pausar / Reanudar =====
export async function startProduction(id: string) {
  try {
    const now = new Date().toISOString();
    await upsertMany('productionOrders', [{ id, status: 'IN_PROGRESS', startedAt: now, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo iniciar la orden.'); }
}

export async function pauseProduction(id: string) {
  try {
    const now = new Date().toISOString();
    const po = await readOrder(id);
    const newPauseLog = [...(po?.pauseLog ?? []), { pausedAt: now }];
    await upsertMany('productionOrders', [{ id, status: 'PAUSED', pauseLog: newPauseLog, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo pausar la orden.'); }
}

export async function resumeProduction(id: string) {
  try {
    const now = new Date().toISOString();
    const po = await readOrder(id);
    const log = [...(po?.pauseLog ?? [])];
    // Completa el último registro sin resumedAt
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].resumedAt == null) { log[i].resumedAt = now; break; }
    }
    await upsertMany('productionOrders', [{ id, status: 'IN_PROGRESS', pauseLog: log, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo reanudar la orden.'); }
}

// ===== Operarios & Protocolos =====
export async function setOperatorsCount(id: string, count: number) {
  try {
    await upsertMany('productionOrders', [{ id, operatorsCount: Math.max(0, Math.floor(count)), updatedAt: new Date().toISOString() } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo actualizar el número de operarios.'); }
}

export async function toggleProtocolsAcknowledged(id: string, acknowledged: boolean) {
  try {
    await upsertMany('productionOrders', [{
      id,
      protocolsAcknowledged: acknowledged,
      protocolsAckAt: acknowledged ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo actualizar el check de protocolos.'); }
}

// ===== Consumo / Lote padre / Output =====
export async function recordConsumption(id: string, lines: Array<{itemId:string; uom:Uom; qty:number; role?: 'FORMULA'|'PACKAGING'|'COST_ONLY'}>) {
  try {
    const now = new Date().toISOString();
    const sanitized = lines.map(l => ({ ...l, role: l.role ?? 'FORMULA', qty: Number(l.qty) }));
    await upsertMany('productionOrders', [{ id, consumption: sanitized as any, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo registrar el consumo.'); }
}

export async function recordPackagingParent(id: string, parentLotNumber: string) {
  try {
    await upsertMany('productionOrders', [{ id, parentLotNumber, updatedAt: new Date().toISOString(), status: 'PACKAGING' } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo asignar el lote padre.'); }
}

export async function recordOutput(id: string, qty: number, lotPrefix?: string) {
  try {
    const now = new Date().toISOString();
    const po = await readOrder(id);
    if (!po) return fail('Orden inexistente');
    const lot = po.lotNumber ?? newLot(lotPrefix ?? 'SB');

    const out: ProductionOutput[] = [{
      itemId: po.outputItemId,
      uom: po.baseUnit, // 'L' o 'unit' ya validado por etapa/BOM
      qty: Number(qty),
      lotNumber: lot,
    }];

    await upsertMany('productionOrders', [{ id, lotNumber: lot, output: out as any, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id, lotNumber: lot });
  } catch (e:any) { return fail('No se pudo registrar el output.'); }
}

// ===== QC =====
export async function setQcResult(id: string, qc: { status:'PASSED'|'FAILED'|'WAIVED'; checks?: any[]; remarks?: string; }) {
  try {
    const now = new Date().toISOString();
    const nextStatus: ProductionStatus = qc.status === 'PASSED' ? 'CLOSED' : (qc.status === 'FAILED' ? 'QC_HOLD' : 'QC_HOLD');
    const patch: any = { id, qc: { ...qc, measuredAt: now }, updatedAt: now, status: nextStatus };
    if (nextStatus === 'CLOSED') patch.endedAt = now;
    await upsertMany('productionOrders', [patch]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo registrar el QC.'); }
}

// ===== Incidencias =====
export async function addIncident(id: string, data: { severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string }) {
  try {
    const po = await readOrder(id);
    if (!po) return fail('Orden inexistente');
    const inc: Incident = { id: `inc_${Date.now()}`, at: new Date().toISOString(), ...data };
    const newList = [...(po.incidents ?? []), inc];
    await upsertMany('productionOrders', [{ id, incidents: newList as any, updatedAt: new Date().toISOString() } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id, incidentId: inc.id });
  } catch (e:any) { return fail('No se pudo registrar la incidencia.'); }
}

// ===== Cerrar / Cancelar =====
export async function closeProduction(id: string) {
  try {
    const now = new Date().toISOString();
    await upsertMany('productionOrders', [{ id, status: 'CLOSED', endedAt: now, updatedAt: now } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo cerrar la orden.'); }
}

export async function cancelProduction(id: string) {
  try {
    await upsertMany('productionOrders', [{ id, status: 'CANCELLED', updatedAt: new Date().toISOString() } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo cancelar la orden.'); }
}

// ===== Calculadora de ajustes (estimación simple) =====
const zCalc = z.object({
  raws: z.array(z.object({
    itemId: z.string(),
    abvPct: z.number().optional(),
    acidity_gpl: z.number().optional(),
    sugar_gpl: z.number().optional(),
    uom: z.enum(['L','kg','unit']),
    qty: z.number().positive(),
  }))
});

export async function setCalculatorInput(id: string, input: unknown) {
  try {
    const { raws } = zCalc.parse(input);
    // Promedios ponderados por volumen (L) como primera aproximación
    const volRows = raws.filter(r => r.uom === 'L');
    const volTotal = volRows.reduce((s,r)=> s + r.qty, 0);
    const estAbv = volTotal>0 ? volRows.reduce((s,r)=> s + (r.abvPct ?? 0)*r.qty, 0)/volTotal : undefined;
    const estAc  = volTotal>0 ? volRows.reduce((s,r)=> s + (r.acidity_gpl ?? 0)*r.qty, 0)/volTotal : undefined;
    const estSug = volTotal>0 ? volRows.reduce((s,r)=> s + (r.sugar_gpl ?? 0)*r.qty, 0)/volTotal : undefined;

    await upsertMany('productionOrders', [{
      id,
      calcInput: { raws },
      calcResult: { estimatedAbvPct: estAbv, estimatedAcidity_gpl: estAc, estimatedSugar_gpl: estSug },
      updatedAt: new Date().toISOString()
    } as any]);
    revalidatePath(`/production/execution`);
    return ok({ id });
  } catch (e:any) {
    return fail('Entrada inválida para la calculadora.', { code: e?.code });
  }
}
