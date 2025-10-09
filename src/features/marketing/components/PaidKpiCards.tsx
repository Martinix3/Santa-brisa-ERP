// src/features/marketing/components/PaidKpiCards.tsx
"use client";
import React, { useMemo } from 'react';
import type { OnlineCampaign } from '@/domain/ssot.v7';
import { KPI } from '@/components/ui/ui-primitives';
import { Euro, TrendingUp, Percent, BarChart3, MousePointerClick } from 'lucide-react';

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
      <KPI icon={Euro} label="Spend (MTD)" value={fmtEur(kpi.spend)} />
      <KPI icon={TrendingUp} label="Revenue (MTD)" value={fmtEur(kpi.revenue)} />
      <KPI icon={Percent} label="ROAS (MTD)" value={`${(kpi.roas||0).toFixed(2)}x`} />
      <KPI icon={BarChart3} label="CTR" value={`${(kpi.ctr*100).toFixed(2)}%`} hint={`${fmtNum(kpi.clicks)} / ${fmtNum(kpi.impressions)}`} />
      <KPI icon={MousePointerClick} label="CPC" value={fmtEur(kpi.cpc)} hint={`${fmtNum(kpi.clicks)} clicks`} />
      <KPI icon={BarChart3} label="CPM" value={fmtEur(kpi.cpm)} hint={`${fmtNum(kpi.impressions)} imp.`} />
    </div>
  );
}
