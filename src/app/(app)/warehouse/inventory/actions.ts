
'use server';

const runtime = 'nodejs'; // 🔧 Asegura que use Node (no edge)

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import type { StockMove, OnHandView, Uom, SantaData } from '@/domain/ssot';

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
  // tratados aparte:
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

// ⚙️ Chunks de 450 para ir holgados del límite de 500
async function commitInChunks(ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>) {
  const CHUNK = 450;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = db.batch();
    const slice = ops.slice(i, i + CHUNK);
    // cada op recibe el batch vía closure
    slice.forEach(fn => fn.call(undefined, batch));
    await batch.commit();
  }
}

export async function rebuildOnHand(input?: RebuildInput) {
  const dryRun = !!input?.dryRun;

  // 1) Leer todos los movimientos
  const mvSnap = await db.collection('stockMoves').get();
  const moves = mvSnap.docs.map(d => d.data() as any as StockMove);

  // 2) Normalizar y acumular
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

    if (DIRECT_SIGN[reason] && DIRECT_SIGN[reason] !== 0) {
      const loc = DIRECT_SIGN[reason] > 0 ? toLoc : fromLoc;
      add(loc, DIRECT_SIGN[reason] * qty);
    } else if (reason === 'transfer') {
      if (fromLoc) add(fromLoc, -qty);
      if (toLoc) add(toLoc, qty);
    } else if (reason === 'adjustment') {
      add(toLoc ?? fromLoc, qty);
    } else {
      // reserve/unreserve/no-op → no afectan onHand
    }
  }

  // Chequeo rápido: ¿hay algo que escribir?
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
    });
  }

  if (dryRun) {
    return {
      ok: true,
      ...stats,
      preview: rows.slice(0, 10), // primeras filas para inspección
      keys: rows.slice(0, 10).map(r => r.id),
    };
  }

  // 3) Borrar onHand actual en chunks
  const ohColl = db.collection('onHand');
  const existing = await ohColl.get();
  const deleteOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  existing.docs.forEach(doc => {
    deleteOps.push(function (this: any, batch: FirebaseFirestore.WriteBatch) {
      batch.delete(doc.ref);
    });
  });
  if (deleteOps.length) await commitInChunks(deleteOps);

  // 4) Escribir onHand nuevo en chunks
  const writeOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  for (const row of rows) {
    const ref = ohColl.doc(row.id);
    writeOps.push(function (this: any, batch: FirebaseFirestore.WriteBatch) {
      batch.set(ref, row as any, { merge: false });
    });
  }
  if (writeOps.length) await commitInChunks(writeOps);

  stats.written = rows.length;

  // 5) Revalidate (por si tienes segmentos server)
  revalidatePath('/warehouse/inventory');

  return { ok: true, ...stats };
}

// 🔍 Utilidad para inspeccionar lo que quedó escrito
export async function peekOnHand(limit = 10) {
  const snap = await db.collection('onHand').limit(limit).get();
  return {
    count: snap.size,
    docs: snap.docs.map(d => d.data()),
  };
}
