// src/server/actions/warehouse.actions.ts
"use server";

import { adminDb as db } from '@/server/firebase';
import { DEFAULT_LOCATION } from '@/config/locations';
import { LotService } from '@/services/canonical';
import { normalizeTs } from '@/lib/dates';
import { z } from 'zod';

// ==== SCHEMAS (ajusta si ya los tienes centralizados) ====
const CreateInboundLine = z.object({
  itemId: z.string(),
  qty: z.number().positive(),
  uom: z.string(),
  toLocationId: z.string(),
  lotCode: z.string().optional(), // canónico (puede venir predefinido)
  supplierId: z.string().optional(),
  externalLot: z.string().optional(),
});

export type CreateInboundLine = z.infer<typeof CreateInboundLine>;

// ==== UTIL ====
const onHandId = (itemId: string, lotCode: string, locationId: string) =>
  `${itemId}::${lotCode}::${locationId}`;

// ==== ACCIONES ====

/**
 * Crea un movimiento de recepción + lote si no existe, robusto a tx = null.
 * Recomendado: elevar esto a una única runTransaction que englobe todo (SSOT v2).
 */
export async function createInboundMove(line: CreateInboundLine, userId: string) {
  const parsed = CreateInboundLine.safeParse(line);
  if (!parsed.success) {
    return { ok: false as const, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  const { itemId, qty, uom, toLocationId } = parsed.data;
  let { lotCode } = parsed.data;

  const itemSnap = await db.collection('items').doc(itemId).get();
  if (!itemSnap.exists) return { ok: false as const, error: 'ITEM_NOT_FOUND' };
  const item = itemSnap.data()!;

  // Generar lotCode si no viene
  if (!lotCode) {
    lotCode = await LotService.generateLotCode(null, { plant: 'SB', line: 'L1' });
  }

  const now = new Date();

  // Ejecutar en una transacción para atomicidad "SSOT-like"
  const result = await db.runTransaction(async (tx) => {
    // Lote: usa doc() autogenerado; guarda lotCode como campo
    const lotQuery = await tx.get(
      db.collection('lots').where('lotCode', '==', lotCode).limit(1)
    );
    let lotRef = lotQuery.empty ? db.collection('lots').doc() : lotQuery.docs[0].ref;

    if (lotQuery.empty) {
      // Compat con schema antiguo: setear lotNumber también si sigue existiendo en validación
      const lotData = {
        id: lotRef.id,
        lotCode,
        lotNumber: lotCode, // ← compat Zod legacy
        itemId,
        quantity: qty,
        uom,
        qcStatus: 'PENDING',
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        supplierId: parsed.data.supplierId,
        externalLot: parsed.data.externalLot,
        schemaVersion: 1,
      };
      tx.set(lotRef, lotData);
    }

    // StockMove
    const stockMoveRef = db.collection('stockMoves').doc();
    tx.set(stockMoveRef, {
      id: stockMoveRef.id,
      itemId,
      lotCode,
      qty,
      uom,
      reason: 'RECEIPT',
      fromLocationId: 'SUPPLIER_VIRTUAL',
      toLocationId,
      occurredAt: now,
      createdAt: now,
      userId,
      schemaVersion: 1,
    });

    // OnHand inicial en HOLD (si tu flujo lo requiere aquí; si no, hazlo en el QC)
    const onHandRef = db.collection('onHand').doc(onHandId(itemId, lotCode, toLocationId));
    const onHandSnap = await tx.get(onHandRef);
    if (!onHandSnap.exists) {
      tx.set(onHandRef, {
        id: onHandRef.id,
        itemId,
        lotCode,
        locationId: toLocationId,
        qty: { RELEASED: 0, HOLD: qty, REJECTED: 0 },
        reservedQty: { RELEASED: 0 },
        totalQty: qty,
        availableQty: 0,
        updatedAt: now,
        updatedBy: userId,
        schemaVersion: 1,
      });
    } else {
      const cur = onHandSnap.data()!;
      const newHold = (cur?.qty?.HOLD ?? 0) + qty;
      const next = {
        ...cur,
        qty: { RELEASED: cur?.qty?.RELEASED ?? 0, HOLD: newHold, REJECTED: cur?.qty?.REJECTED ?? 0 },
        totalQty: (cur?.qty?.RELEASED ?? 0) + newHold + (cur?.qty?.REJECTED ?? 0),
        availableQty: (cur?.qty?.RELEASED ?? 0) - (cur?.reservedQty?.RELEASED ?? 0),
        updatedAt: now,
        updatedBy: userId,
      };
      tx.set(onHandRef, next, { merge: true });
    }

    return { stockMoveId: stockMoveRef.id, lotCode };
  });

  return { ok: true as const, value: result };
}

// ========= Otros puntos donde usabas toDate() =========

export async function getWarehouseProducts() {
  const snapshot = await db.collection('items').get();
  const products = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      createdAt: normalizeTs(data.createdAt),
      updatedAt: normalizeTs(data.updatedAt),
    };
  });
  return products;
}

// Legacy function compatibility
export async function createGoodsReceiptFromSchema(input: any): Promise<{ success: boolean; receiptId: string; error?: string }> {
  try {
    const userId = 'SYSTEM'; // Fallback user
    const result = await createInboundMove({
      itemId: input.itemId || '',
      qty: input.quantity || 0,
      uom: input.uom || 'unit',
      toLocationId: input.toLocationId || DEFAULT_LOCATION,
      lotCode: input.lotCode,
      supplierId: input.supplierId,
      externalLot: input.externalLot,
    }, userId);
    
    if (result.ok) {
      return {
        success: true,
        receiptId: result.value.stockMoveId,
      };
    } else {
      return {
        success: false,
        receiptId: '',
        error: result.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      receiptId: '',
      error: error.message || 'Unknown error occurred',
    };
  }
}
