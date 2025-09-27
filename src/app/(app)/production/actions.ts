// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (ejecución)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminDb } from '@/server/firebase';


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
  plannedDate?: string; // YYYY-MM-DD
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
  // Mock 'reads' since it does not exist
  return {
    getOne: async (collection: string, id: string) => {
        const doc = await adminDb.collection(collection).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },
    getManyByIds: async (collection: string, ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        const snaps = await adminDb.collection(collection).where('id', 'in', ids).get();
        return snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  };
}

// Lee una colección completa con compatibilidad hacia atrás con distintas APIs
async function readAll(collection: string): Promise<any[]> {
    const snap = await adminDb.collection(collection).get();
    return snap.docs.map(d => d.data());
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
  return await getOne('productionOrders', id) as ProductionOrder | null;
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
    const map = new Map(docs.map((d: any) => [d.id, d]));

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
  const zPlan = z.object({
    bomId: z.string().min(1),
    plannedQty: z.coerce.number().positive(),
    plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    name: z.string().optional()
  });
  try {
    const { bomId, plannedQty, plannedDate, name } = zPlan.parse(input);

    // Reutilizamos la lógica de explosión + FIFO + spec de preview
    const prev = await previewPlanning({ bomId, plannedQty });
    if (!prev.ok) return fail(prev.message);

    const now = new Date().toISOString();
    const id = `po_${Date.now()}`;

    const po = {
      id,
      bomId,
      stage: prev.data.stage,
      outputItemId: prev.data.outputItemId,
      plannedQty,
      plannedDate,
      baseUnit: prev.data.baseUnit,
      status: 'PLANNED',
      name,
      nominal: prev.data.nominal,
      // añadimos visibilidad de planificación:
      allocations: prev.data.allocations,
      shortages: prev.data.shortages,
      allocationStatus: 'SOFT',
      lotNumberPlanned: prev.data.lotNumberPlanned,
      createdAt: now,
      createdById: 'auto',
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
    const log: Array<{ pausedAt: string; resumedAt?: string }> = [...(po?.pauseLog ?? [])] as any;
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
type RawLine = { itemId: string; abvPct?: number; acidity_gpl?: number; sugar_gpl?: number; uom: 'L'|'kg'|'unit'; qty: number };

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
    const parsed = zCalc.parse(input) as { raws: RawLine[] };
    const raws: RawLine[] = parsed.raws;

    // Promedios ponderados por volumen (L) como primera aproximación
    const volRows: RawLine[] = raws.filter((r: RawLine) => r.uom === 'L');
    const volTotal: number = volRows.reduce((s: number, r: RawLine) => s + r.qty, 0);
    const estAbv: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: RawLine) => s + ((r.abvPct ?? 0) * r.qty), 0) / volTotal
        : undefined;
    const estAc: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: RawLine) => s + ((r.acidity_gpl ?? 0) * r.qty), 0) / volTotal
        : undefined;
    const estSug: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: RawLine) => s + ((r.sugar_gpl ?? 0) * r.qty), 0) / volTotal
        : undefined;

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

// ====== PREVIEW: disponibilidad + COA teórico + sugerencias de ajuste ======
type SpecRange = { min?: number; max?: number };
type CoaEstimates = { abvPct?: number; acidity_gpl?: number; sugar_gpl?: number };
type Adjustment = { kind: 'WATER' | 'ALCOHOL96' | 'CITRIC'; amount: number; uom: 'L' | 'kg' | 'g'; reason: string };

export async function previewPlanning(input: {
  bomId: string;
  plannedQty: number;
  alcoholStrengthForAdjustment?: number; // % v/v del alcohol corrector (por defecto 96)
}): Promise<ActionResult<{
  stage: 'PRODUCCION'|'ENVASADO';
  baseUnit: 'L'|'unit';
  outputItemId: string;
  nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }>;
  allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number }>;
  shortages: Array<{ itemId: string; uom: Uom; required: number; available: number; missing: number }>;
  lotNumberPlanned: string;
  spec?: { abv?: SpecRange; acidity?: SpecRange; sugar?: SpecRange };
  estimates: CoaEstimates;
  suggestions: Adjustment[];
  inSpec: boolean;
}>> {
  try {
    const { bomId, plannedQty, alcoholStrengthForAdjustment = 96 } = input;
    if (!bomId || plannedQty <= 0) return fail("Falta BOM o cantidad inválida.");

    const bom = await readBOM(bomId);
    if (!bom) return fail("BOM inexistente.");

    const stage: 'PRODUCCION'|'ENVASADO' = bom.stage ?? 'PRODUCCION';
    const baseUnit: 'L'|'unit' = stage === 'PRODUCCION' ? 'L' : 'unit';

    // 1) Nominal
    const nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }> =
      (bom.items || []).map((it: any) => ({
        itemId: it.itemId,
        role: (it.role ?? 'FORMULA') as 'FORMULA'|'PACKAGING'|'COST_ONLY',
        uom: (it.uom ?? baseUnit) as Uom,
        qty: Number(((it.qty ?? 0) * plannedQty).toFixed(6)),
      }));

    // 2) FIFO disponibilidad
    const onHand: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom; receivedAt:string}> = await readAll("onHand") as any;
    const allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number }> = [];
    const shortages: Array<{ itemId: string; uom: Uom; required: number; available: number; missing: number }> = [];
    for (const line of nominal.filter((l) => l.role !== 'PACKAGING' || stage === 'ENVASADO')) {
      let remaining: number = line.qty;
      let available: number = 0;
      const lots = (onHand as Array<{itemId:string; lotNumber:string; qty:number; uom:Uom; receivedAt:string}>)
        .filter((l) => l.itemId === line.itemId && l.qty > 0)
        .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.qty ?? 0, remaining);
        if (take > 0) {
          if (!lot.lotNumber) {
            console.warn(`fifoReserveLots: OnHand item ${lot.id} for item ${lot.itemId} has no lotNumber.`);
            continue;
          }
          allocations.push({ itemId: line.itemId, lotNumber: lot.lotNumber!, uom: lot.uom, qty: take });
          remaining -= take;
          available += take;
        }
      }
      if (remaining > 0) {
        shortages.push({ itemId: line.itemId, uom: line.uom, required: line.qty, available, missing: remaining });
      }
    }

    // 3) COA teórico (ponderado por L)
    const coas: Array<{itemId:string; measuredAt:string; abvPct?:number; acidity_gpl?:number; sugar_gpl?:number}> = await readAll('coas') as any;
    const latestCoaByItem = new Map<string, {itemId:string; measuredAt:string; abvPct?:number; acidity_gpl?:number; sugar_gpl?:number}>();
    for (const c of coas) {
      const cur = latestCoaByItem.get(c.itemId);
      if (!cur || new Date(c.measuredAt).getTime() > new Date(cur.measuredAt).getTime()) {
        latestCoaByItem.set(c.itemId, c);
      }
    }
    const liquidLines = nominal.filter((l) => l.uom === 'L' && l.role !== 'PACKAGING');
    const V: number = liquidLines.reduce((s: number, l) => s + (l.qty || 0), 0);
    const est: CoaEstimates = {};
    if (V > 0) {
      const w = (fn: (c: {abvPct?:number; acidity_gpl?:number; sugar_gpl?:number} | undefined) => number | undefined) =>
        liquidLines.reduce(
          (s: number, l) => s + ((fn(latestCoaByItem.get(l.itemId)) ?? 0) * (l.qty || 0)),
          0
        ) / V;

      const estAbv = w(c => c?.abvPct);
      const estAc  = w(c => c?.acidity_gpl);
      const estSu  = w(c => c?.sugar_gpl);
      if (!Number.isNaN(estAbv)) est.abvPct = Number((estAbv as number).toFixed(2));
      if (!Number.isNaN(estAc))  est.acidity_gpl = Number((estAc as number).toFixed(1));
      if (!Number.isNaN(estSu))  est.sugar_gpl = Number((estSu as number).toFixed(1));
    }

    // 4) Spec desde el BOM (si la tienes ahí)
    const spec = bom.spec ? {
      abv:     { min: bom.spec.abvMin,     max: bom.spec.abvMax } as SpecRange,
      acidity: { min: bom.spec.acidityMin, max: bom.spec.acidityMax } as SpecRange,
      sugar:   { min: bom.spec.sugarMin,   max: bom.spec.sugarMax } as SpecRange,
    } : undefined;

    // 5) Sugerencias básicas
    const sugg: Adjustment[] = [];
    if (spec?.abv?.max != null && est.abvPct != null && V > 0 && est.abvPct > spec.abv.max) {
      const x = V * (est.abvPct / spec.abv.max - 1);
      if (x > 1e-4) sugg.push({ kind: 'WATER', amount: Number(x.toFixed(3)), uom: 'L', reason: `Diluir ABV a ≤ ${spec.abv.max}%` });
    }
    if (spec?.acidity?.max != null && est.acidity_gpl != null && V > 0 && est.acidity_gpl > spec.acidity.max) {
      const x = V * (est.acidity_gpl / spec.acidity.max - 1);
      if (x > 1e-4) sugg.push({ kind: 'WATER', amount: Number(x.toFixed(3)), uom: 'L', reason: `Diluir acidez a ≤ ${spec.acidity.max} g/L` });
    }
    if (spec?.abv?.min != null && est.abvPct != null && V > 0 && est.abvPct < spec.abv.min) {
      const S = alcoholStrengthForAdjustment; const T = spec.abv.min;
      const A = ((T - est.abvPct) * V) / (S - T);
      if (A > 1e-4) sugg.push({ kind: 'ALCOHOL96', amount: Number(A.toFixed(3)), uom: 'L', reason: `Subir ABV a ≥ ${T}% con alcohol ${S}%` });
    }
    if (spec?.acidity?.min != null && est.acidity_gpl != null && V > 0 && est.acidity_gpl < spec.acidity.min) {
      const grams = (spec.acidity.min - est.acidity_gpl) * V;
      if (grams > 0.1) sugg.push({ kind: 'CITRIC', amount: Math.round(grams), uom: 'g', reason: `Subir acidez a ≥ ${spec.acidity.min} g/L` });
    }

    const inSpec: boolean =
      (!spec?.abv     || (est.abvPct       == null) || ((spec.abv.min ?? -Infinity) <= est.abvPct && est.abvPct <= (spec.abv.max ?? Infinity))) &&
      (!spec?.acidity || (est.acidity_gpl  == null) || ((spec.acidity.min ?? -Infinity) <= est.acidity_gpl && est.acidity_gpl <= (spec.acidity.max ?? Infinity))) &&
      (!spec?.sugar   || (est.sugar_gpl    == null) || ((spec.sugar.min ?? -Infinity) <= est.sugar_gpl && est.sugar_gpl <= (spec.sugar.max ?? Infinity)));

    const lotNumberPlanned = `SB-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-MAIN-${Math.floor(Math.random()*900+100)}`;

    return ok({
      stage, baseUnit, outputItemId: bom.outputItemId,
      nominal, allocations, shortages, lotNumberPlanned,
      spec, estimates: est, suggestions: sugg, inSpec
    });
  } catch (e:any) {
    return fail("No se pudo previsualizar la planificación.", { code: e?.code });
  }
}
