
// src/features/influencers/components/CollabKpiCards.tsx
"use client";
import React, { useMemo } from "react";
import type { InfluencerCollab } from "@/domain/ssot";
import { fmtEur, fmtNum, overlapsMonth } from "../utils/format";

export function CollabKpiCards({ collabs }:{ collabs: InfluencerCollab[] }) {
  const k = useMemo(()=>{
    const mtd = (collabs||[]).filter(overlapsMonth);
    const sum = (xs:number[]) => xs.reduce((a,b)=>a+(b||0),0);
    const spend = sum(mtd.map(c => (c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0)));
    const revenue = sum(mtd.map(c => c.tracking?.revenue || 0));
    const impressions = sum(mtd.map(c => c.metrics?.impressions || 0));
    const clicks = sum(mtd.map(c => c.metrics?.clicks || 0));
    const engagements = sum(mtd.map(c => c.metrics?.engagements || 0));
    const roas = spend>0 ? revenue/spend : 0;
    const cpe = engagements>0 ? spend/engagements : undefined;
    const cpm = impressions>0 ? spend/(impressions/1000) : undefined;
    const cpc = clicks>0 ? spend/clicks : undefined;
    return { spend, revenue, roas, impressions, clicks, engagements, cpe, cpm, cpc };
  },[collabs]);

  const Card = ({label,value,hint}:{label:string;value:React.ReactNode;hint?:string})=>(
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Card label="Spend MTD" value={fmtEur(k.spend)} />
      <Card label="Revenue MTD" value={fmtEur(k.revenue)} />
      <Card label="ROAS MTD" value={`${(k.roas||0).toFixed(2)}x`} />
      <Card label="CPE" value={k.cpe?fmtEur(k.cpe):"—"} hint={`${fmtNum(k.engagements)} eng`} />
      <Card label="CPC" value={k.cpc?fmtEur(k.cpc):"—"} hint={`${fmtNum(k.clicks)} clicks`} />
      <Card label="CPM" value={k.cpm?fmtEur(k.cpm):"—"} hint={`${fmtNum(k.impressions)} imp.`} />
    </div>
  );
}
