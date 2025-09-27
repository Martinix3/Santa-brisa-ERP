

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
import type { Lot, Uom, ProductionOrder, BillOfMaterial, OnHandView, Item, StockMove } from '@/domain/ssot';


// Si tienes estos tipos en tu SSOT, impórtalos desde '@/domain/ssot'.
// Aquí definimos mínimos para no romper si aún no están exportados.
type ProductionStage = 'PRODUCCION' | 'ENVASADO';
type ProductionStatus =
  | 'DRAFT' | 'PLANNED' | 'IN_PROGRESS'
  | 'PAUSED' | 'QC_HOLD'
  | 'CLOSED' | 'CANCELLED';
type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

type ProductionIOLine = { itemId: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number };
type ProductionOutput = { itemId: string; uom: Extract<Uom, 'L' | 'unit'>; qty: number; lotNumber: string };
type Incident = { id: string; at: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string };
type QcRecord = { status: QcStatus; measuredAt?: string; measuredById?: string; checks?: Array<{name:string;value:number|string;spec?:string;pass?:boolean}>; remarks?: string };


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
      reservations: prev.data.allocations,
      shortages: prev.data.shortages,
      allocationStatus: 'SOFT',
      lotNumber: prev.data.lotNumberPlanned,
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
    
    const lotNumber = po.lotNumber ?? newLot(lotPrefix ?? 'SB');
    const out: ProductionOutput[] = [{
        itemId: po.outputItemId,
        uom: po.baseUnit as 'L' | 'unit', // 'L' o 'unit' ya validado por etapa/BOM
        qty: Number(qty),
        lotNumber: lotNumber,
    }];
    
    // -----[[ ✨ FIX: Crear registro maestro de Lote ]]-----
    const lotDoc: Lot = {
        id: lotNumber,
        lotNumber: lotNumber,
        itemId: po.outputItemId,
        quantity: Number(qty),
        createdAt: now,
        orderId: po.id,
        qcStatus: 'PENDING', // Siempre entra en pendiente de QC
        status: 'ON_HOLD_QC',
        producedByOrderId: po.id,
        parentLotNumber: po.parentLotNumber
    } as Lot;
    // Usamos `upsertMany` que ya tienes importado
    await upsertMany('lots', [lotDoc]);
    // ----------------------------------------------------

    await upsertMany('productionOrders', [{ id, lotNumber, output: out as any, updatedAt: now, status: 'QC_HOLD' } as any]);
    revalidatePath(`/production/execution`);
    revalidatePath(`/quality/release`);
    
    return ok({ id, lotNumber });
  } catch (e:any) {
    return fail('No se pudo registrar el output.', { code: (e as any).code });
  }
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
    const newList = [...((po as any).incidents ?? []), inc];
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
type CalcRow = {
  itemId: string;
  lotNumber?: string;
  abvPct?: number;          // % v/v
  acidity_gpl?: number;     // g/L
  sugar_gpl?: number;       // g/L
  uom: Uom;
  qty: number;
  lockedItem?: boolean;
};

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
    const parsed = zCalc.parse(input) as { raws: CalcRow[] };
    const raws: CalcRow[] = parsed.raws;

    // Promedios ponderados por volumen (L) como primera aproximación
    const volRows: CalcRow[] = raws.filter((r: CalcRow) => r.uom === 'L');
    const volTotal: number = volRows.reduce((s: number, r: CalcRow) => s + r.qty, 0);
    const estAbv: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: CalcRow) => s + ((r.abvPct ?? 0) * r.qty), 0) / volTotal
        : undefined;
    const estAc: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: CalcRow) => s + ((r.acidity_gpl ?? 0) * r.qty), 0) / volTotal
        : undefined;
    const estSug: number | undefined =
      volTotal > 0
        ? volRows.reduce((s: number, r: CalcRow) => s + ((r.sugar_gpl ?? 0) * r.qty), 0) / volTotal
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

type CoaEstimates = { abvPct?: number; acidity_gpl?: number; sugar_gpl?: number };
type Adjustment = { kind: 'WATER' | 'ALCOHOL96' | 'CITRIC'; amount: number; uom: 'L' | 'kg' | 'g'; reason: string };

// ====== PREVIEW: disponibilidad + COA teórico + sugerencias de ajuste ======
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
  spec?: { abv?: { min?: number; max?: number }; acidity?: { min?: number; max?: number }; sugar?: { min?: number; max?: number } };
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
    const onHand: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom; receivedAt?:string; createdAt:string}> = await readAll("onHand") as any;
    const allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number }> = [];
    const shortages: Array<{ itemId: string; uom: Uom; required: number; available: number; missing: number }> = [];
    
    for (const line of nominal.filter((l:any)=> l.role !== 'COST_ONLY')) {
      let remaining = line.qty;
      let available = 0;
      const lots = (onHand as any[])
        .filter((l:any) => l.itemId === line.itemId && l.qty > 0)
        .sort((a:any,b:any) => new Date(a.receivedAt || a.createdAt).getTime() - new Date(b.receivedAt || b.createdAt).getTime());

      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.qty ?? 0, remaining);
        if (take > 0) {
          allocations.push({ itemId: line.itemId, lotNumber: lot.lotNumber, uom: lot.uom, qty: take });
          remaining -= take;
        }
        available += lot.qty;
      }
      if (remaining > 0) {
        shortages.push({ itemId: line.itemId, uom: line.uom, required: line.qty, available, missing: line.qty - available });
      }
    }

    // 3) COA teórico (ponderado por L) - Stub
    const est: CoaEstimates = {};

    // 4) Spec desde el BOM (si la tienes ahí) - Stub
    const spec = bom.spec;

    // 5) Sugerencias básicas - Stub
    const sugg: Adjustment[] = [];

    const inSpec: boolean = true; // Placeholder

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

