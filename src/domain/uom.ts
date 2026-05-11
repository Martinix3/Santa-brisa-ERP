/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/domain/uom.ts
import type { OnHandView, Uom, Item } from "@/domain/ssot";

// UOM_ALIASES no existe en ssot.ts actual, usar mapeo local si es necesario
const UOM_ALIASES: Record<string, string> = {
  'uds': 'unit',
  'unidades': 'unit',
  'ml': 'mL',
  'litros': 'L',
  'l': 'L',
  'gramos': 'g',
  'kilos': 'kg',
  'kilogramos': 'kg',
};

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
 * Type-safe UOM converter - convierte string | Uom a Uom canónico.
 * Incluye mapeo completo de aliases comunes y casos especiales.
 * 
 * @param val - Puede ser un string o ya un Uom
 * @returns La UOM normalizada tipo-safe
 */
export function toUom(x: string | Uom): Uom {
  const s = (x || '').toLowerCase();
  const map: Record<string, Uom> = {
    // Unit aliases
    unit: 'unit', units: 'unit', unidad: 'unit', uds: 'unit', ud: 'unit',
    // Volume
    l: 'L', litro: 'L', litros: 'L',
    ml: 'mL', mililitro: 'mL', mililitros: 'mL',
    // Mass
    g: 'g', gramo: 'g', gramos: 'g',
    kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
    // Sales units
    bottle: 'bottle', botella: 'bottle', botellas: 'bottle',
    case: 'case', caja: 'case', cajas: 'case',
    pallet: 'pallet', palet: 'pallet', palé: 'pallet', pale: 'pallet',
  };
  
  // Handle "UNIT" in uppercase (common in legacy data)
  if (x === 'UNIT') return 'unit';
  
  // Try mapped value
  if (map[s]) return map[s];
  
  // Fallback to unit if unrecognized
  return 'unit';
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
  itemKey: string,
  onHand: OnHandView[],
  items: Item[]
): Uom {
  const item = items.find((i) => i.id === itemKey);
  if (!item) return 'unit'; // Fallback seguro

  // 1) buscar en inventario por itemKey
  const candidates = onHand.filter(oh => {
    const key = oh.sku || oh.itemId;
    return key === itemKey;
  });
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
  itemKey: string,
  onHand: OnHandView[]
): Uom {
  const candidates = onHand.filter(oh => {
    const key = oh.sku || oh.itemId;
    return key === itemKey;
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
  return "unit";
}
