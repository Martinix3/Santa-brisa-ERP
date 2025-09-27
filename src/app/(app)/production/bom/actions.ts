'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { upsertMany } from "@/lib/dataprovider/actions";
import { revalidatePath } from "next/cache";

// ====== Schemas ======
const zStage = z.enum(["PRODUCCION", "ENVASADO"]);
const zRole = z.enum(["FORMULA", "PACKAGING", "COST_ONLY"]).default("FORMULA");
const zUom = z.enum(["L", "kg", "unit"]);

const zBOM = z.object({
  id: z.string().min(1),
  stage: zStage.optional(),
  outputItemId: z.string().min(1, "Producto de salida requerido"),
  name: z.string().min(1, "Nombre requerido"),
  batchSize: z.coerce.number().positive("Debe ser > 0").default(1),
  baseUnit: zUom.default("L"),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item requerido"),
    qty: z.coerce.number().positive("Cantidad > 0"),
    role: zRole,
    uom: zUom.optional(),
  })).min(1, "Añade al menos una línea"),
  version: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  supersedesId: z.string().optional(),
  changeNote: z.string().max(280).optional(),
});

const zNewProduct = z.object({
  sku: z.string().min(1, "SKU requerido"),
  name: z.string().min(1, "Nombre de producto requerido"),
  packSizeMl: z.coerce.number().positive().optional(),
});

const zNewMaterial = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  uom: zUom.default("kg"),
  category: z.enum(["rm", "pack", "aux"]).default("rm"),
});

export async function upsertBOM(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const bom = zBOM.parse(input);
    const stage = bom.stage ?? "PRODUCCION";

    // ✅ Validación mínima coherente con la UX per-unit
    if (stage === "PRODUCCION" && bom.baseUnit !== "L") {
      return fail("Producción debe estar en unidad base L (1 L).");
    }
    if (stage === "ENVASADO" && bom.baseUnit !== "unit") {
      return fail("Envasado debe estar en unidad base unit (1 botella).");
    }

    // 🔒 Normaliza per-unit (batchSize=1) y asegura uom en línea si faltó
    const normalized = {
      ...bom,
      batchSize: 1,
      items: bom.items.map(l => ({ ...l, uom: l.uom ?? "unit" })),
    };

    // (Opcional) Validación fuerte con lectura de items (cuando tengas reads)
    // try {
    //   const { getManyByIds } = await import("@/lib/dataprovider/reads");
    //   const ids = [normalized.outputItemId, ...normalized.items.map(i => i.itemId)];
    //   type ItemLite = { id: string; category?: "rm"|"pack"|"aux"|"sf"|"fg"; uom?: "L"|"kg"|"unit"; active?: boolean };
    //   const docs = await getManyByIds<ItemLite>("items", ids);
    //   const idx = new Map(docs.map(d => [d.id, d]));
    //   const out = idx.get(normalized.outputItemId);
    //   if (!out) return fail("El producto de salida no existe.");
    //   if (stage === "PRODUCCION" && out.category !== "sf") return fail("En Producción el output debe ser PI (sf).");
    //   if (stage === "ENVASADO" && out.category !== "fg") return fail("En Envasado el output debe ser FG (fg).");
    //   normalized.items = normalized.items.map(l => ({ ...l, uom: (idx.get(l.itemId)?.uom ?? l.uom ?? "unit") as any }));
    // } catch { /* sin helper de lectura, seguimos */ }

    await upsertMany("billOfMaterials", [normalized as any]);
    revalidatePath("/production/bom");
    return ok({ id: normalized.id });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const fieldErrors = Object.fromEntries(e.issues.map((i: any) => [i.path.join("."), i.message]));
      return fail("Revisa los campos marcados", { fieldErrors });
    }
    if (e?.code === "permission-denied")
      return fail("Sin permisos para guardar.", { code: e.code });
    return fail("No se pudo guardar. Inténtalo de nuevo.", { code: e?.code, retryable: true });
  }
}

/** 🗂️ Archivar (eliminar lógico) una receta */
export async function archiveBOM(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id) return fail("Falta id de receta.");
    // Soft delete: isActive=false (mantiene histórico)
    await upsertMany("billOfMaterials", [{ id, isActive: false } as any]);
    revalidatePath("/production/bom");
    return ok({ id });
  } catch (e: any) {
    if (e?.code === "permission-denied")
      return fail("Sin permisos para eliminar receta.", { code: e.code });
    return fail("No se pudo eliminar la receta.", { code: e?.code, retryable: true });
  }
}

export async function upsertMinimalProduct(input: unknown): Promise<ActionResult<{ itemId: string }>> {
  try {
    const p = zNewProduct.parse(input);
    const now = new Date().toISOString();
    const itemId = `item_${Date.now()}`;
    const productDoc = {
      id: itemId,
      sku: p.sku,
      name: p.name,
      bottleMl: p.packSizeMl ?? 0,
      active: true,
      category: "fg",
      createdAt: now,
      updatedAt: now,
      uom: "unit",
    };
    await upsertMany("items", [productDoc as any]);
    revalidatePath("/production/bom");
    return ok({ itemId });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const fieldErrors = Object.fromEntries(e.issues.map((i: any) => [i.path.join("."), i.message]));
      return fail("Revisa los campos del nuevo producto", { fieldErrors });
    }
    if (e?.code === "permission-denied")
      return fail("Sin permisos para crear producto.", { code: e.code });
    return fail("No se pudo crear el producto.", { code: e?.code, retryable: true });
  }
}

export async function upsertMinimalMaterial(input: unknown): Promise<ActionResult<{ itemId: string }>> {
  try {
    const m = zNewMaterial.parse(input);
    const now = new Date().toISOString();
    const id = `item_${Date.now()}`;
    await upsertMany("items", [{ id, ...m, active: true, createdAt: now, updatedAt: now } as any]);
    revalidatePath("/production/bom");
    return ok({ itemId: id });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const fieldErrors = Object.fromEntries(e.issues.map((i: any) => [i.path.join("."), i.message]));
      return fail("Revisa los campos del nuevo material", { fieldErrors });
    }
    if (e?.code === "permission-denied")
      return fail("Sin permisos para crear material.", { code: e.code });
    return fail("No se pudo crear el material.", { code: e?.code, retryable: true });
  }
}
