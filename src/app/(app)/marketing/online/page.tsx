
// src/app/(app)/marketing/online/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import type { OnlineCampaign } from "@/domain/ssot";
import { SBButton, SBCard, Input, Select } from "@/components/ui/ui-primitives";
import { Plus, Edit, Save, X } from "lucide-react";

/* =========================
   Utils de formato
========================= */
const fmtEur = (n?: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n?: number) => new Intl.NumberFormat("es-ES").format(n || 0);

/* =========================
   Dialogo: Nueva Campaña
========================= */
function NewCampaignDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    channel: OnlineCampaign["channel"];
    startAt: string;
    endAt?: string;
    budget?: number;
    ownerUserId?: string;
    tracking?: { utmCampaign?: string; couponCode?: string; landingUrl?: string };
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<OnlineCampaign["channel"]>("IG");
  const [budget, setBudget] = useState<number | "">("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [owner, setOwner] = useState("");
  const [utm, setUtm] = useState("");
  const [coupon, setCoupon] = useState("");
  const [landing, setLanding] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(""); setChannel("IG"); setBudget(""); setStartAt(""); setEndAt("");
      setOwner(""); setUtm(""); setCoupon(""); setLanding("");
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startAt) return;
    onSave({
      title,
      channel,
      startAt,
      endAt: endAt || undefined,
      budget: budget === "" ? undefined : Number(budget),
      ownerUserId: owner || undefined,
      tracking: {
        utmCampaign: utm || undefined,
        couponCode: coupon || undefined,
        landingUrl: landing || undefined,
      },
    });
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Nueva Campaña Online</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={title} onChange={(e:any)=>setTitle(e.target.value)} placeholder="Título de la campaña" required />
          <div className="grid grid-cols-2 gap-3">
            <Select value={channel} onChange={(e:any)=>setChannel(e.target.value)}>
              <option value="IG">Instagram</option><option value="FB">Facebook</option>
              <option value="TikTok">TikTok</option><option value="Google">Google</option>
              <option value="YouTube">YouTube</option><option value="Email">Email</option><option value="Other">Otro</option>
            </Select>
            <Input type="number" placeholder="Presupuesto (€)" value={budget} onChange={(e:any)=>setBudget(e.target.value===""?"":Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={startAt} onChange={(e:any)=>setStartAt(e.target.value)} required />
            <Input type="date" value={endAt} onChange={(e:any)=>setEndAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={owner} onChange={(e:any)=>setOwner(e.target.value)} placeholder="Owner (opcional)" />
            <Input value={utm} onChange={(e:any)=>setUtm(e.target.value)} placeholder="utm_campaign (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={coupon} onChange={(e:any)=>setCoupon(e.target.value)} placeholder="Cupón (opcional)" />
            <Input value={landing} onChange={(e:any)=>setLanding(e.target.value)} placeholder="Landing URL (opcional)" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit">Crear</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================
   Dialogo: Cerrar/Registrar Resultados (KPIs)
   Regla dura: spend, impressions, clicks, revenue obligatorios
========================================== */
function CloseCampaignDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { spend: number; impressions: number; clicks: number; revenue: number; orders?: number }) => void;
}) {
  const [values, setValues] = useState<{ spend: string; impressions: string; clicks: string; revenue: string; orders: string }>({
    spend: "", impressions: "", clicks: "", revenue: "", orders: ""
  });
  const [touched, setTouched] = useState<Record<keyof typeof values, boolean>>({
    spend:false, impressions:false, clicks:false, revenue:false, orders:false
  });

  useEffect(()=> {
    if (open) {
      setValues({ spend:"", impressions:"", clicks:"", revenue:"", orders:"" });
      setTouched({ spend:false, impressions:false, clicks:false, revenue:false, orders:false });
    }
  }, [open]);

  const req: (keyof typeof values)[] = ["spend","impressions","clicks","revenue"];
  const parse = (s:string) => (s==="" ? NaN : Number(s));
  const ok = (s:string) => Number.isFinite(parse(s)) && parse(s) >= 0;
  const error = (k:keyof typeof values) => (touched[k] && (req.includes(k) ? !ok(values[k]) : false)) ? "Requerido (≥ 0)" : "";
  const isValid = req.every(k => ok(values[k]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setTouched(prev => ({ ...prev, spend:true, impressions:true, clicks:true, revenue:true }));
      return;
    }
    onSubmit({
      spend: Number(values.spend),
      impressions: Number(values.impressions),
      clicks: Number(values.clicks),
      revenue: Number(values.revenue),
      orders: values.orders==="" ? undefined : Number(values.orders)
    });
    onClose();
  }

  if (!open) return null;
  const field = (k:keyof typeof values, label:string, required=false) => {
    const err = error(k);
    const invalid = !!err;
    return (
      <label className="grid gap-1.5">
        <span className="text-sm text-zinc-700">{label}{required ? " *":""}</span>
        <input
          type="number"
          value={values[k]}
          onBlur={()=>setTouched(t=>({ ...t, [k]:true }))}
          onChange={(e)=>setValues(v=>({ ...v, [k]: e.target.value }))}
          className={`h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ${invalid ? "border-rose-400 focus:ring-2 focus:ring-rose-300":"border-zinc-200"}`}
          aria-invalid={invalid}
          min={0}
          step="any"
        />
        {invalid && <span className="text-xs text-rose-600">{err}</span>}
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Registrar Resultados — Cierre de campaña</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field("spend","Gasto (€)", true)}
            {field("revenue","Ingresos atribuidos (€)", true)}
            {field("impressions","Impresiones", true)}
            {field("clicks","Clicks", true)}
            {field("orders","Pedidos (opcional)")}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit" disabled={!isValid}>Guardar y Cerrar</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================
   KPI Cards (MTD ponderado)
========================= */
function monthBounds(d = new Date()){
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
  const end   = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
  return { start, end };
}
function overlapsMonth(c: OnlineCampaign, now = new Date()){
  const { start, end } = monthBounds(now);
  const s = new Date(c.startAt);
  const e = c.endAt ? new Date(c.endAt) : s;
  return e >= start && s <= end;
}

function PaidKpiCards({ campaigns }: { campaigns: OnlineCampaign[] }){
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

  const Card = ({ label, value, hint }:{ label:string; value:React.ReactNode; hint?:string }) => (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );

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

/* ===================================================
   Insights: Score + etiqueta WIN / SCALE / FIX / KILL
=================================================== */
type RowExt = OnlineCampaign & { _score:number; _label:'WIN'|'SCALE'|'FIX'|'KILL'; _stats:{
  roas:number; cpm:number; cpc:number; ctr:number; cvr?:number;
}};

function buildPaidInsights(campaigns: OnlineCampaign[], minSpendToJudge=300): RowExt[] {
  const by = <T, K extends string|number|symbol>(arr:T[], key:(t:T)=>K) =>
    arr.reduce((m, x) => (m[key(x)] ||= [], m[key(x)].push(x), m), {} as Record<K, T[]>);
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
    const ctrArr  = group.map(g=>g._stats.ctr);
    const cvrArr  = group.map(g=>g._stats.cvr ?? 0);

    const m = { roas:mean(roasArr), cpc:mean(cpcArr), cpm:mean(cpmArr), ctr:mean(ctrArr), cvr:mean(cvrArr) };
    const s = { roas:std(roasArr),  cpc:std(cpcArr),  cpm:std(cpmArr),  ctr:std(ctrArr),  cvr:std(cvrArr) };

    group.forEach(g => {
      const hasOrders = (g.metrics?.orders ?? 0) > 0;
      const Z = {
        roas: z(g._stats.roas, m.roas, s.roas),
        ctr:  z(g._stats.ctr,  m.ctr,  s.ctr),
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

/* =========================
   Píldora de estado
========================= */
function StatusPill({ status }: { status: OnlineCampaign["status"] }) {
  const styles: Record<OnlineCampaign["status"], string> = {
    planned: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800 animate-pulse",
    closed: "bg-zinc-100 text-zinc-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

/* =========================
   Fila de tabla (edición)
========================= */
function CampaignRow({
  campaign, onUpdate, onCloseRequest,
}: {
  campaign: OnlineCampaign;
  onUpdate: (updated: OnlineCampaign) => void;
  onCloseRequest: (c: OnlineCampaign) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(campaign);
  useEffect(()=>setEdited(campaign), [campaign]);

  const roas = (edited.spend||0)>0 ? (edited.metrics?.revenue||0)/(edited.spend||0) : 0;

  const save = ()=> { onUpdate(edited); setIsEditing(false); };
  const cancel = ()=> { setEdited(campaign); setIsEditing(false); };

  if (isEditing) {
    return (
      <tr className="bg-yellow-50/40">
        <td className="px-2 py-2"><Input value={edited.title} onChange={(e:any)=>setEdited(p=>({ ...p, title:e.target.value }))} /></td>
        <td className="px-2 py-2">
          <Select value={edited.channel} onChange={(e:any)=>setEdited(p=>({ ...p, channel:e.target.value }))}>
            <option value="IG">Instagram</option><option value="FB">Facebook</option><option value="TikTok">TikTok</option>
            <option value="Google">Google</option><option value="YouTube">YouTube</option><option value="Email">Email</option><option value="Other">Otro</option>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Select value={edited.status} onChange={(e:any)=>setEdited(p=>({ ...p, status:e.target.value }))}>
            <option value="planned">planned</option><option value="active">active</option><option value="closed">closed</option><option value="cancelled">cancelled</option>
          </Select>
        </td>
        <td className="px-2 py-2 text-right"><Input type="number" value={edited.budget ?? ""} onChange={(e:any)=>setEdited(p=>({ ...p, budget: e.target.value===""?undefined:Number(e.target.value) }))} /></td>
        <td className="px-2 py-2 text-right"><Input type="number" value={edited.spend ?? 0} onChange={(e:any)=>setEdited(p=>({ ...p, spend: Number(e.target.value||0) }))} /></td>
        <td className="px-2 py-2 text-right">{fmtNum(edited.metrics?.impressions)}</td>
        <td className="px-2 py-2 text-right">{fmtNum(edited.metrics?.clicks)}</td>
        <td className="px-2 py-2 text-right font-semibold">{roas ? `${roas.toFixed(2)}x` : "—"}</td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1 justify-end">
            <SBButton size="sm" onClick={save}><Save size={14} /></SBButton>
            <SBButton size="sm" variant="secondary" onClick={cancel}><X size={14} /></SBButton>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-50/40">
      <td className="p-3 font-medium">{campaign.title}</td>
      <td className="p-3">{campaign.channel}</td>
      <td className="p-3"><StatusPill status={campaign.status} /></td>
      <td className="p-3 text-right">{fmtEur(campaign.budget)}</td>
      <td className="p-3 text-right">{fmtEur(campaign.spend)}</td>
      <td className="p-3 text-right">{fmtNum(campaign.metrics?.impressions)}</td>
      <td className="p-3 text-right">{fmtNum(campaign.metrics?.clicks)}</td>
      <td className="p-3 text-right font-semibold">
        {(campaign.spend||0)>0 && (campaign.metrics?.revenue||0)>0 ? `${((campaign.metrics!.revenue!)/(campaign.spend!)).toFixed(2)}x` : "—"}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1 justify-end">
          {campaign.status !== "closed" && (
            <SBButton size="sm" variant="secondary" onClick={()=>onCloseRequest(campaign)}>Resultados</SBButton>
          )}
          <SBButton size="sm" variant="ghost" onClick={()=>setIsEditing(true)}><Edit size={14} /></SBButton>
        </div>
      </td>
    </tr>
  );
}

/* =========================
   Página principal
========================= */
export default function OnlineCampaignsPage() {
  const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
  const [openCreate, setOpenCreate] = useState(false);
  const [closing, setClosing] = useState<OnlineCampaign | null>(null);

  const campaigns = useMemo(()=> santaData?.onlineCampaigns || [], [santaData]);

  async function persist(next: OnlineCampaign[]) {
    setData(prev => prev ? ({ ...prev, onlineCampaigns: next }) : prev);
    if (isPersistenceEnabled) await saveCollection("onlineCampaigns", next);
  }

  async function handleCreate(input: Parameters<React.ComponentProps<typeof NewCampaignDialog>["onSave"]>[0]) {
    if (!santaData) return;
    const now = new Date().toISOString();
    const doc: OnlineCampaign = {
      id: `online_${Date.now()}`,
      title: input.title,
      channel: input.channel,
      status: "planned",
      startAt: input.startAt,
      endAt: input.endAt,
      ownerUserId: input.ownerUserId,
      budget: input.budget,
      spend: 0,
      tracking: input.tracking,
      metrics: { impressions: 0, clicks: 0, revenue: 0 },
      createdAt: now,
      updatedAt: now,
    } as OnlineCampaign;
    await persist([ ...campaigns, doc ]);
  }

  async function handleUpdate(updated: OnlineCampaign) {
    const next = campaigns.map(c => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : c);
    await persist(next);
  }

  async function handleComplete(campaign: OnlineCampaign, payload: { spend:number; impressions:number; clicks:number; revenue:number; orders?:number }) {
    // Guard defensivo (además de validación del dialogo)
    const required: (keyof typeof payload)[] = ["spend","impressions","clicks","revenue"];
    if (required.some(k => payload[k] === undefined || Number.isNaN(Number(payload[k])) || Number(payload[k])<0)) return;

    const next = campaigns.map(c => {
      if (c.id !== campaign.id) return c;
      const ctr = payload.impressions>0 ? payload.clicks/payload.impressions : 0;
      const cpc = payload.clicks>0 ? payload.spend/payload.clicks : 0;
      const cpm = payload.impressions>0 ? payload.spend/(payload.impressions/1000) : 0;
      const roas = payload.spend>0 ? payload.revenue/payload.spend : 0;
      const cac  = payload.orders && payload.orders>0 ? payload.spend/payload.orders : undefined;

      return {
        ...c,
        status: "closed",
        spend: payload.spend,
        metrics: {
          ...c.metrics,
          impressions: payload.impressions,
          clicks: payload.clicks,
          revenue: payload.revenue,
          orders: payload.orders,
          ctr, cpc, cpm, roas, cac,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      } as OnlineCampaign;
    });
    await persist(next);
  }

  const insights = useMemo(()=> buildPaidInsights(campaigns, 300), [campaigns]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-zinc-800">Paid Media — Campañas Online</h1>
          <SBButton onClick={()=>setOpenCreate(true)}><Plus size={16} className="mr-2" /> Nueva campaña</SBButton>
        </div>

        {/* KPI Cards */}
        <PaidKpiCards campaigns={campaigns} />

        {/* Leaderboard con etiquetas */}
        <SBCard title="Leaderboard (prioridad de acción)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="p-2">Campaña</th>
                  <th className="p-2">Canal</th>
                  <th className="p-2 text-right">ROAS</th>
                  <th className="p-2 text-right">CPC</th>
                  <th className="p-2 text-right">CPM</th>
                  <th className="p-2 text-right">CTR</th>
                  <th className="p-2 text-right">Pedidos</th>
                  <th className="p-2 text-right">Score</th>
                  <th className="p-2">Etiqueta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {insights.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="p-2 font-medium">{row.title}</td>
                    <td className="p-2">{row.channel}</td>
                    <td className="p-2 text-right">{row._stats.roas ? `${row._stats.roas.toFixed(2)}x` : "—"}</td>
                    <td className="p-2 text-right">{row._stats.cpc ? fmtEur(row._stats.cpc) : "—"}</td>
                    <td className="p-2 text-right">{row._stats.cpm ? fmtEur(row._stats.cpm) : "—"}</td>
                    <td className="p-2 text-right">{((row._stats.ctr || 0)*100).toFixed(2)}%</td>
                    <td className="p-2 text-right">{fmtNum(row.metrics?.orders)}</td>
                    <td className="p-2 text-right">{row._score.toFixed(2)}</td>
                    <td className="p-2">
                      <span className={
                        row._label==='WIN'   ? 'px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700' :
                        row._label==='SCALE' ? 'px-2 py-1 text-xs rounded bg-blue-100 text-blue-700' :
                        row._label==='FIX'   ? 'px-2 py-1 text-xs rounded bg-amber-100 text-amber-700' :
                                               'px-2 py-1 text-xs rounded bg-rose-100 text-rose-700'
                      }>{row._label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SBCard>

        {/* Tabla principal (edición y cierre) */}
        <SBCard title="Resultados de Campañas Online">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="p-3">Campaña</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Presupuesto</th>
                  <th className="p-3 text-right">Gasto</th>
                  <th className="p-3 text-right">Impresiones</th>
                  <th className="p-3 text-right">Clicks</th>
                  <th className="p-3 text-right">ROAS</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {campaigns.map(c => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    onUpdate={handleUpdate}
                    onCloseRequest={(cc)=>setClosing(cc)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SBCard>
      </div>

      {/* Dialogos */}
      <NewCampaignDialog open={openCreate} onClose={()=>setOpenCreate(false)} onSave={handleCreate} />
      <CloseCampaignDialog
        open={!!closing}
        onClose={()=>setClosing(null)}
        onSubmit={(payload)=> closing && handleComplete(closing, payload)}
      />
    </>
  );
}
```