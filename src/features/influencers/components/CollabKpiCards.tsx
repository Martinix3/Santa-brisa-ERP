
// src/features/influencers/components/CollabKpiCards.tsx
"use client";
import React, { useMemo } from "react";
import type { InfluencerCollab } from "@/domain/ssot";
import { fmtEur, fmtNum, overlapsMonth } from "../utils/format";
import { KPI } from '@/components/ui/ui-primitives';
import { Euro, TrendingUp, Percent, User, MousePointerClick, BarChart3 } from 'lucide-react';

export function CollabKpiCards({ collabs }: { collabs: InfluencerCollab[] }) {
  const k = useMemo(() => {
    const mtd = (collabs || []).filter(c => overlapsMonth(c));
    const sum = (xs: number[]) => xs.reduce((a, b) => a + (b || 0), 0);
    const spend = sum(mtd.map(c => (c.costs?.cashPaid || 0) + (c.costs?.productCost || 0) + (c.costs?.shippingCost || 0)));
    const revenue = sum(mtd.map(c => c.tracking?.revenue || 0));
    const impressions = sum(mtd.map(c => c.metrics?.impressions || 0));
    const clicks = sum(mtd.map(c => c.metrics?.clicks || 0));
    const engagements = sum(mtd.map(c => c.metrics?.engagements || 0));
    const roas = spend > 0 ? revenue / spend : 0;
    const cpe = engagements > 0 ? spend / engagements : undefined;
    const cpm = impressions > 0 ? spend / (impressions / 1000) : undefined;
    const cpc = clicks > 0 ? spend / clicks : undefined;
    return { spend, revenue, roas, impressions, clicks, engagements, cpe, cpm, cpc };
  }, [collabs]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <KPI icon={Euro} label="Spend MTD" value={fmtEur(k.spend)} />
      <KPI icon={TrendingUp} label="Revenue MTD" value={fmtEur(k.revenue)} />
      <KPI icon={Percent} label="ROAS MTD" value={`${(k.roas || 0).toFixed(2)}x`} />
      <KPI icon={User} label="CPE" value={k.cpe ? fmtEur(k.cpe) : "—"} hint={`${fmtNum(k.engagements)} eng`} />
      <KPI icon={MousePointerClick} label="CPC" value={k.cpc ? fmtEur(k.cpc) : "—"} hint={`${fmtNum(k.clicks)} clicks`} />
      <KPI icon={BarChart3} label="CPM" value={k.cpm ? fmtEur(k.cpm) : "—"} hint={`${fmtNum(k.impressions)} imp.`} />
    </div>
  );
}
