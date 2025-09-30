// src/features/production/execution/helpers.ts
import type { ProductionStatus, Uom, Item } from '@/domain/ssot';

type RealConsumptionLine = { itemId: string; itemName: string; lotNumber: string; theoreticalQty: number; realQty: number; uom: Uom; fromLocationId: string };

export const canEditPlan = (s?: ProductionStatus) => s === "PLANNED" || s == null;
export const canStart    = (s?: ProductionStatus) => s === "PLANNED";
export const canPause    = (s?: ProductionStatus) => s === "IN_PROGRESS";
export const canResume   = (s?: ProductionStatus) => s === "PAUSED";
export const canFinish   = (s?: ProductionStatus) => s === "IN_PROGRESS" || s === "PAUSED";
export const isClosedLike = (s?: ProductionStatus) => s === "DONE" || s === "CANCELLED";

export function picksToRealLines(picks: Array<{itemId:string; lotNumber:string; qty:number; uom:string; locationId: string}>, itemsMap: Map<string, Item>): RealConsumptionLine[] {
  const bucket = new Map<string, RealConsumptionLine>();
  for (const p of picks) {
    const k = `${p.itemId}|${p.lotNumber}|${p.uom}`;
    const cur = bucket.get(k) ?? { itemId: p.itemId, itemName: itemsMap.get(p.itemId)?.name || p.itemId, lotNumber: p.lotNumber, theoreticalQty: 0, realQty: 0, uom: p.uom as Uom, fromLocationId: p.locationId };
    cur.theoreticalQty = +(cur.theoreticalQty + Number(p.qty || 0)).toFixed(3);
    cur.realQty = cur.theoreticalQty; // Default real to theoretical
    bucket.set(k, cur);
  }
  return [...bucket.values()];
}
