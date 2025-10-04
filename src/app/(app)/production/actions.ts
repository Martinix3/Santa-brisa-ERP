// ============================================================================
// src/app/(app)/production/actions.ts
// Server actions del módulo de Producción (REFACTORIZADO)
// ============================================================================

'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { upsertMany } from "@/lib/dataprovider/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from '@/server/firebase';
import type { Lot as SsotLot, Uom, ProductionOrder, BillOfMaterial as RecipeBom, OnHandView, Item, StockMove, TraceEvent, QcPlanBySku } from '@/domain/ssot';
import { LotSchema, type Lot } from '@/domain/validators';
import { explodeBOM } from '@/server/production/bom.service';
import { findNextLotNumber } from '@/server/actions/inventory.actions';
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
