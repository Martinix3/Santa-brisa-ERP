
// src/app/(app)/warehouse/actions.ts
'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { upsertMany } from "@/lib/dataprovider/actions";
import { ok, fail, type ActionResult } from "@/lib/result";
import { adminDb as db } from '@/server/firebase';
import type { StockMove, OnHandView, Uom, SantaData, QcStatus } from '@/domain/ssot';


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
  sendToQc: z.boolean().default(false),
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
  const yymm = `${String(d.getFullYear()).slice(-2)}${pad2(d.getMonth() + 1, 2)}`;
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

function initialQcStatusFor(item?: { requiresQc?: boolean }, opts?: { sendToQc?: boolean }): QcStatus {
  if (opts?.sendToQc === true) return 'PENDING';
  if (opts?.sendToQc === false) return 'PASSED';
  // @ts-ignore
  return item?.requiresQc ? 'PENDING' : 'PASSED';
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
    toLocationId: p.locationId,              // entra en esta ubicación
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
  const now = new Date().toISOString();
  const qcStatus = initialQcStatusFor(undefined, { sendToQc: p.sendToQc });
  const lot = {
    id: lotNumber,
    lotNumber,
    itemId: p.itemId,
    qcStatus: qcStatus,
    createdAt: now,
    updatedAt: now,
    quantity: p.qty,
    uom: p.uom,
  };

  try {
    await upsertMany("lots", [lot as any]);
  } catch {
    // si no existe, no pasa nada
  }

  // 4) Guardar el movimiento
  await upsertMany("stockMoves", [stockMove as any]);

  // 5) Revalidate UI
  revalidatePath("/warehouse");

  return ok({ stockMoveId, lotNumber });
}
