
// src/features/influencers/utils/format.ts
import type { InfluencerCollab } from "@/domain/ssot";
export const fmtEur = (n?: number) => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
export const fmtNum = (n?: number) => new Intl.NumberFormat("es-ES").format(n||0);

export function monthBounds(d: Date | string = new Date()){
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) { // Invalid date
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  }
  const start=new Date(date.getFullYear(), date.getMonth(), 1, 0,0,0,0);
  const end=new Date(date.getFullYear(), date.getMonth()+1, 0, 23,59,59,999);
  return { start, end };
}

export function overlapsMonth(c:InfluencerCollab, now=new Date()){
  const { start, end } = monthBounds(now);
  const g = c?.dates?.goLiveAt ? new Date(c.dates.goLiveAt) : null;
  const e = c?.dates?.endAt ? new Date(c.dates.endAt) : g || new Date();
  const from = g || e;
  return e >= start && from <= end;
}
