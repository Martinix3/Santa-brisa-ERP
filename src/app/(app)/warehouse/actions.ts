// src/app/(app)/warehouse/actions.ts
'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { upsertMany } from "@/lib/dataprovider/actions";
import { ok, fail, type ActionResult } from "@/lib/result";
import { adminDb as db } from '@/server/firebase';
import type { StockMove, OnHandView, Uom, SantaData } from '@/domain/ssot';


const CreateManualOnHandSchema = z.object({
  itemId: z.string().min(1),
  lotNumber: z.string().optional(),          // ← puede venir vacío
  qty: z.number().positive(),
  uom: z.string().min(1),
  locationId: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  note: z.string().optional(),
  supplier: z.string().optional(),           // texto o accountId
  invoiceRef: z.string().optional(),         // nº albarán/factura
  amount: z.number().nonnegative().optional(),
  currency: z.string().default("EUR").optional(),
  category: z.enum(["fg","raw","intermediate","pack","merch","consumable"]),
});

type CreateManualPayload = z.infer<typeof CreateManualOnHandSchema>;

// -------------------------
// Utils
// -------------------------
function simpleId(prefix="sm"): string {
  const r = Math.random().toString(36).slice(2,10);
  return `${prefix}_${r}`;
}
const pad2 = (n: number) => String(n).padStart(2, "0");

// Normaliza a “SKU-YYMM”
function lotPrefixFromSku(sku?: string) {
  const base = (sku || "SKU").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(2)}${pad2(d.getMonth()+1)}`;
  return `${base}-${yymm}`;
}

// TODO: CONECTAR con tu capa de lectura real.
// Devuelve el siguiente sufijo “01, 02, 03…” libre para un prefix dado.
async function findNextLotNumber(itemId: string, sku?: string): Promise<string> {
  const prefix = lotPrefixFromSku(sku);
  try {
    // —— EJEMPLOS de cómo podrías leer:
    // const lots = await listLotsByItem(itemId); // si tienes esta función
    // const candidates = lots
    //   .map(l => l.lotNumber)
    //   .filter((ln: string) => ln?.startsWith(prefix + "-"));
    // const taken = new Set(
    //   candidates.map(ln => Number(ln.split("-").pop() || "0")).filter(n => !isNaN(n))
    // );
    // for (let i = 1; i < 100; i++) {
    //   const sfx = pad2(i);
    //   if (!taken.has(i)) return `${prefix}-${sfx}`;
    // }
    // Fallback si hay más de 99: timestamp
    // return `${prefix}-${Date.now().toString().slice(-4)}`;
    
    // Si aún no tienes lectura, arranca por 01
    return `${prefix}-01`;
  } catch {
    // Fallback robusto
    return `${prefix}-01`;
  }
}

// Intenta evitar colisiones básicas si no tenemos lectura real
function bumpIfCollision(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = base.replace(/-\d{2}$/, `-${pad2(i)}`);
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString().slice(-4)}`;
}

// Si tienes items en memoria/SSOT accesibles en server, cárgalos aquí.
// Como placeholder, recibimos opcionalmente sku vía payload futuro.
// Para ahora, devolvemos undefined y dejamos que el prefix use “SKU”.
async function loadItemSku(itemId: string): Promise<string | undefined> {
  // TODO: Conectar con tu datastore si quieres un SKU real.
  return undefined;
}

// -------------------------
// Action principal
// -------------------------
export async function createManualOnHand(
  input: CreateManualPayload
): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  const parsed = CreateManualOnHandSchema.safeParse(input);
  if (!parsed.success) {
    return fail(`Datos inválidos: ${parsed.error.message}`);
  }
  const p = parsed.data;

  // 1) Lote (auto si falta)
  const sku = await loadItemSku(p.itemId);
  let lotNumber = (p.lotNumber || "").trim();
  if (!lotNumber) {
    lotNumber = await findNextLotNumber(p.itemId, sku);
  }

  // 2) Construir stockMove adjustment
  const stockMoveId = simpleId("sm");
  const occurredAtIso = p.occurredAt ? new Date(p.occurredAt).toISOString() : new Date().toISOString();

  const stockMove = {
    id: stockMoveId,
    itemId: p.itemId,
    lotNumber,
    qty: p.qty,
    uom: p.uom,
    reason: "adjustment",                 // clave neutra
    toLocation: p.locationId,              // entra en esta ubicación
    occurredAt: occurredAtIso,
    createdAt: new Date().toISOString(),
    ref: {
      source: "manual_new_onhand",
      invoiceRef: p.invoiceRef || undefined,
      supplier: p.supplier || undefined,
      amount: p.amount ?? undefined,
      currency: p.currency || "EUR",
      note: p.note || undefined,
      category: p.category,
    },
  };

  // 3) (Opcional) upsert del lote, si manejas colección lots
  const lot = {
    id: lotNumber,
    lotNumber,
    itemId: p.itemId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await upsertMany("lots", [lot as any]);
  } catch {
    // si no existe, no pasa nada
  }

  // 4) Guardar el movimiento
  await upsertMany("stockMoves", [stockMove as any]);

  // 5) Recalcular on-hand
  try {
    await rebuildOnHand();
  } catch {
    // si rebuild tiene su propio control de errores, ignoramos aquí
  }

  // 6) Revalidate UI
  revalidatePath("/warehouse");

  return ok({ stockMoveId, lotNumber });
}


type RebuildInput = { dryRun?: boolean };

const DIRECT_SIGN: Record<StockMove['reason'], number> = {
  receipt: +1,
  production_in: +1,
  return_in: +1,
  ship: -1,
  sale: -1,
  production_out: -1,
  return_out: -1,
  consignment_send: -1,
  consignment_sell: -1,
  consignment_return: +1,
  sample_send: -1,
  sample_consume: -1,
  transfer: 0,
  adjustment: 0,
  reserve: 0,
  unreserve: 0,
};

function sanitizeIdPart(s?: string | null) {
  if (!s) return '';
  return s.replace(/[\/.#$\[\]]/g, '_');
}

function key(itemId: string, lot?: string | null, loc?: string | null) {
  return [
    sanitizeIdPart(itemId),
    sanitizeIdPart(lot),
    sanitizeIdPart(loc),
  ].join('|');
}

function num(x: any): number {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : NaN;
}

async function commitInChunks(ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>) {
  const CHUNK = 450;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = db.batch();
    const slice = ops.slice(i, i + CHUNK);
    slice.forEach(fn => fn.call(undefined, batch));
    await batch.commit();
  }
}

export async function rebuildOnHand(input?: RebuildInput) {
  const dryRun = !!input?.dryRun;

  const mvSnap = await db.collection('stockMoves').get();
  const moves = mvSnap.docs.map(d => d.data() as any as StockMove);

  const acc = new Map<
    string,
    { qty: number; uom: Uom; itemId: string; lot?: string; loc?: string; createdAt?: string; updatedAt?: string }
  >();

  const stats = {
    read: moves.length,
    written: 0,
    discarded: 0,
    reasons: {} as Record<string, number>,
  };

  const bumpReason = (r: string) => (stats.reasons[r] = (stats.reasons[r] || 0) + 1);

  for (const m of moves) {
    const reason = (m as any).reason as StockMove['reason'];
    bumpReason(String(reason));

    const itemId = (m as any).itemId as string;
    const lot = (m as any).lotNumber ?? null;
    const uom = (m as any).uom as Uom;

    const rawQty = (m as any).qty;
    const qty = num(rawQty);
    if (!itemId || !uom || !Number.isFinite(qty)) { stats.discarded++; continue; }

    const fromLoc = (m as any).fromLocationId ?? (m as any).fromLocation ?? null;
    const toLoc   = (m as any).toLocationId   ?? (m as any).toLocation   ?? null;

    const occurredAt = (m as any).occurredAt || (m as any).createdAt || new Date().toISOString();
    const createdAt  = (m as any).createdAt  || occurredAt;

    function add(loc: string | null, delta: number) {
      const k = key(itemId, lot, loc);
      const prev = acc.get(k);
      const next = {
        qty: (prev?.qty ?? 0) + delta,
        uom,
        itemId,
        lot: lot ?? undefined,
        loc: (loc ?? undefined),
        createdAt: prev?.createdAt || createdAt,
        updatedAt: occurredAt,
      };
      acc.set(k, next);
    }

    if (DIRECT_SIGN[reason] !== 0) {
      const loc = DIRECT_SIGN[reason] > 0 ? toLoc : fromLoc;
      add(loc, DIRECT_SIGN[reason] * qty);
    } else if (reason === 'transfer') {
      if (fromLoc) add(fromLoc, -qty);
      if (toLoc) add(toLoc, qty);
    } else if (reason === 'adjustment') {
      add(toLoc ?? fromLoc, qty);
    }
  }

  const rows: OnHandView[] = [];
  for (const [id, v] of acc.entries()) {
    if (Math.abs(v.qty) < 1e-9) continue;
    rows.push({
      id,
      itemId: v.itemId,
      lotNumber: v.lot,
      locationId: v.loc,
      qty: Number(v.qty.toFixed(6)),
      uom: v.uom,
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString(),
    } as OnHandView);
  }

  if (dryRun) {
    return {
      ok: true,
      ...stats,
      preview: rows.slice(0, 10),
      keys: rows.slice(0, 10).map(r => r.id),
    };
  }

  const ohColl = db.collection('onHand');
  const existing = await ohColl.get();
  const deleteOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  existing.docs.forEach(doc => {
    deleteOps.push(function (this: any, batch: FirebaseFirestore.WriteBatch) {
      batch.delete(doc.ref);
    });
  });
  if (deleteOps.length) await commitInChunks(deleteOps);

  const writeOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  for (const row of rows) {
    const ref = ohColl.doc(row.id);
    writeOps.push(function (this: any, batch: FirebaseFirestore.WriteBatch) {
      batch.set(ref, row as any, { merge: false });
    });
  }
  if (writeOps.length) await commitInChunks(writeOps);

  stats.written = rows.length;
  revalidatePath('/warehouse/inventory');
  return { ok: true, ...stats };
}
