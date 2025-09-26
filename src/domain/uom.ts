// src/domain/uom.ts
import type { InventoryItem, Material, Uom, Product } from "@/domain/ssot";

/** Devuelve la UoM dominante en inventario para un material; si no hay, usa la del material. */
export function canonicalUomForMaterial(
  materialId: string,
  inventory: InventoryItem[],
  materials: Material[]
): Uom {
  const mat = materials.find(m => m.id === materialId);
  // 1) buscar en inventario por materialId o por sku del material (algunos lotes guardan sku)
  const candidates = inventory.filter(l =>
    (l as any).materialId === materialId || (!!mat?.sku && l.sku === mat?.sku)
  );
  if (candidates.length) {
    // mayoría simple
    const tally = new Map<string, number>();
    for (const c of candidates) {
      const u = (c as any).uom as string | undefined;
      if (!u) continue;
      tally.set(u, (tally.get(u) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if (best) return best as Uom;
  }
  // 2) fallback al material (stockUom/baseUom/uom)
  return ((mat as any)?.stockUom ?? (mat as any)?.baseUom ?? (mat as any)?.uom ?? "uds") as Uom;
}

/** Para producto terminado: sugiere la UoM dominante en inventario; si no, 'uds' por defecto. */
export function canonicalUomForFinished(
  sku: string,
  inventory: InventoryItem[]
): Uom {
  const candidates = inventory.filter(l => l.sku === sku);
  if (candidates.length) {
    const tally = new Map<string, number>();
    for (const c of candidates) {
      const u = (c as any).uom as string | undefined;
      if (!u) continue;
      tally.set(u, (tally.get(u) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if (best) return best as Uom;
  }
  return "uds" as Uom;
}

/** Convierte una cantidad de una UoM a la unidad base del producto (botella). */
export function toBaseUnits(qty: number, uom: Uom, product: Product): number {
  if (uom === 'bottle' || uom === 'uds') return qty;

  const caseUnits = product.caseUnits ?? 0;
  if (uom === 'case') return qty * caseUnits;

  const casesPerPallet = product.casesPerPallet ?? 0;
  if (uom === 'pallet') return qty * casesPerPallet * caseUnits;

  // L, mL, kg, g... aquí necesitarías factores de conversión por producto
  // Por ahora, lo dejamos simple.
  return qty;
}
