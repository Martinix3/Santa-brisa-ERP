// ============================================================================
// src/server/actions/production.actions.ts (MOVED & REFACTORED)
// Server actions del módulo de Producción
// ============================================================================
'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/server";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from '@/server/firebase';
import type { Uom, ProductionOrder, BillOfMaterial as RecipeBom, TraceEvent, TraceEventKind, TraceEventPhase, Lot } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { explodeBOM } from '@/server/production/bom.service';
import { makeOnHandId } from '@/domain/id-helpers';
import { normalizeUom } from '@/domain/uom';

// ✅ FASE 1: Importar módulos de validación y trazabilidad
import { validateLotConsumption } from '@/lib/inventory-validation';
import { TraceEventFactory } from '@/lib/trace/TraceEventFactory';


// Si tienes estos tipos en tu SSOT, impórtalos desde '@/domain/ssot'.
// Aquí definimos mínimos para no romper si aún no están exportados.
type ProductionStage = 'PRODUCCION' | 'ENVASADO';
type ProductionStatus =
  | 'DRAFT' | 'PLANNED' | 'IN_PROGRESS'
  | 'PAUSED' | 'QC_HOLD'
  | 'DONE' | 'CANCELLED';
type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';

type TraceEventInput = {
  id: string;
  kind: TraceEventKind;
  phase: TraceEventPhase;
  title: string;
  details: string;
  links?: TraceEvent['links'];
  data?: Record<string, unknown>;
};

function makeTraceEvent(at: string, input: TraceEventInput): TraceEvent {
  return {
    id: input.id,
    at,
    phase: input.phase,
    kind: input.kind,
    title: input.title,
    details: input.details,
    links: input.links,
    data: input.data,
  };
}


type ProductionIOLine = { sku: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number };
type ProductionOutput = { sku: string; uom: Extract<Uom, 'L' | 'uds'>; qty: number; lotCode: string };
type Incident = { id: string; at: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string; details?: string };
type QcRecord = { status: QcStatus; measuredAt?: string; measuredById?: string; checks?: Array<{ name: string; value: number | string; pass?: boolean }>; remarks?: string };


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
      }
      // v7: no existe estado 'PAUSED'. Si lo necesitas, usa AuditLog o meta.
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
    sku: z.string(),
    lotCode: z.string().optional(),
    qty: z.number().positive(),
    uom: z.string(), // ✅ Permitir cualquier UOM string
    toLocationId: z.string().default('ALMACEN_TERMINADO'),
  })).min(1),
  finalConsumptions: z.array(z.object({
    sku: z.string(),
    lotCode: z.string(),
    qty: z.number().positive(),
    uom: z.string(), // ✅ Ya era string
    fromLocationId: z.string().default('ALMACEN_MATERIAS_PRIMAS'),
  })),
});

export async function completeProductionOrder(
  input: z.infer<typeof CompleteOrderSchema>
): Promise<ActionResult<{ orderId: string; lotNumbers: string[] }>> {
  try {
    console.log('[completeProductionOrder] Input recibido:', JSON.stringify(input, null, 2));

    const parsed = CompleteOrderSchema.safeParse(input);
    if (!parsed.success) {
      console.error('[completeProductionOrder] Error validación:', JSON.stringify(parsed.error.flatten()));
      return fail("Datos de cierre inválidos: " + JSON.stringify(parsed.error.flatten()));
    }

    const { orderId, finalOutputs, finalConsumptions } = parsed.data;

    // ✅ SSOT COMPLIANCE: Normalizar UOMs en outputs y consumptions
    const normalizedOutputs = finalOutputs.map(o => ({ ...o, uom: normalizeUom(o.uom) }));
    const normalizedConsumptions = finalConsumptions.map(c => ({ ...c, uom: normalizeUom(c.uom) }));

    const now = new Date().toISOString();

    console.log('[completeProductionOrder] Leyendo orden:', orderId);
    const order = await readOrder(orderId);
    if (!order) {
      console.error('[completeProductionOrder] Orden no encontrada');
      return fail("La orden de producción no existe.");
    }
    if (order.status === 'DONE' || order.status === 'CANCELLED') {
      console.error('[completeProductionOrder] Orden ya cerrada:', order.status);
      return fail("La orden ya está finalizada o cancelada.");
    }

    console.log('[completeProductionOrder] Iniciando batch para orden:', order.code || orderId);
    // Inicia un batch para asegurar que todas las operaciones sean atómicas
    const batch = adminDb.batch();
    const consumptionMeta: Array<{ sku: string; lotCode: string; qty: number; uom: Uom; fromLocationId: string }> = [];
    // 1. Salida de stock de materias primas consumidas
    for (const consumption of normalizedConsumptions) {
      const qty = Math.abs(consumption.qty);
      const onHandOutId = makeOnHandId(consumption.sku, consumption.lotCode, consumption.fromLocationId);
      const onHandOutRef = adminDb.collection('onHand').doc(onHandOutId);
      const onHandSnap = await onHandOutRef.get();
      if (!onHandSnap.exists) {
        console.error('[completeProductionOrder] OnHand inexistente:', onHandOutId);
        return fail(`No hay stock registrado para el lote ${consumption.lotCode} en ${consumption.fromLocationId}.`);
      }
      const onHandData = onHandSnap.data() as any;

      // ✅ FASE 1: Validación robusta usando validateLotConsumption
      const lotForValidation: Lot = {
        id: consumption.lotCode,
        lotNumber: consumption.lotCode,
        itemId: consumption.sku,
        itemName: onHandData.itemName,
        quantity: Number(onHandData.qty ?? 0),
        uom: consumption.uom,
        qcStatus: onHandData.qcStatus ?? 'PENDING',
        createdAt: onHandData.createdAt ?? now,
        updatedAt: now
      };

      try {
        validateLotConsumption(lotForValidation);
      } catch (validationError: any) {
        console.error('[completeProductionOrder] Validación QC falló:', validationError.message);
        return fail(validationError.message);
      }

      const availableQty = Number(onHandData.qty ?? 0);
      if (availableQty + 1e-6 < qty) {
        console.error('[completeProductionOrder] Stock insuficiente', { availableQty, requested: qty, onHandOutId });
        return fail(`Stock insuficiente del lote ${consumption.lotCode}. Disponible ${availableQty}, requerido ${qty}.`);
      }

      // Crear movimiento de stock
      const moveRef = adminDb.collection('stockMoves').doc();
      const move: any = {
        id: moveRef.id,
        sku: consumption.sku,
        lotCode: consumption.lotCode,
        qty: -qty,
        uom: consumption.uom,
        reason: 'CONSUMPTION',
        fromLocationId: consumption.fromLocationId,
        occurredAt: now,
        createdAt: now,
      };
      batch.set(moveRef, move);

      // ✅ FASE 1: Usar TraceEventFactory en lugar de creación manual
      const itemName = onHandData.itemName || consumption.sku;
      const traceEvent = await TraceEventFactory.logProductionConsume({
        prodOrderId: orderId,
        lotNumber: consumption.lotCode,
        itemId: consumption.sku,
        itemName,
        quantity: qty,
        uom: consumption.uom,
        data: {
          orderId,
          orderCode: order.code ?? orderId,
          locationId: consumption.fromLocationId,
        }
      });

      batch.update(onHandOutRef, { qty: FieldValue.increment(-qty), updatedAt: now });
      consumptionMeta.push({
        sku: consumption.sku,
        lotCode: consumption.lotCode,
        qty,
        uom: consumption.uom,
        fromLocationId: consumption.fromLocationId,
      });
    }

    const newLotNumbers: string[] = [];
    const outputMeta: Array<{ sku: string; lotCode: string; qty: number; uom: Uom; toLocationId: string }> = [];

    // 2. Entrada de stock de productos terminados
    for (const output of normalizedOutputs) {
      const lotCode = output.lotCode || `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      newLotNumbers.push(lotCode);

      // ✅ Solo buscar qcPlan si tenemos SKU
      let qcPlanId: string | undefined = undefined;
      if (output.sku) {
        const qcPlanSnap = await adminDb.collection('qcPlans').where('sku', '==', output.sku).limit(1).get();
        qcPlanId = qcPlanSnap.empty ? undefined : qcPlanSnap.docs[0].id;
      }

      // Crear o actualizar el lote (sin usar LotSchema.parse ya que tenemos campos extra)
      const lotRef = adminDb.collection('lots').doc(lotCode);
      batch.set(lotRef, {
        id: lotCode,
        lotNumber: lotCode,
        itemId: output.sku,
        sku: output.sku, // Compatibilidad
        itemName: output.sku, // TODO: Obtener nombre real del item
        quantity: output.qty,
        uom: output.uom,
        qcStatus: 'PENDING' as QcStatus, // El producto siempre sale de producción a QC
        qcPlanId: qcPlanId,
        producedByOrderId: orderId,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });

      // Crear el movimiento de stock de entrada
      const moveInRef = adminDb.collection('stockMoves').doc();
      const moveIn: any = {
        id: moveInRef.id,
        sku: output.sku,
        lotCode: lotCode,
        qty: output.qty,
        uom: output.uom,
        reason: 'PRODUCTION',
        toLocationId: output.toLocationId,
        occurredAt: now,
        createdAt: now,
      };
      batch.set(moveInRef, moveIn);

      // ✅ FASE 1: Usar TraceEventFactory.logProductionOutput()
      await TraceEventFactory.logProductionOutput({
        prodOrderId: orderId,
        newLotNumber: lotCode,
        itemId: output.sku,
        itemName: output.sku, // TODO: Obtener nombre del item
        quantity: output.qty,
        uom: output.uom,
        qcStatus: 'PENDING',
        data: {
          orderCode: order.code ?? orderId,
          toLocationId: output.toLocationId,
        }
      });


      const onHandInId = makeOnHandId(output.sku, lotCode, output.toLocationId);
      const onHandInRef = adminDb.collection('onHand').doc(onHandInId);
      batch.set(onHandInRef, {
        id: onHandInId,
        sku: output.sku,
        lotCode: lotCode,
        locationId: output.toLocationId,
        qty: FieldValue.increment(output.qty),
        uom: output.uom,
        qcStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      outputMeta.push({
        sku: output.sku,
        lotCode,
        qty: output.qty,
        uom: output.uom,
        toLocationId: output.toLocationId,
      });
    }

    // 3. Registrar genealogía usando TraceEventFactory
    if (consumptionMeta.length && outputMeta.length) {
      const childLotNumbers = outputMeta.map((o) => o.lotCode);
      const parentLotNumbers = consumptionMeta.map((c) => c.lotCode);

      // ✅ FASE 1: Usar TraceEventFactory.logGenealogy() para eventos PARENT
      for (const parent of consumptionMeta) {
        await TraceEventFactory.logGenealogy({
          parentLotNumber: parent.lotCode,
          childLotNumber: childLotNumbers[0], // Primer hijo
          relationship: 'PARENT',
          prodOrderId: orderId,
          quantity: parent.qty,
          uom: parent.uom,
          data: {
            childLots: childLotNumbers,
            allChildrenCount: childLotNumbers.length
          }
        });
      }

      // ✅ FASE 1: Usar TraceEventFactory.logGenealogy() para eventos CHILD
      for (const child of outputMeta) {
        await TraceEventFactory.logGenealogy({
          parentLotNumber: parentLotNumbers[0], // Primer padre
          childLotNumber: child.lotCode,
          relationship: 'CHILD',
          prodOrderId: orderId,
          quantity: child.qty,
          uom: child.uom,
          data: {
            parentLots: parentLotNumbers,
            allParentsCount: parentLotNumbers.length
          }
        });
      }
    }

    const plannedQty = Number(order.targetQuantity ?? order.outputQty ?? 0);
    const totalOutputQty = outputMeta.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalConsumedQty = consumptionMeta.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const deviationQty = plannedQty > 0 ? totalOutputQty - plannedQty : 0;
    const deviationPct = plannedQty > 0 && Math.abs(plannedQty) > 1e-6 ? (deviationQty / plannedQty) * 100 : 0;
    const productionSummary = {
      plannedQty,
      totalOutputQty,
      totalConsumedQty,
      deviationQty,
      deviationPct,
      recordedAt: now,
    };

    const orderRef = adminDb.collection('productionOrders').doc(orderId);
    batch.update(orderRef, {
      status: 'DONE',
      completedAt: now,
      updatedAt: now,
      // ✅ Guardar con UOMs normalizados
      finalOutputs: normalizedOutputs,
      finalConsumptions: normalizedConsumptions,
      productionSummary,
    });

    // 4. Ejecutar todas las operaciones en una sola transacción
    await batch.commit();

    return ok({ orderId, lotNumbers: newLotNumbers });

  } catch (error: any) {
    console.error("[completeProductionOrder] Error inesperado:", error);
    console.error("[completeProductionOrder] Stack:", error?.stack);
    return fail(`Error al completar: ${error?.message || JSON.stringify(error) || 'Desconocido'}`);
  }
}

// ============================================================================
// OTRAS ACCIONES (Mantenidas para operaciones específicas)
// ============================================================================

export async function addIncident(input: { orderId: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string; details?: string; }) {
  const { orderId, ...data } = input;
  try {
    const orderRef = adminDb.collection('productionOrders').doc(orderId);
    await orderRef.update({
      incidents: FieldValue.arrayUnion({ id: `inc_${Date.now()}`, at: new Date().toISOString(), ...data }),
      updatedAt: new Date().toISOString(),
    });
    return ok({ orderId, incidentId: `inc_${Date.now()}` });
  } catch (e: any) {
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
  stage: 'PRODUCCION' | 'ENVASADO';
  baseUnit: Uom; // ✅ Cambiado de 'L'|'uds' a Uom para soportar normalización
  outputItemId: string;
  nominal: Array<{ sku: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number }>;
  allocations: Array<{ sku: string; lotCode: string; uom: Uom; qty: number; locationId: string; }>;
  shortages: Array<{ sku: string; uom: Uom; required: number; available: number; missing: number }>;
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

    const stage: 'PRODUCCION' | 'ENVASADO' = bom.stage ?? 'PRODUCCION';
    // ✅ SSOT COMPLIANCE: Normalizar 'uds' -> 'UNIT' según UOM_ALIASES
    const baseUnit: Uom = normalizeUom(stage === 'PRODUCCION' ? 'L' : 'uds');

    const nominal: Array<{ sku: string; role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; uom: Uom; qty: number }> =
      (bom.items || []).map((it: any) => ({
        sku: it.sku || it.itemId,
        role: (it.role ?? 'FORMULA') as 'FORMULA' | 'PACKAGING' | 'COST_ONLY',
        uom: normalizeUom(it.uom ?? baseUnit),
        qty: Number(((it.qty ?? 0) * plannedQty).toFixed(6)),
      }));

    const onHand: Array<{ sku: string; lotCode: string; qty: number; uom: Uom; receivedAt?: string; createdAt: string; locationId: string; }> = await readAll("onHand") as any;
    const allocations: Array<{ sku: string; lotCode: string; uom: Uom; qty: number; locationId: string; }> = [];
    const shortages: Array<{ sku: string; uom: Uom; required: number; available: number; missing: number }> = [];

    for (const line of nominal.filter((l: any) => l.role !== 'COST_ONLY')) {
      let remaining = line.qty;
      let available = 0;
      const lots = (onHand as any[])
        .filter((l: any) => l.sku === line.sku && l.qty > 0)
        .sort((a: any, b: any) => new Date(a.receivedAt || a.createdAt).getTime() - new Date(b.receivedAt || b.createdAt).getTime());

      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(Number(lot.qty) || 0, remaining);
        if (take > 0) {
          if (!lot.lotCode) {
            console.warn(`fifoReserveLots: OnHand item for item ${lot.itemId} has no lotCode.`);
            continue;
          }
          allocations.push({ sku: line.sku, lotCode: lot.lotCode, uom: normalizeUom(lot.uom), qty: take, locationId: lot.locationId });
          remaining -= take;
        }
        available += lot.qty;
      }
      if (remaining > 0) {
        shortages.push({ sku: line.sku, uom: normalizeUom(line.uom), required: line.qty, available, missing: line.qty - available });
      }
    }

    const est: any = {};
    const spec = bom.spec;
    const sugg: any[] = [];
    const inSpec: boolean = true;
    const lotNumberPlanned = `SB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-MAIN-${Math.floor(Math.random() * 900 + 100)}`;

    return ok({
      stage, baseUnit, outputItemId: bom.outputItemId,
      nominal, allocations, shortages, lotNumberPlanned,
      spec, estimates: est, suggestions: sugg, inSpec
    });
  } catch (e: any) {
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
      sku: z.string(), lotCode: z.string(), uom: z.string(), qty: z.number().positive(), locationId: z.string()
    })).optional(),
    idempotencyKey: z.string().uuid().optional(),
  }).refine((v: any) => (v.qty ?? v.plannedQty) != null, { message: "qty o plannedQty requerido" });

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
      lotCode: prev.data.lotNumberPlanned,
      createdAt: now,
      createdById: 'auto',
      idempotency: idempotencyKey ? [idempotencyKey] : []
    };

    await upsertMany('productionOrders', [po as any]);
    return ok({ order: po as ProductionOrder });
  } catch (e: any) {
    return fail('No se pudo planificar la orden.', { code: e?.code, retryable: true });
  }
}
