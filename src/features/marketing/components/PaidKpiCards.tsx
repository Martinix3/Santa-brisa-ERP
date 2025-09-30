// src/features/marketing/components/PaidKpiCards.tsx
"use client";
import React, { useMemo } from 'react';
import type { OnlineCampaign } from '@/domain/ssot';

const fmtEur = (n?: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n?: number) => new Intl.NumberFormat("es-ES").format(n || 0);

function monthBounds(d: Date | string = new Date()){
  const date = new Date(d);
  if(isNaN(date.getTime())) { // Invalid date
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0,0,0,0);
  const end   = new Date(date.getFullYear(), date.getMonth()+1, 0, 23,59,59,999);
  return { start, end };
}
function overlapsMonth(c: OnlineCampaign){
  if (!c.startAt) return false;
  const s = new Date(c.startAt);
  if (isNaN(s.getTime())) return false; // Invalid date
  const now = new Date();
  const { start, end } = monthBounds(now);
  const e = c.endAt ? new Date(c.endAt) : s;
  return e >= start && s <= end;
}

const Card = ({ label, value, hint }:{ label:string; value:React.ReactNode; hint?:string }) => (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
        {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
);

export function PaidKpiCards({ campaigns }: { campaigns: OnlineCampaign[] }){
  const kpi = useMemo(() => {
    const mtd = (campaigns||[]).filter(overlapsMonth);
    const sum = (xs:number[]) => xs.reduce((a,b)=>a+(b||0),0);
    const spend       = sum(mtd.map(c => c.spend || 0));
    const impressions = sum(mtd.map(c => c.metrics?.impressions || 0));
    const clicks      = sum(mtd.map(c => c.metrics?.clicks || 0));
    const revenue     = sum(mtd.map(c => c.metrics?.revenue || 0));
    const roas = spend>0 ? revenue/spend : 0;
    const ctr  = impressions>0 ? clicks/impressions : 0;
    const cpc  = clicks>0 ? spend/clicks : 0;
    const cpm  = impressions>0 ? spend/(impressions/1000) : 0;
    return { spend, revenue, roas, ctr, cpc, cpm, impressions, clicks };
  }, [campaigns]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Card label="Spend (MTD)" value={fmtEur(kpi.spend)} />
      <Card label="Revenue (MTD)" value={fmtEur(kpi.revenue)} />
      <Card label="ROAS (MTD)" value={`${(kpi.roas||0).toFixed(2)}x`} />
      <Card label="CTR" value={`${(kpi.ctr*100).toFixed(2)}%`} hint={`${fmtNum(kpi.clicks)} / ${fmtNum(kpi.impressions)}`} />
      <Card label="CPC" value={fmtEur(kpi.cpc)} hint={`${fmtNum(kpi.clicks)} clicks`} />
      <Card label="CPM" value={fmtEur(kpi.cpm)} hint={`${fmtNum(kpi.impressions)} imp.`} />
    </div>
  );
}
