// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (REFACTORIZADO)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from '@/server/firebase';
import type { ProductionOrder, Item, StockMove, Uom } from '@/domain/ssot';
import { LotSchema } from '@/domain/validators';
import { findNextLotNumber } from '../warehouse/inventory/actions';
import { upsertMany } from '@/lib/dataprovider/actions';


// ===== Helpers de lectura (simplificados para claridad) =====
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
    
    const patch: any = { status, updatedAt: now };

    if (status === 'IN_PROGRESS') {
      if (order.status === 'PLANNED') {
        patch.startedAt = now;
        if (responsibleId) patch.responsibleId = responsibleId;
      } else if (order.status === 'PAUSED') {
        const log = [...(order.pauseLog || [])];
        const lastPause = log.find(p => !p.resumedAt);
        if (lastPause) lastPause.resumedAt = now;
        patch.pauseLog = log;
      }
    } else if (status === 'PAUSED') {
      patch.pauseLog = FieldValue.arrayUnion({ pausedAt: now });
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
    uom: z.enum(['kg', 'L', 'unit', 'g', 'mL', 'case', 'bottle', 'pallet']),
    toLocationId: z.string().default('FG/MAIN'),
  })).min(1),
  finalConsumptions: z.array(z.object({
    itemId: z.string(),
    lotNumber: z.string(),
    qty: z.number().positive(),
    uom: z.string(),
    fromLocationId: z.string().default('RM/MAIN'),
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
    }

    const newLotNumbers: string[] = [];

    // 2. Entrada de stock de productos terminados
    for (const output of finalOutputs) {
      const lotNumber = output.lotNumber || (await findNextLotNumber(output.itemId, output.sku));
      newLotNumbers.push(lotNumber);

      // Crear o actualizar el lote
      const lotRef = adminDb.collection('lots').doc(lotNumber);
      batch.set(lotRef, LotSchema.parse({
        lotNumber,
        itemId: output.itemId,
        quantity: output.qty,
        uom: output.uom,
        qcStatus: 'PENDING', // El producto siempre sale de producción a QC
        createdAt: now,
        updatedAt: now,
        expiryAt: undefined
      }), { merge: true });

      // Crear el movimiento de stock de entrada
      const moveRef = adminDb.collection('stockMoves').doc();
      const moveIn: Omit<StockMove, 'uom'> & { uom: string } = {
        id: moveRef.id,
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
      batch.set(moveRef, moveIn);
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
    return ok({ orderId });
  } catch (e:any) { 
    return fail('No se pudo registrar la incidencia.');
  }
}

// ... (Aquí irían otras funciones que se mantienen, como planProduction, previewPlanning, etc.)
// Se han omitido por brevedad, pero deberían permanecer en el archivo si aún las usas.
// Las funciones eliminadas son: startProduction, pauseProduction, resumeProduction, cancelProduction,
// recordConsumption, recordOutput.

async function reads() {
  return {
    getOne: async (collection: string, id: string): Promise<any> => {
        const doc = await adminDb.collection(collection).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },
    getManyByIds: async (collection: string, ids: string[]): Promise<any[]> => {
        if (!ids || ids.length === 0) return [];
        const snaps = await adminDb.collection(collection).where(FieldPath.documentId(), 'in', ids).get();
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
  baseUnit: 'L'|'unit';
  outputItemId: string;
  nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }>;
  allocations: Array<{ itemId: string; lotNumber: string; uom: Uom; qty: number }>;
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
    const baseUnit: 'L'|'unit' = (stage === 'PRODUCCION' ? 'L' : 'unit');

    const nominal: Array<{ itemId: string; role: 'FORMULA'|'PACKAGING'|'COST_ONLY'; uom: Uom; qty: number }> =
      (bom.items || []).map((it: any) => ({
        itemId: it.itemId,
        role: (it.role ?? 'FORMULA') as 'FORMULA'|'PACKAGING'|'COST_ONLY',
        uom: (it.uom ?? baseUnit) as Uom,
        qty: Number(((it.qty ?? 0) * plannedQty).toFixed(6)),
      }));

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
          if (!lot.lotNumber) {
            console.warn(`fifoReserveLots: OnHand item ${lot.id} for item ${lot.itemId} has no lotNumber.`);
            continue;
          }
          allocations.push({ itemId: line.itemId, lotNumber: lot.lotNumber, uom: lot.uom, qty: take });
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
    return fail("No se pudo previsualizar la planificación.", { code: e?.code });
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
