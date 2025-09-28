
// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (ejecución)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/actions";
import { FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from '@/server/firebase';
import type { Lot as SsotLot, Uom, ProductionOrder, BillOfMaterial, OnHandView, Item, StockMove } from '@/domain/ssot';
import { LotSchema, type Lot } from '@/domain/validators';
import { explodeBOM } from '@/server/production/bom.service';
import { findNextLotNumber } from '../warehouse/inventory/actions';
import { makeOnHandId } from '@/domain/id-helpers';


// Si tienes estos tipos en tu SSOT, impórtalos desde '@/domain/ssot'.
// Aquí definimos mínimos para no romper si aún no están exportados.
type ProductionStage = 'PRODUCCION' | 'ENVASADO';
type ProductionStatus =
  | 'DRAFT' | 'PLANNED' | 'IN_PROGRESS'
  | 'PAUSED' | 'QC_HOLD'
  | 'DONE' | 'CANCELLED';
type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

type ProductionIOLine = { itemId: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number };
type ProductionOutput = { itemId: string; uom: Extract<Uom, 'L' | 'unit'>; qty: number; lotNumber: string };
type Incident = { id: string; at: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string };
type QcRecord = { status: QcStatus; measuredAt?: string; measuredById?: string; checks?: Array<{name:string;value:number|string;pass?:boolean}>; remarks?: string };


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
        const snaps = await adminDb.collection(collection).where(FieldPath.documentId(), 'in', ids).get();
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

// ===== Planificar orden =====
export async function planProduction(input: unknown): Promise<ActionResult<{ order: ProductionOrder }>> {
    const zPlan = z.object({
        bomId: z.string().min(1),
        qty: z.coerce.number().positive().optional(),
        plannedQty: z.coerce.number().positive().optional(),
        plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        name: z.string().optional(),
        reservations: z.array(z.object({
          itemId: z.string(), lotNumber: z.string(), uom: z.string(), qty: z.number().positive()
        })).optional(),
        idempotencyKey: z.string().uuid().optional(),
      }).refine(v => (v.qty ?? v.plannedQty) != null, { message: "qty o plannedQty requerido" });

  try {
    const parsed = zPlan.parse(input);
    const plannedQty = parsed.plannedQty ?? parsed.qty!;
    const { bomId, plannedDate, name, reservations, idempotencyKey } = parsed;

    // Reutilizamos la lógica de explosión + FIFO + spec de preview
    const prev = await previewPlanning({ bomId, plannedQty });
    if (!prev.ok) return fail(prev.message);

    const now = new Date().toISOString();
    const id = `po_${Date.now()}`;

    const po: any = {
      id,
      bomId,
      stage: prev.data.stage,
      outputItemId: prev.data.outputItemId,
      targetQuantity: plannedQty,
      scheduledFor: plannedDate,
      baseUnit: prev.data.baseUnit,
      status: 'PLANNED',
      name,
      nominal: prev.data.nominal, // teoría
      reservations: reservations ?? prev.data.allocations, // reservas confirmadas o sugeridas
      shortages: prev.data.shortages,
      allocationStatus: prev.data.shortages.length ? 'PARTIAL' : 'SOFT',
      lotNumber: prev.data.lotNumberPlanned,
      createdAt: now,
      createdById: 'auto',
      idempotency: idempotencyKey ? [idempotencyKey] : []
    };

    await upsertMany('productionOrders', [po as any]);
    return ok({ order: po as ProductionOrder });
  } catch (e:any) {
    return fail('No se pudo planificar la orden.', { code: e?.code, retryable: true });
  }
}

// ===== Iniciar / Pausar / Reanudar =====
export async function startProduction(input: { orderId: string; responsible?: string; idempotencyKey?: string }) {
  try {
    const { orderId, responsible, idempotencyKey } = input;
    const now = new Date().toISOString();
    const patch: any = { id: orderId, status: 'IN_PROGRESS', startedAt: now, updatedAt: now, locked: true };
    if (responsible) patch.responsible = responsible;
    if (idempotencyKey) patch.idempotencyKey = idempotencyKey;
    await upsertMany('productionOrders', [patch]);
    return ok({ order: patch });
  } catch (e:any) { return fail('No se pudo iniciar la orden.'); }
}

export async function pauseProduction(input: { orderId: string; idempotencyKey?: string }) {
  try {
    const { orderId } = input;
    const now = new Date().toISOString();
    const po = await readOrder(orderId);
    const newPauseLog = [...(po?.pauseLog ?? []), { pausedAt: now }];
    await upsertMany('productionOrders', [{ id: orderId, status: 'PAUSED', pauseLog: newPauseLog, updatedAt: now } as any]);
    return ok({ order: { id: orderId, status: 'PAUSED', pauseLog: newPauseLog } as any });
  } catch (e:any) { return fail('No se pudo pausar la orden.'); }
}

export async function resumeProduction(input: { orderId: string; idempotencyKey?: string }) {
  try {
    const { orderId } = input;
    const now = new Date().toISOString();
    const po = await readOrder(orderId);
    const log: Array<{ pausedAt: string; resumedAt?: string }> = [...(po?.pauseLog ?? [])] as any;
    // Completa el último registro sin resumedAt
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].resumedAt == null) { log[i].resumedAt = now; break; }
    }
    await upsertMany('productionOrders', [{ id: orderId, status: 'IN_PROGRESS', pauseLog: log, updatedAt: now } as any]);
    return ok({ order: { id: orderId, status: 'IN_PROGRESS', pauseLog: log } as any });
  } catch (e:any) { return fail('No se pudo reanudar la orden.'); }
}

// ===== Operarios & Protocolos =====
export async function setOperatorsCount(id: string, count: number) {
  try {
    await upsertMany('productionOrders', [{ id, operatorsCount: Math.max(0, Math.floor(count)), updatedAt: new Date().toISOString() } as any]);
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
    return ok({ id });
  } catch (e:any) { return fail('No se pudo actualizar el check de protocolos.'); }
}

// ===== Consumo / Lote padre / Output =====
export async function recordConsumption(id: string, lines: Array<{itemId:string; uom:Uom; qty:number; role?: 'FORMULA'|'PACKAGING'|'COST_ONLY'}>) {
  try {
    const now = new Date().toISOString();
    const sanitized = lines.map(l => ({ ...l, role: l.role ?? 'FORMULA', qty: Number(l.qty) }));
    await upsertMany('productionOrders', [{ id, consumption: sanitized as any, updatedAt: now } as any]);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo registrar el consumo.'); }
}

export async function recordPackagingParent(id: string, parentLotNumber: string) {
  try {
    await upsertMany('productionOrders', [{ id, parentLotNumber, updatedAt: new Date().toISOString(), status: 'PACKAGING' } as any]);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo asignar el lote padre.'); }
}

export async function recordOutput(args: {
    prodOrderId: string;
    outputs: Array<{ itemId: string; lotNumber: string; qty: number; uom: 'kg'|'L'|'unit'; expiryAt?: string|null; locationId?: string }>;
}) {
    const now = new Date().toISOString();
    const lots = args.outputs.map(o => LotSchema.parse({
        lotNumber: o.lotNumber,
        itemId: o.itemId,
        qty: o.qty,
        uom: o.uom,
        qcStatus: 'PENDING', // SIEMPRE PENDING al salir de producción
        expiryAt: o.expiryAt ?? null,
        createdAt: now,
        updatedAt: now,
    }));
    await upsertMany('lots', lots as any);
    return ok({ lotNumbers: lots.map(l => l.lotNumber) });
}


// ===== QC =====
export async function setQcResult(id: string, qc: { status:'PASSED'|'FAILED'|'WAIVED'; checks?: any[]; remarks?: string; }) {
  try {
    const now = new Date().toISOString();
    const nextStatus: ProductionStatus = qc.status === 'PASSED' ? 'DONE' : (qc.status === 'FAILED' ? 'QC_HOLD' : 'QC_HOLD');
    const patch: any = { id, qc: { ...qc, measuredAt: now }, updatedAt: now, status: nextStatus };
    if (nextStatus === 'DONE') patch.endedAt = now;
    await upsertMany('productionOrders', [patch]);
    return ok({ id });
  } catch (e:any) { return fail('No se pudo registrar el QC.'); }
}

// ===== Incidencias =====
export async function addIncident(input: { orderId: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string; idempotencyKey?: string }) {
  try {
    const { orderId, ...data } = input;
    const po = await readOrder(orderId);
    if (!po) return fail('Orden inexistente');
    const inc: Incident = { id: `inc_${Date.now()}`, at: new Date().toISOString(), ...data };
    const newList = [...((po as any).incidents ?? []), inc];
    await upsertMany('productionOrders', [{ id: orderId, incidents: newList as any, updatedAt: new Date().toISOString() } as any]);
    return ok({ orderId, incidentId: inc.id });
  } catch (e:any) { return fail('No se pudo registrar la incidencia.'); }
}

// ===== Cerrar / Cancelar =====
type CloseInput = {
  prodOrderId: string;
  output: { itemId: string; uom: string; qty: number; lotNumber?: string; sku?: string; toLocationId?: string };
  consumptions: Array<{ itemId: string; uom: string; qty: number; lotNumber: string; fromLocationId?: string }>;
  finalizeStatus?: 'DONE'|'CLOSED';
};

export async function closeProduction(input: CloseInput) {
    const nowIso = new Date().toISOString();
    const batch = adminDb.batch();

    const orderRef = adminDb.collection('productionOrders').doc(input.prodOrderId);

    // 1) CONSUMO de materias primas (salida)
    for (const c of input.consumptions) {
        const smRef = adminDb.collection('stockMoves').doc();
        const fromLoc = c.fromLocationId ?? 'RM/MAIN';
        batch.set(smRef, {
            id: smRef.id,
            prodOrderId: input.prodOrderId,
            itemId: c.itemId,
            lotNumber: c.lotNumber,
            qty: -Math.abs(c.qty),
            uom: c.uom,
            reason: 'production_out', // Usar 'production_out'
            fromLocationId: fromLoc,
            toLocationId: '',
            occurredAt: nowIso,
            createdAt: nowIso,
        });
    }

    // 2) EMISIÓN de producto final (entrada)
    const out = input.output;
    const toLoc = out.toLocationId ?? 'FG/MAIN';
    const lotNumber = out.lotNumber ?? (await findNextLotNumber(out.itemId, out.sku));

    // Asegura que el lote FG exista
    const lotRef = adminDb.collection('lots').doc(lotNumber);
    batch.set(lotRef, {
        id: lotNumber,
        lotNumber,
        itemId: out.itemId,
        uom: out.uom,
        qcStatus: 'HOLD', // Los lotes nuevos entran en Hold para QC
        createdAt: nowIso, updatedAt: nowIso,
    }, { merge: true });

    const smFGRef = adminDb.collection('stockMoves').doc();
    batch.set(smFGRef, {
        id: smFGRef.id,
        prodOrderId: input.prodOrderId,
        itemId: out.itemId,
        lotNumber,
        qty: Math.abs(out.qty),
        uom: out.uom,
        reason: 'production_in', // Usar 'production_in'
        fromLocationId: '',
        toLocationId: toLoc,
        occurredAt: nowIso,
        createdAt: nowIso,
    });

    // 3) Estado de la orden
    batch.update(orderRef, {
        status: input.finalizeStatus ?? 'DONE',
        closedAt: nowIso,
        updatedAt: nowIso,
    });

    await batch.commit();
    return { ok: true, prodOrderId: input.prodOrderId, lotNumber };
}


export async function cancelProduction(input: { orderId: string; idempotencyKey?: string }) {
    try {
        await upsertMany('productionOrders', [{ id: input.orderId, status: 'CANCELLED', updatedAt: new Date().toISOString() } as any]);
        return ok({ order: { id: input.orderId, status: 'CANCELLED' } as any });
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
    const baseUnit: 'L'|'unit' = (stage === 'PRODUCCION' ? 'L' : 'unit');

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
        const take = Math.min(Number(lot.qty) || 0, remaining);
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

    

    
