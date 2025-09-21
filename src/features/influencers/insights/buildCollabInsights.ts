
// src/features/influencers/insights/buildCollabInsights.ts
import type { InfluencerCollab } from "@/domain/ssot";

export type CollabRowExt = InfluencerCollab & { _score:number; _label:'WIN'|'SCALE'|'FIX'|'KILL'; _stats:{
  spend:number; roas:number; cpm:number; cpc:number; cpe?:number; ctr?:number; cac?:number;
}};

export function buildCollabInsights(collabs: InfluencerCollab[], minSpendToJudge=200): CollabRowExt[] {
  const by=<T,K extends string|number|symbol>(a:T[],k:(t:T)=>K)=>a.reduce((m,x)=>(m[k(x)] ||= [], m[k(x)].push(x), m),{} as Record<K,T[]>);
  const pct=(xs:number[],p:number)=>{ const a=xs.filter(Number.isFinite).slice().sort((a,b)=>a-b); if(!a.length) return 0; const i=Math.round((p/100)*(a.length-1)); return a[Math.min(Math.max(0,i),a.length-1)]; };
  const mean=(xs:number[])=>xs.length?xs.reduce((s,v)=>s+v,0)/xs.length:0;
  const std=(xs:number[])=>{ if(xs.length<2) return 0; const m=mean(xs); return Math.sqrt(mean(xs.map(x=>(x-m)*(x-m)))) };
  const z=(x:number,m:number,s:number)=> s>0?(x-m)/s:0;

  const rows = (collabs||[]).map(c=>{
    const spend=(c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0);
    const revenue=c.tracking?.revenue||0;
    const imp=c.metrics?.impressions||0; const clk=c.metrics?.clicks||0; const eng=c.metrics?.engagements||0; const ord=c.metrics?.orders;
    const roas=spend>0?revenue/spend:0; const cpm=imp>0?spend/(imp/1000):0; const cpc=clk>0?spend/clk:0; const cpe=eng>0?spend/eng:undefined; const ctr=imp>0?clk/imp:undefined; const cac=ord&&ord>0?spend/ord:undefined;
    return { ...(c as any), _score:0, _label:'FIX', _stats:{spend,roas,cpm,cpc,cpe,ctr,cac} } as CollabRowExt;
  });

  const groups = Object.values(by(rows, r=>r.platform));
  groups.forEach(g=>{
    const arr = {
      roas: g.map(x=>x._stats.roas), cpm:g.map(x=>x._stats.cpm), cpc:g.map(x=>x._stats.cpc),
      ctr: g.map(x=>x._stats.ctr??0), cpe:g.map(x=>x._stats.cpe??0),
      spend:g.map(x=>x._stats.spend), score:g.map(x=>x._score)
    };
    const m={ roas:mean(arr.roas), cpm:mean(arr.cpm), cpc:mean(arr.cpc), ctr:mean(arr.ctr), cpe:mean(arr.cpe) };
    const s={ roas:std(arr.roas),  cpm:std(arr.cpm),  cpc:std(arr.cpc),  ctr:std(arr.ctr),  cpe:std(arr.cpe) };

    g.forEach(x=>{
      const Z = {
        roas:z(x._stats.roas,m.roas,s.roas),
        ctr:z((x._stats.ctr??0),m.ctr,s.ctr),
        cpe:z((x._stats.cpe??0),m.cpe,s.cpe),
        cpc:z(x._stats.cpc,m.cpc,s.cpc),
        cpm:z(x._stats.cpm,m.cpm,s.cpm),
      };
      x._score = 0.45*Z.roas + 0.20*Z.ctr - 0.15*Z.cpc - 0.10*Z.cpm - 0.10*Z.cpe + 0.10*Z.ctr;
    });

    const p75_roas=pct(arr.roas,75), p25_roas=pct(arr.roas,25), med_cpm=pct(arr.cpm,50), p75_cpc=pct(arr.cpc,75), p50_spend=pct(arr.spend,50), p75_score=pct(g.map(x=>x._score),75);
    g.forEach(x=>{
      x._label =
        (x._stats.roas>=p75_roas && x._stats.cpm<=med_cpm && x._stats.spend<p50_spend) ? 'SCALE' :
        (x._stats.spend>=200 && x._stats.roas<=p25_roas && x._stats.cpc>=p75_cpc) ? 'KILL' :
        (x._score>=p75_score) ? 'WIN' : 'FIX';
    });
  });

  rows.sort((a,b)=>b._score - a._score);
  return rows;
}
