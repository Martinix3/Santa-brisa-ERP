// domain/uom.ts
import type { Uom, Product } from './ssot';

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
