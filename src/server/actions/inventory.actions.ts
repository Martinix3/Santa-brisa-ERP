// src/server/actions/inventory.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { LotService } from '@/services/canonical';
import { normalizeTs } from '@/lib/dates';
import { z } from 'zod';

const ManualOnHandSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),  // SSOT V2: Only itemId, no sku
  qty: z.number().positive(),
  uom: z.string(),
  locationId: z.string(),
  occurredAt: z.string().optional(),
  note: z.string().optional(),
  supplier: z.string().optional(),
  invoiceRef: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  sendToQc: z.boolean().optional(),
});

type ManualOnHandInput = z.infer<typeof ManualOnHandSchema>;

const onHandId = (itemId: string, lotCode: string, locationId: string) =>
  `${itemId}::${lotCode}::${locationId}`;

/**
 * SSOT V2 Compliant: Manual inventory adjustment with automatic lot generation
 * 
 * - Uses canonical itemId (not sku)
 * - Generates lotCode automatically using LotService (race-free)
 * - Creates lot, OnHand (HOLD bucket), StockMove, and TraceEvent atomically
 * - All operations within db.runTransaction()
 */
export async function createManualOnHand(payload: ManualOnHandInput, userId: string) {
  const parsed = ManualOnHandSchema.safeParse(payload);
  if (!parsed.success) {
    return { 
      ok: false as const, 
      error: 'INVALID_INPUT', 
      issues: parsed.error.issues 
    };
  }

  const { itemId, qty, uom, locationId, occurredAt, note, supplier, invoiceRef } = parsed.data;
  
  try {
    const result = await db.runTransaction(async (tx) => {
      const now = occurredAt ? new Date(occurredAt) : new Date();
      
      // 1. READ PHASE: Verify item exists
      const itemRef = db.collection('items').doc(itemId);
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists) {
        throw new Error(`Item not found: ${itemId}`);
      }
      
      // 2. WRITE PHASE: Use LotService to create lot with auto-generated lotCode
      // This will:
      // - Generate unique lotCode (YYJJJ-PL-SEQ format)
      // - Create lot record
      // - Create OnHand record in HOLD bucket
      const { lotId, lotCode } = await LotService.createLot(tx, {
        itemId,
        plant: 'SB',
        line: 'L1',
        quantity: qty,
        uom,
        locationId,
        supplierId: supplier,
        externalLot: invoiceRef,
        userId
      });
      
      // 3. Create StockMove
      const smRef = db.collection('stockMoves').doc();
      
      // Determinar fromLocationId según contexto
      let fromLocationId = 'VIRTUAL_MANUAL';
      if (supplier) {
        // Si hay proveedor, es una recepción de proveedor
        fromLocationId = `SUPPLIER:${supplier}`;
      } else if (invoiceRef) {
        // Si hay albarán pero no proveedor, usar el albarán
        fromLocationId = `RECEIPT:${invoiceRef}`;
      }
      
      tx.set(smRef, {
        id: smRef.id,
        itemId,
        lotCode,
        qty,
        uom,
        reason: 'ADJUSTMENT_POS',
        fromLocationId,
        toLocationId: locationId,
        occurredAt: now,
        createdAt: now,
        userId,
        note,
        supplier,
        invoiceRef,
        docRef: { type: 'ADJUSTMENT', id: smRef.id },
        schemaVersion: 1,
      });
      
      // 4. Create TraceEvent
      const teRef = db.collection('traceEvents').doc();
      tx.set(teRef, {
        id: teRef.id,
        kind: 'ADJUSTMENT_POS',
        occurredAt: now,
        createdAt: now,
        itemId,
        lotCode,
        qty,
        uom,
        toLocationId: locationId,
        docRef: { type: 'ADJUSTMENT', id: smRef.id },
        userId,
        note,
        schemaVersion: 1,
      });
      
      return { stockMoveId: smRef.id, lotCode, lotId };
    });

    return { ok: true as const, value: result };
  } catch (error: any) {
    console.error('[createManualOnHand] Error:', error);
    return { 
      ok: false as const, 
      error: error.message || 'Failed to create manual adjustment',
      issues: [{ message: error.message }]
    };
  }
}

// Ejemplo: listado de lots con fechas robustas
export async function listLotsSafe() {
  const snap = await db.collection('lots').orderBy('createdAt', 'desc').limit(100).get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      ...x,
      createdAt: normalizeTs(x.createdAt),
      updatedAt: normalizeTs(x.updatedAt),
    };
  });
}

// Legacy function compatibility
export async function rebuildOnHand(): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    // Simplified rebuild - just return success for now
    const snapshot = await db.collection('onHand').get();
    return { ok: true, count: snapshot.size };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Error rebuilding inventory' };
  }
}

export async function getInventorySnapshot(): Promise<any> {
  try {
    const [onHandSnap, itemsSnap, stockMovesSnap, lotsSnap] = await Promise.all([
      db.collection('onHand').get(),
      db.collection('items').get(),
      db.collection('stockMoves').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('lots').get(),
    ]);

    // Normalizar OnHand con soporte para SSOT v2 (buckets) y legacy
    const onHand = onHandSnap.docs.map((doc) => {
      const data = doc.data();
      
      // Normalizar qty a formato v2 si es necesario
      let normalizedQty = data.qty;
      if (typeof data.qty === 'number') {
        // Legacy format - asumir todo en RELEASED
        normalizedQty = {
          RELEASED: data.qty,
          HOLD: 0,
          REJECTED: 0
        };
      }
      
      // Normalizar reservedQty a formato v2 si es necesario
      let normalizedReservedQty = data.reservedQty;
      if (typeof data.reservedQty === 'number') {
        normalizedReservedQty = { RELEASED: data.reservedQty };
      } else if (typeof data.reserved === 'number') {
        normalizedReservedQty = { RELEASED: data.reserved };
      }
      
      return {
        ...data,
        qty: normalizedQty,
        reservedQty: normalizedReservedQty,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
      };
    });

    const items = itemsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
      };
    });

    const stockMoves = stockMovesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
        occurredAt: normalizeTs(data.occurredAt || data.date),
      };
    });

    // Normalizar Lots con campos SSOT v2
    const lots = lotsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        // Asegurar lotCode canónico (puede venir de lotNumber legacy)
        lotCode: data.lotCode || data.lotNumber,
        createdAt: normalizeTs(data.createdAt),
        updatedAt: normalizeTs(data.updatedAt),
        receivedAt: data.receivedAt ? normalizeTs(data.receivedAt) : undefined,
        expDate: data.expDate ? normalizeTs(data.expDate) : undefined,
        qcApprovedAt: data.qcApprovedAt ? normalizeTs(data.qcApprovedAt) : undefined,
        qcRejectedAt: data.qcRejectedAt ? normalizeTs(data.qcRejectedAt) : undefined,
        qcReviewStartedAt: data.qcReviewStartedAt ? normalizeTs(data.qcReviewStartedAt) : undefined,
      };
    });

    return {
      onHand,
      items,
      stockMoves,
      lots,
      alerts: [], // Simplified for now
    };
  } catch (error: any) {
    console.error('[getInventorySnapshot] Error:', error);
    return {
      onHand: [],
      items: [],
      stockMoves: [],
      lots: [],
      alerts: [],
    };
  }
}
