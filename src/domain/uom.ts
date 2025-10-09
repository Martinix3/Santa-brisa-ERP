// src/domain/uom.ts
import type { OnHandView, Item, Uom } from "@/domain/ssot";
import { UOM_ALIASES } from "@/domain/ssot";

/**
 * Normaliza una UOM string a su valor canónico según SSOT.
 * Aplica los aliases definidos en UOM_ALIASES (e.g., 'uds' -> 'unit').
 * 
 * @param uom - La UOM a normalizar (puede ser un alias)
 * @returns La UOM normalizada según SSOT, o la original si no hay alias
 */
export function normalizeUom(uom: string): Uom {
  const normalized = UOM_ALIASES[uom.toLowerCase()];
  return (normalized || uom) as Uom;
}

/**
 * Normaliza un objeto que contiene una propiedad 'uom'.
 * Útil para normalizar arrays de líneas de órdenes, reservas, etc.
 */
export function normalizeUomInObject<T extends { uom: string }>(obj: T): T & { uom: Uom } {
  return {
    ...obj,
    uom: normalizeUom(obj.uom)
  };
}

/** Devuelve la UoM dominante en inventario para un item; si no hay stock, usa la del maestro de items. */
export function canonicalUomForItem(
  itemId: string,
  onHand: OnHandView[],
  items: Item[]
): Uom {
  const item = items.find(i => i.id === itemId);
  if (!item) return 'unit'; // Fallback seguro

  // 1) buscar en inventario por itemId
  const candidates = onHand.filter(oh => oh.itemId === itemId);
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
  // 2) fallback al item
  return item.uom;
}

/** Para producto terminado: sugiere la UoM dominante en inventario; si no, 'unit' por defecto. */
export function canonicalUomForFinished(
  itemId: string,
  onHand: OnHandView[]
): Uom {
  const candidates = onHand.filter(oh => oh.itemId === itemId);

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
  return "unit";
}
