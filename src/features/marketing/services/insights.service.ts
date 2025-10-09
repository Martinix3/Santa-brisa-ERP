// src/features/marketing/services/insights.service.ts
import type { OnlineCampaign } from '@/domain/ssot.v7';

export type RowExt = OnlineCampaign & { _score:number; _label:'WIN'|'SCALE'|'FIX'|'KILL'; _stats:{
  roas:number; cpm:number; cpc:number; ctr?:number; cvr?:number;
}};

export function buildPaidInsights(campaigns: OnlineCampaign[], minSpendToJudge=300): RowExt[] {
  const by = <T, K extends string|number|symbol>(arr:T[], key:(t:T)=>K) =>
    arr.reduce((m, x) => { (m as any)[key(x)] ||= []; (m as any)[key(x)].push(x); return m; }, {} as Record<K, T[]>);
  
  const pct = (xs:number[], p:number) => {
    const a = xs.filter(Number.isFinite).slice().sort((a,b)=>a-b);
    if (!a.length) return 0;
    const i = Math.min(a.length-1, Math.max(0, Math.round((p/100)*(a.length-1))));
    return a[i];
  };

  const mean = (xs:number[]) => xs.length ? xs.reduce((s,v)=>s+v,0)/xs.length : 0;
  const std  = (xs:number[]) => { if (xs.length<2) return 0; const m=mean(xs); return Math.sqrt(mean(xs.map(x=>(x-m)*(x-m)))) };
  const z = (x:number,m:number,s:number)=> s>0 ? (x-m)/s : 0;

  const rows = (campaigns||[]).map(c => {
    const spend = c.spend || 0;
    const imp   = c.metrics?.impressions || 0;
    const clk   = c.metrics?.clicks || 0;
    const rev   = c.metrics?.revenue || 0;
    const orders= c.metrics?.orders;
    const roas = spend>0 ? rev/spend : 0;
    const ctr  = imp>0 ? clk/imp : 0;
    const cpc  = clk>0 ? spend/clk : 0;
    const cpm  = imp>0 ? spend/(imp/1000) : 0;
    const cvr  = orders && clk>0 ? orders/clk : undefined;
    return { ...c, _stats:{ roas, cpm, cpc, ctr, cvr }, _score:0, _label:'FIX' as const };
  }) as RowExt[];

  const groups = by(rows, r=>r.channel);
  Object.values(groups).forEach(group => {
    const roasArr = group.map(g=>g._stats.roas);
    const cpcArr  = group.map(g=>g._stats.cpc);
    const cpmArr  = group.map(g=>g._stats.cpm);
    const ctrArr  = group.map(g=>g._stats.ctr ?? 0);
    const cvrArr  = group.map(g=>g._stats.cvr ?? 0);

    const m = { roas:mean(roasArr), cpc:mean(cpcArr), cpm:mean(cpmArr), ctr:mean(ctrArr), cvr:mean(cvrArr) };
    const s = { roas:std(roasArr),  cpc:std(cpcArr),  cpm:std(cpmArr),  ctr:std(ctrArr),  cvr:std(cvrArr) };

    group.forEach(g => {
      const hasOrders = (g.metrics?.orders ?? 0) > 0;
      const Z = {
        roas: z(g._stats.roas, m.roas, s.roas),
        ctr:  z((g._stats.ctr ?? 0),  m.ctr,  s.ctr),
        cvr:  z((g._stats.cvr ?? 0), m.cvr, s.cvr),
        cpc:  z(g._stats.cpc,  m.cpc,  s.cpc),
        cpm:  z(g._stats.cpm,  m.cpm,  s.cpm),
      };
      const score = 0.45*Z.roas + (hasOrders ? 0.20*Z.cvr : 0.20*Z.ctr) - 0.10*Z.cpc - 0.10*Z.cpm + 0.15*Z.ctr;
      g._score = score;
    });

    const p_roas_75 = pct(roasArr, 75);
    const p_roas_25 = pct(roasArr, 25);
    const med_cpm   = pct(cpmArr, 50);
    const p_cpc_75  = pct(cpcArr, 75);
    const p_spend_50= pct(group.map(x=>x.spend||0), 50);
    const p_score_75= pct(group.map(x=>x._score), 75);

    group.forEach(g => {
      const spend = g.spend || 0;
      const label =
        (g._stats.roas >= p_roas_75 && g._stats.cpm <= med_cpm && spend < p_spend_50) ? "SCALE" :
        (spend >= minSpendToJudge && g._stats.roas <= p_roas_25 && g._stats.cpc >= p_cpc_75) ? "KILL" :
        (g._score >= p_score_75) ? "WIN" : "FIX";
      g._label = label as RowExt["_label"];
    });
  });

  rows.sort((a,b)=>b._score - a._score);
  return rows;
}
