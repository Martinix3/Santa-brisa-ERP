/**
 * Rules — Validaciones declarativas (puras, sin efectos)
 * Alineado a SSOT. Importa solo tipos, no helpers pesados.
 */
import type { ISO, Promotion, Order, Activation, PlvMaterial } from "./types";

// Fecha en ventana (inclusive)
export function isWithin(dateISO: ISO|undefined, start?: ISO, end?: ISO): boolean {
  if (!dateISO) return false;
  const d = new Date(dateISO).getTime();
  const s = start ? new Date(start).getTime() : -Infinity;
  const e = end ? new Date(end).getTime() : +Infinity;
  return d >= s && d <= e;
}

// Promoción aplicable a un pedido (fecha + estado + SKU scope)
export function isPromotionApplicable(order: Order, promo: Promotion, nowISO: ISO): boolean {
  if (promo.status !== 'active') return false;
  if (!isWithin(nowISO, promo.validFrom, promo.validTo)) return false;
  if (!promo.skuScope || promo.skuScope.length === 0) return true;
  return order.items.some(l => promo.skuScope!.includes(l.sku));
}

// Cierre de activación válido: requiere startDate y endDate >= startDate
export function isValidActivationClose(a: Activation): boolean {
  if (!a.startDate || !a.endDate) return false;
  return new Date(a.endDate).getTime() >= new Date(a.startDate).getTime();
}

// PLV instalable: status objetivo INSTALADO y cantidad > 0
export function canInstallPlv(plv: Pick<PlvMaterial,'status'|'quantity'>): boolean {
  return (plv.quantity ?? 0) > 0 && plv.status === 'INSTALADO';
}

// Evento Marketing “cerrable”: requiere spend > 0 y al menos un KPI positivo
export function isValidEventClose(event: { spend?: number; kpis?: Record<string, number> }): boolean {
  if (!event || !event.spend || event.spend <= 0) return false;
  const kpis = event.kpis ?? {};
  return Object.values(kpis).some(v => typeof v === 'number' && v > 0);
}
