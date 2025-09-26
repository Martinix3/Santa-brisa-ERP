// src/app/(app)/production/bom/actions.ts
'use server';

import { ok, fail, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { upsertMany } from '@/lib/dataprovider/actions';
import { revalidatePath } from 'next/cache';

const zBOM = z.object({
  id: z.string().min(1),
  sku: z.string().min(1, "SKU requerido"),
  name: z.string().min(1, "Nombre requerido"),
  batchSize: z.number().positive("Debe ser > 0"),
  items: z.array(z.object({
    materialId: z.string().min(1, "Material requerido"),
    quantity: z.number().positive("Cantidad > 0"),
    role: z.string().optional(),
    unit: z.string().optional(),
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
