// src/domain/uom.ts
import type { OnHandView, Item, Uom } from "@/domain/ssot";

/** Devuelve la UoM dominante en inventario para un item; si no hay stock, usa la del maestro de items. */
export function canonicalUomForItem(
  itemId: string,
  onHand: OnHandView[],
  items: Item[]
): Uom {
  const item = items.find(i => i.id === itemId);
  if (!item) return 'uds'; // Fallback seguro

  // 1) buscar en inventario por itemId
  const candidates = onHand.filter(oh => oh.itemId === itemId);
  if (candidates.length) {
    // Mayoría simple
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

/** Para producto terminado: sugiere la UoM dominante en inventario; si no, 'uds' por defecto. */
export function canonicalUomForFinished(
  sku: string,
  onHand: OnHandView[]
): Uom {
  // Nota: Deberíamos usar itemId en vez de sku, pero mantenemos por compatibilidad temporal
  const candidates = onHand.filter(oh => {
    // Suponemos que podemos buscar el `item` para obtener el sku, aunque lo ideal es que OnHandView lo tenga
    return oh.itemId.includes(sku); // Heurística débil
  });

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
