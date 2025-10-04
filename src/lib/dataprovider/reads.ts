// src/server/actions/inventory.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { StockMove, Item, QcStatus, SantaData, Uom } from '@/domain/ssot';
import { makeOnHandId } from '@/domain/id-helpers';
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/result";
import { LotSchema } from '@/domain/validators';
import { runDataQualityEngine } from "@/lib/data-quality/engine";


const CreateManualOnHandSchema = z.object({
  itemId: z.string().min(1),
  lotNumber: z.string().optional(),
  qty: z.number().positive(),
  uom: z.string().min(1),
  locationId: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  note: z.string().optional(),
  supplier: z.string().optional(),
  invoiceRef: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().default("EUR").optional(),
  sendToQc: z.boolean().default(false),
});

type CreateManualPayload = z.infer<typeof CreateManualOnHandSchema>;

// --- Helpers ---
function simpleId(prefix="sm"): string {
  const r = Math.random().toString(36).slice(2,10);
  return `${prefix}_${r}`;
}

function lotPrefixFromSku(sku?: string, fallback?: string) {
  const base = (sku || fallback || 'LOT').trim().toUpperCase();
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${base}-${yy}${mm}-`;
}

export async function findNextLotNumber(itemId: string, sku?: string): Promise<string> {
  const prefix = lotPrefixFromSku(sku, itemId);
  const lotsColl = db.collection('lots');
  // Rango por prefijo: >= prefix y < prefix con 'z' (lexicográfico)
  const snap = await lotsColl
    .where('lotNumber', '>=', prefix)
    .where('lotNumber', '<', `${prefix}z`)
    .select('lotNumber')
    .get();

  let maxSeq = 0;
  snap.forEach(doc => {
    const ln = String(doc.get('lotNumber') || '');
    const tail = ln.slice(prefix.length);     // “XX”
    const n = parseInt(tail.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  });

  const next = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${next}`;                  // SKU-YYMM-XX
}

async function loadItem(itemId: string): Promise<Item | null> {
    const doc = await db.collection('items').doc(itemId).get();
    return doc.exists ? (doc.data() as Item) : null;
}

function initialQcStatusFor(item: Item, opts: { sendToQc: boolean }): QcStatus {
  if (opts.sendToQc) return 'PENDING';
  const criticalCategories: (Item['category'] | undefined)[] = ['raw', 'pack', 'fg', 'intermediate'];
  return criticalCategories.includes(item.category) ? 'PENDING' : 'PASSED';
}

// --- Action Refactorizada y Corregida ---
export async function createManualOnHand(
  input: CreateManualPayload
): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  const parsed = CreateManualOnHandSchema.safeParse(input);
  if (!parsed.success) {
    return fail(`Datos inválidos: ${parsed.error.message}`);
  }
  const p = parsed.data;

  try {
    const item = await loadItem(p.itemId);
    if (!item) {
        return fail(`El producto con ID ${p.itemId} no existe.`);
    }

    let lotNumber = (p.lotNumber || "").trim();
    if (!lotNumber) {
      lotNumber = await findNextLotNumber(p.itemId, item.sku);
    }

    const occurredAtIso = p.occurredAt ? new Date(p.occurredAt).toISOString() : new Date().toISOString();
    const nowIso = new Date().toISOString();
    
    const lotData = LotSchema.parse({
      lotNumber: lotNumber,
      itemId: p.itemId,
      quantity: p.qty,
      uom: p.uom,
      qcStatus: initialQcStatusFor(item, { sendToQc: p.sendToQc }),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const stockMove = {
      id: simpleId("sm"),
      itemId: p.itemId,
      lotNumber,
      qty: p.qty,
      uom: p.uom,
      reason: "adjustment" as const,
      toLocationId: p.locationId,
      occurredAt: occurredAtIso,
      createdAt: nowIso,
      ref: { /* ... */ },
    };

    const batch = db.batch();
    
    const lotRef = db.collection('lots').doc(lotNumber);
    batch.set(lotRef, lotData, { merge: true });

    const stockMoveRef = db.collection('stockMoves').doc(stockMove.id);
    batch.set(stockMoveRef, stockMove as any);
    
    // --- Actualización de onHand ---
    const onHandId = makeOnHandId(p.itemId, lotNumber, p.locationId);
    const onHandRef = db.collection('onHand').doc(onHandId);

    batch.set(onHandRef, {
      id: onHandId,
      itemId: p.itemId,
      lotNumber: lotNumber,
      locationId: p.locationId,
      uom: p.uom,
      qty: FieldValue.increment(p.qty), // Incrementa el stock
      updatedAt: nowIso,
    }, { merge: true });
    // ------------------------------------

    await batch.commit();

    return ok({ stockMoveId: stockMove.id, lotNumber });

  } catch (error: any) {
    console.error("Error creando entrada manual de stock:", error);
     if (error instanceof z.ZodError) {
        return fail("Error de validación al crear el lote.", { fieldErrors: error.flatten().fieldErrors });
    }
    return fail(error.message || "Ocurrió un error inesperado en el servidor.");
  }
}

export async function exportReplenishmentCsvServer(replen: Record<string, number>) {
  const header = 'itemId,qty\n';
  const body = Object.entries(replen).filter(([, q]) => q > 0).map(([k, v]) => `${k},${v}`).join('\n');
  const csv = header + body + '\n';
  const base64 = Buffer.from(csv, 'utf8').toString('base64');
  return `data:text/csv;base64,${base64}`;
}


export async function rebuildOnHand(): Promise<ActionResult<{ count: number }>> {
  try {
    const onHandSnap = await db.collection('onHand').get();
    const batch = db.batch();
    onHandSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const movesSnap = await db.collection('stockMoves').get();
    const newOnHand: Record<string, any> = {};

    movesSnap.forEach(doc => {
      const move = doc.data() as StockMove;
      const { itemId, lotNumber, qty, uom, reason, fromLocationId, toLocationId, occurredAt } = move;
      
      if (!itemId || !lotNumber) return;

      const sign = (reason === 'receipt' || reason === 'production_in') ? 1 :
                   (reason === 'sale' || reason === 'production_out') ? -1 : 0;
      
      if (sign !== 0) {
        const locationId = sign > 0 ? toLocationId : fromLocationId;
        if (locationId) {
            const key = makeOnHandId(itemId, lotNumber, locationId);
            if (!newOnHand[key]) {
                newOnHand[key] = { itemId, lotNumber, locationId, qty: 0, uom, updatedAt: occurredAt };
            }
            newOnHand[key].qty += qty * sign;
            if (new Date(occurredAt) > new Date(newOnHand[key].updatedAt)) {
                newOnHand[key].updatedAt = occurredAt;
            }
        }
      }
      
      if(reason === 'transfer') {
        if(fromLocationId) {
             const key = makeOnHandId(itemId, lotNumber, fromLocationId);
             if(!newOnHand[key]) newOnHand[key] = { qty: 0 };
             newOnHand[key].qty -= qty;
        }
        if(toLocationId) {
             const key = makeOnHandId(itemId, lotNumber, toLocationId);
             if(!newOnHand[key]) newOnHand[key] = { qty: 0 };
             newOnHand[key].qty += qty;
        }
      }

    });

    const finalDocs = Object.values(newOnHand).filter(doc => doc.qty > 0);
    const writeBatch = db.batch();
    finalDocs.forEach(doc => {
      const ref = db.collection('onHand').doc(makeOnHandId(doc.itemId, doc.lotNumber, doc.locationId));
      writeBatch.set(ref, doc);
    });
    await writeBatch.commit();
    
    return ok({ count: finalDocs.length });
  } catch (e: any) {
    return fail(e.message || "Error al reconstruir el inventario.");
  }
}

export async function performDataQualityCheck() {
  try {
    const anomalies = await runDataQualityEngine();
    return { ok: true, data: anomalies };
  } catch (error) {
    console.error("Error en el Motor de Calidad de Datos:", error);
    return { ok: false, message: "No se pudo completar la auditoría." };
  }
}