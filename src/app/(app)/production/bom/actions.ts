// src/app/(app)/production/bom/actions.ts
'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { upsertMany } from '@/lib/dataprovider/actions';
import { revalidatePath } from 'next/cache';

// ====== Producto mínimo para poder referenciar en el BOM ======
const zNewProduct = z.object({
  sku: z.string().min(1, "SKU requerido"),
  name: z.string().min(1, "Nombre de producto requerido"),
  packSizeMl: z.coerce.number().positive().optional(),
});

const zBOM = z.object({
  id: z.string().min(1),
  outputItemId: z.string().min(1, "Producto de salida requerido"),
  name: z.string().min(1, "Nombre requerido"),
  batchSize: z.coerce.number().positive("Debe ser > 0"),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item requerido"),
    qty: z.coerce.number().positive("Cantidad > 0"),
    role: z.string().optional(),
    uom: z.string().optional(),
  })).min(1, "Añade al menos una línea"),
});

export async function upsertBOM(input: unknown): Promise<ActionResult<{id:string}>> {
  try {
    const bom = zBOM.parse(input);
    
    await upsertMany('billOfMaterials', [bom]);
    revalidatePath('/production/bom');

    return ok({ id: bom.id });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const fieldErrors = Object.fromEntries(
        e.issues.map((i: any) => [i.path.join("."), i.message])
      );
      return fail("Revisa los campos marcados", { fieldErrors });
    }
    // Normaliza errores conocidos del backend
    if (e?.code === "permission-denied") return fail("Sin permisos para guardar.", { code: e.code });
    return fail("No se pudo guardar. Inténtalo de nuevo.", { code: e?.code, retryable: true });
  }
}

export async function upsertMinimalProduct(input: unknown): Promise<ActionResult<{itemId: string}>> {
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
      category: 'fg',
      createdAt: now,
      updatedAt: now,
      uom: 'unit'
    };
    await upsertMany('items', [productDoc as any]);
    revalidatePath('/production/bom');
    return ok({ itemId });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const fieldErrors = Object.fromEntries(
        e.issues.map((i: any) => [i.path.join("."), i.message])
      );
      return fail("Revisa los campos del nuevo producto", { fieldErrors });
    }
    if (e?.code === "permission-denied") return fail("Sin permisos para crear producto.", { code: e.code });
    return fail("No se pudo crear el producto.", { code: e?.code, retryable: true });
  }
}
