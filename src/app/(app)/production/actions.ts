
// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (REFACTORIZADO)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/actions";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from '@/server/firebase';
import type { Lot as SsotLot, Uom, ProductionOrder, BillOfMaterial as RecipeBom, OnHandView, Item, StockMove, TraceEvent, QcPlanBySku } from '@/domain/ssot';
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
type ProductionOutput = { itemId: string; uom: Extract<Uom, 'L' | 'uds'>; qty: number; lotNumber: string };
type Incident = { id: string; at: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string };
type QcRecord = { status: QcStatus; measuredAt?: string; measuredById?: string; checks?: Array<{name:string;value:number|string;pass?:boolean}>; remarks?: string };


// ===== Helpers de lectura (usa tu dataprovider/reads real) =====
async function readOrder(id: string): Promise<ProductionOrder | null> {
    const doc = await adminDb.collection('productionOrders').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ProductionOrder;
}

// ============================================================================
// ACCIONES CENTRALIZADAS Y ROBUSTAS
// ============================================================================

/**
 * Cambia el estado de una orden de producción (Iniciar, Pausar, Reanudar, Cancelar).
 * Esta función centraliza todas las transiciones de estado simples.
 */
const UpdateStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['IN_PROGRESS', 'PAUSED', 'CANCELLED']),
  responsibleId: z.string().optional(),
});

export async function updateProductionOrderStatus(
  input: z.infer<typeof UpdateStatusSchema>
): Promise<ActionResult<{ order: Partial<ProductionOrder> }>> {
  const parsed = UpdateStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  
  const { orderId, status, responsibleId } = parsed.data;
  const now = new Date().toISOString();

  try {
    const orderRef = adminDb.collection('productionOrders').doc(orderId);
    const order = await readOrder(orderId);
    if (!order) return fail("La orden de producción no existe.");
    
    let patch: any = { status, updatedAt: now };

    if (status === 'IN_PROGRESS') {
      if (order.status === 'PLANNED') {
        patch.startedAt = now;
        if (responsibleId) patch.responsibleId = responsibleId;
      } else if (order.status === 'PAUSED') {
        const log = [...(order.pauseLog || [])];
        const lastPause = log.find(p => !p.resumedAt);
        if (lastPause) lastPause.resumedAt = now;
        patch = { ...patch, pauseLog: log };
      }
    } else if (status === 'PAUSED') {
      const newPauseLog = [...(order.pauseLog || []), { pausedAt: now }];
      patch = { ...patch, pauseLog: newPauseLog };
    } else if (status === 'CANCELLED') {
      patch.cancelledAt = now;
    }

    await orderRef.update(patch);
    return ok({ order: { id: orderId, ...patch } });
  } catch (e: any) {
    return fail(`No se pudo actualizar el estado de la orden a ${status}.`);
  }
}

/**
 * Finaliza una orden de producción.
 * Esta es la única función que cierra una orden y ejecuta todos los movimientos de inventario asociados.
 * Es una operación atómica: o todo tiene éxito, o nada se guarda.
 */
const CompleteOrderSchema = z.object({
  orderId: z.string().min(1),
  finalOutputs: z.array(z.object({
    itemId: z.string(),
    lotNumber: z.string().optional(),
    sku: z.string().optional(), // Para generar lote si no viene
    qty: z.number().positive(),
    uom: z.enum(['kg', 'g', 'L', 'mL', 'bottle', 'case', 'pallet', 'uds']),
    toLocationId: z.string().default('ALMACEN_TERMINADO'),
  })).min(1),
  finalConsumptions: z.array(z.object({
    itemId: z.string(),
    lotNumber: z.string(),
    qty: z.number().positive(),
    uom: z.string(),
    fromLocationId: z.string().default('ALMACEN_MATERIAS_PRIMAS'),
  })),
});

export async function completeProductionOrder(
  input: z.infer<typeof CompleteOrderSchema>
): Promise<ActionResult<{ orderId: string; lotNumbers: string[] }>> {
  const parsed = CompleteOrderSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de cierre inválidos.", { fieldErrors: parsed.error.flatten() });

  const { orderId, finalOutputs, finalConsumptions } = parsed.data;
  const now = new Date().toISOString();

  const order = await readOrder(orderId);
  if (!order) return fail("La orden de producción no existe.");
  if (order.status === 'DONE' || order.status === 'CANCELLED') {
    return fail("La orden ya está finalizada o cancelada.");
  }
  
  // Inicia un batch para asegurar que todas las operaciones sean atómicas
  const batch = adminDb.batch();

  try {
    // 1. Salida de stock de materias primas consumidas
    for (const consumption of finalConsumptions) {
      const moveRef = adminDb.collection('stockMoves').doc();
      const move: Omit<StockMove, 'uom'> & { uom: string } = {
        id: moveRef.id,
        ref: { prodOrderId: orderId },
        itemId: consumption.itemId,
        lotNumber: consumption.lotNumber,
        qty: -Math.abs(consumption.qty),
        uom: consumption.uom,
        reason: 'production_out',
        fromLocationId: consumption.fromLocationId,
        occurredAt: now,
        createdAt: now,
      };
      batch.set(moveRef, move);
      
      const traceEventRef = adminDb.collection('traceEvents').doc();
      const traceEvent: TraceEvent = {
          id: traceEventRef.id,
          subject: { type: 'LOT', id: consumption.lotNumber },
          phase: 'PRODUCTION',
          kind: 'CONSUME',
          at: now,
          title: `Consumo en orden ${order.orderNumber || orderId}`,
          details: `Consumido ${-Math.abs(consumption.qty)} ${consumption.uom} del lote ${consumption.lotNumber}.`,
          links: { prodOrderId: orderId, lotNumber: consumption.lotNumber },
          data: {
              orderNumber: order.orderNumber,
              qty: -Math.abs(consumption.qty),
              uom: consumption.uom
          }
      };
      batch.set(traceEventRef, traceEvent as any);


      const onHandOutId = makeOnHandId(consumption.itemId, consumption.lotNumber, consumption.fromLocationId);
      const onHandOutRef = adminDb.collection('onHand').doc(onHandOutId);
      batch.update(onHandOutRef, { qty: FieldValue.increment(-Math.abs(consumption.qty)), updatedAt: now });
    }

    const newLotNumbers: string[] = [];

    // 2. Entrada de stock de productos terminados
    for (const output of finalOutputs) {
      const lotNumber = output.lotNumber || (await findNextLotNumber(output.itemId, output.sku));
      newLotNumbers.push(lotNumber);

      const qcPlanSnap = await adminDb.collection('qcPlans').where('sku', '==', output.sku).limit(1).get();
      const qcPlanId = qcPlanSnap.empty ? undefined : qcPlanSnap.docs[0].id;

      // Crear o actualizar el lote
      const lotRef = db.collection('lots').doc(lotNumber);
      batch.set(lotRef, LotSchema.parse({
        lotNumber,
        itemId: output.itemId,
        quantity: output.qty,
        uom: output.uom,
        qcStatus: 'PENDING', // El producto siempre sale de producción a QC
        qcPlanId: qcPlanId,
        createdAt: now,
        updatedAt: now,
        expiryAt: undefined,
      }), { merge: true });

      // Crear el movimiento de stock de entrada
      const moveInRef = adminDb.collection('stockMoves').doc();
      const moveIn: Omit<StockMove, 'uom'> & { uom: string } = {
        id: moveInRef.id,
        ref: { prodOrderId: orderId },
        itemId: output.itemId,
        lotNumber: lotNumber,
        qty: output.qty,
        uom: output.uom,
        reason: 'production_in',
        toLocationId: output.toLocationId,
        occurredAt: now,
        createdAt: now,
      };
      batch.set(moveInRef, moveIn);
      
      const traceEventInRef = adminDb.collection('traceEvents').doc();
      const traceEventIn: TraceEvent = {
          id: traceEventInRef.id,
          subject: { type: 'LOT', id: lotNumber },
          phase: 'PRODUCTION',
          kind: 'OUTPUT',
          at: now,
          title: `Producción de lote ${lotNumber}`,
          details: `Generado ${output.qty} ${output.uom} desde orden ${order.orderNumber || orderId}.`,
          links: { prodOrderId: orderId, lotNumber: lotNumber },
          data: {
              orderNumber: order.orderNumber,
              qty: output.qty,
              uom: output.uom
          }
      };
      batch.set(traceEventInRef, traceEventIn as any);


      const onHandInId = makeOnHandId(output.itemId, lotNumber, output.toLocationId);
      const onHandInRef = adminDb.collection('onHand').doc(onHandInId);
      batch.set(onHandInRef, {
        id: onHandInId,
        itemId: output.itemId,
        lotNumber: lotNumber,
        locationId: output.toLocationId,
        qty: FieldValue.increment(output.qty),
        uom: output.uom,
        qcStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    // 3. Actualizar la orden de producción a 'DONE'
    const orderRef = adminDb.collection('productionOrders').doc(orderId);
    batch.update(orderRef, {
      status: 'DONE',
      completedAt: now,
      updatedAt: now,
      // Opcional: guardar el consumo y producción final real en la orden
      finalOutputs: finalOutputs,
      finalConsumptions: finalConsumptions,
    });
    
    // 4. Ejecutar todas las operaciones en una sola transacción
    await batch.commit();

    return ok({ orderId, lotNumbers: newLotNumbers });

  } catch (error: any) {
    console.error("Error al completar la orden de producción:", error);
    return fail(error.message || "Ocurrió un error inesperado en el servidor.");
  }
}

// ============================================================================
// OTRAS ACCIONES (Mantenidas para operaciones específicas)
// ============================================================================

export async function addIncident(input: { orderId: string; severity: 'LOW'|'MEDIUM'|'HIGH'; summary: string; details?: string; }) {
  const { orderId, ...data } = input;
  try {
    const orderRef = adminDb.collection('productionOrders').doc(orderId);
    await orderRef.update({
      incidents: FieldValue.arrayUnion({ id: `inc_${Date.now()}`, at: new Date().toISOString(), ...data }),
      updatedAt: new Date().toISOString(),
    });
    return ok({ orderId, incidentId: `inc_${Date.now()}` });
  } catch (e:any) { 
    return fail('No se pudo registrar la incidencia.');
  }
}


// ... El resto de funciones como planProduction y previewPlanning se mantienen aquí ...
// (Omitido por brevedad, no hay cambios en ellas)
async function reads() {
    const db = adminDb;
    return {
        getOne: async (collection: string, id: string): Promise<any> => {
            const doc = await db.collection(collection).doc(id).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        },
        getManyByIds: async (collection: string, ids: string[]): Promise<any[]> => {
            if (!ids || ids.length === 0) return [];
            const snaps = await db.collection(collection).where(FieldPath.documentId(), 'in', ids).get();
            return snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
    };
}
async function readAll(collection: string): Promise<any[]> {
    const snap = await adminDb.collection(collection).get();
    return snap.docs.map(d => d.data());
}
async function readBOM(bomId: string): Promise<any> {
    const { getOne } = await reads();
    if (!getOne) throw new Error("readBOM no disponible");
    return await getOne('billOfMaterials', bomId);
}

export async function previewPlanning(input: {
  bomId: string;
  plannedQty: number;
  alcoholStrengthForAdjustment?: number; // % v/v del alcohol corrector (por defecto 96)
}): Promise<ActionResult<{
  stage: 'PRODUCCION'|'ENVASADO';
  baseUnit: 'L'|'uds';
  outputItemId: string;
  nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }>;
  allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number; locationId: string; }>;
  shortages: Array<{ itemId: string; uom: Uom; required: number; available: number; missing: number }>;
  lotNumberPlanned: string;
  spec?: { abv?: { min?: number; max?: number }; acidity?: { min?: number; max?: number }; sugar?: { min?: number; max?: number } };
  estimates: any;
  suggestions: any[];
  inSpec: boolean;
}>> {
  try {
    const { bomId, plannedQty, alcoholStrengthForAdjustment = 96 } = input;
    if (!bomId || plannedQty <= 0) return fail("Falta BOM o cantidad inválida.");

    const bom = await readBOM(bomId);
    if (!bom) return fail("BOM inexistente.");

    const stage: 'PRODUCCION'|'ENVASADO' = bom.stage ?? 'PRODUCCION';
    const baseUnit: 'L'|'uds' = (stage === 'PRODUCCION' ? 'L' : 'uds');

    const nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }> =
      (bom.items || []).map((it: any) => ({
        itemId: it.itemId,
        role: (it.role ?? 'FORMULA') as 'FORMULA'|'PACKAGING'|'COST_ONLY',
        uom: (it.uom ?? baseUnit) as Uom,
        qty: Number(((it.qty ?? 0) * plannedQty).toFixed(6)),
      }));

    const onHand: Array<{itemId:string; lotNumber:string; qty:number; uom:Uom; receivedAt?:string; createdAt:string; locationId: string;}> = await readAll("onHand") as any;
    const allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number; locationId: string; }> = [];
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
          if (!lot.lotNumber) {
            console.warn(`fifoReserveLots: OnHand item for item ${lot.itemId} has no lotNumber.`);
            continue;
          }
          allocations.push({ itemId: line.itemId, lotNumber: lot.lotNumber, uom: lot.uom, qty: take, locationId: lot.locationId });
          remaining -= take;
        }
        available += lot.qty;
      }
      if (remaining > 0) {
        shortages.push({ itemId: line.itemId, uom: line.uom, required: line.qty, available, missing: line.qty - available });
      }
    }

    const est: any = {};
    const spec = bom.spec;
    const sugg: any[] = [];
    const inSpec: boolean = true; 
    const lotNumberPlanned = `SB-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-MAIN-${Math.floor(Math.random()*900+100)}`;

    return ok({
      stage, baseUnit, outputItemId: bom.outputItemId,
      nominal, allocations, shortages, lotNumberPlanned,
      spec, estimates: est, suggestions: sugg, inSpec
    });
  } catch (e:any) {
    return fail('No se pudo previsualizar la planificación.', { code: e?.code });
  }
}

export async function planProduction(input: unknown): Promise<ActionResult<{ order: ProductionOrder }>> {
    const zPlan = z.object({
        bomId: z.string().min(1),
        qty: z.coerce.number().positive().optional(),
        plannedQty: z.coerce.number().positive().optional(),
        plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        name: z.string().optional(),
        reservations: z.array(z.object({
          itemId: z.string(), lotNumber: z.string(), uom: z.string(), qty: z.number().positive(), locationId: z.string()
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
