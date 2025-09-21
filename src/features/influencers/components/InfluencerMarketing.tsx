
"use client";

// ========================================================
// Santa Brisa — Influencer Marketing Module (single-file)
// ========================================================

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus2, Sparkles, Search, Filter, LayoutGrid, List,
  ExternalLink, Tags, Plus, BarChart3, Link2, CalendarClock,
  DollarSign, Check, X, ChevronDown, UploadCloud, Pencil, PieChart,
} from "lucide-react";
import type { InfluencerCollab, Platform, Tier, Deliverable, CompType, CollabStatus as InfStatus } from "@/domain/ssot";
import { listCollabs } from "@/features/production/ssot-bridge";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";

// =============== Utilidades métricas ===============
function sumCosts(c?: InfluencerCollab["costs"]) {
  if (!c) return 0;
  return (c.productCost || 0) + (c.shippingCost || 0) + (c.cashPaid || 0) + (c.otherCost || 0);
}
function roas(collab: InfluencerCollab) {
  const rev = collab.tracking?.revenue || 0;
  const cost = sumCosts(collab.costs);
  if (cost <= 0) return rev > 0 ? Infinity : 0;
  return rev / cost;
}
function cac(collab: InfluencerCollab) {
  const orders = collab.tracking?.orders || 0;
  const cost = sumCosts(collab.costs);
  return orders > 0 ? cost / orders : 0;
}
function cpe(collab: InfluencerCollab) {
  const engagement =
    (collab.tracking?.likes || 0) +
    (collab.tracking?.comments || 0) +
    (collab.tracking?.saves || 0) +
    (collab.tracking?.shares || 0);
  const cost = sumCosts(collab.costs);
  return engagement > 0 ? cost / engagement : 0;
}
function cpv(collab: InfluencerCollab) {
  const v = collab.tracking?.views || collab.tracking?.impressions || 0;
  const cost = sumCosts(collab.costs);
  return v > 0 ? cost / v : 0;
}
function fmtEur(n: number) {
  return n === Infinity ? "∞" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
}
function fmtNum(n?: number) {
  return new Intl.NumberFormat("es-ES").format(n || 0);
}


function isoNow() { return new Date().toISOString(); }
function isoPlusDays(d: number) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 16);
}

// =============== Modales (crear/editar, registrar resultados) ===============
function CollabForm({
  defaults,
  onSubmit,
  onCancel,
  components,
}: {
  defaults?: Partial<InfluencerCollab>;
  onSubmit: (data: Partial<InfluencerCollab>) => void;
  onCancel: () => void;
  components: any;
}) {
  const { Input, Select, Textarea } = components;
  const [creatorName, setCreatorName] = useState(defaults?.creatorName || "");
  const [handle, setHandle] = useState(defaults?.handle || "");
  const [platform, setPlatform] = useState<Platform>(defaults?.platform || "Instagram");
  const [tier, setTier] = useState<Tier>(defaults?.tier || "micro");
  const [status, setStatus] = useState<InfStatus>(defaults?.status || "PROSPECT");
  const [owner, setOwner] = useState(defaults?.ownerUserId || "");
  const [coupon, setCoupon] = useState(defaults?.couponCode || "");
  const [utm, setUtm] = useState(defaults?.utmCampaign || "");
  const [landingUrl, setLU] = useState(defaults?.landingUrl || "");
  const [compType, setCompType] = useState<CompType>(defaults?.compensation?.type || "gift");
  const [compAmount, setCompAmount] = useState<number>(defaults?.compensation?.amount || 0);
  const [notes, setNotes] = useState(defaults?.notes || "");

  const [deliverables, setDeliverables] = useState<InfluencerCollab["deliverables"]>(
    defaults?.deliverables?.length ? defaults.deliverables : [{ kind: "reel", qty: 1, dueAt: isoPlusDays(7) }]
  );

  function addDeliv() { setDeliverables(v => [...v, { kind: "story", qty: 1 }]); }
  function setDeliv(i: number, patch: Partial<InfluencerCollab["deliverables"][number]>) {
    setDeliverables(v => v.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function rmDeliv(i: number) { setDeliverables(v => v.filter((_, idx) => idx !== i)); }

  function submit() {
    if (!creatorName) return alert("Falta el nombre del creador/a");
    onSubmit({
      creatorName, handle, platform, tier,
      status, ownerUserId: owner, couponCode: coupon, utmCampaign: utm, landingUrl,
      compensation: { type: compType, amount: compAmount || undefined },
      deliverables, notes,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-600">Creador/a</label><Input value={creatorName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatorName(e.target.value)} placeholder="Ej. Marta Foodie" /></div>
        <div><label className="text-xs text-zinc-600">Handle</label><Input value={handle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandle(e.target.value)} placeholder="@usuario" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-zinc-600">Plataforma</label>
          <Select value={platform} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlatform(e.target.value as Platform)}>
            <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitch</option><option>Blog</option><option>Otro</option>
          </Select>
        </div>
        <div><label className="text-xs text-zinc-600">Tier</label>
          <Select value={tier} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTier(e.target.value as Tier)}>
            <option value="nano">nano (&lt;10k)</option>
            <option value="micro">micro (10–100k)</option>
            <option value="mid">mid (100–500k)</option>
            <option value="macro">macro (&gt;500k)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs text-zinc-600">Estado</label>
          <Select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as InfStatus)}>
            <option value="PROSPECT">Prospect</option>
            <option value="OUTREACH">Outreach</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="AGREED">Agreed</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAUSED">Paused</option>
            <option value="DECLINED">Declined</option>
          </Select>
        </div>
        <div><label className="text-xs text-zinc-600">Owner</label><Input value={owner} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwner(e.target.value)} placeholder="Nico / Annso / …" /></div>
        <div><label className="text-xs text-zinc-600">Compensación</label>
          <Select value={compType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompType(e.target.value as CompType)}>
            <option value="gift">Gift</option><option value="flat">Flat</option><option value="cpa">CPA</option><option value="cpc">CPC</option><option value="revshare">RevShare</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs text-zinc-600">Importe (€)</label><Input type="number" value={compAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompAmount(Number(e.target.value || 0))} placeholder="p.ej. 500" /></div>
        <div><label className="text-xs text-zinc-600">Cupón</label><Input value={coupon} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCoupon(e.target.value)} placeholder="SB-MARTA10" /></div>
        <div><label className="text-xs text-zinc-600">UTM</label><Input value={utm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtm(e.target.value)} placeholder="utm_campaign=SB_influencers_..." /></div>
      </div>
      <div><label className="text-xs text-zinc-600">Landing</label><Input value={landingUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLU(e.target.value)} placeholder="https://santabrisa.es/pack-marta?..." /></div>

      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b bg-zinc-50">Entregables</div>
        {deliverables.map((d, i) => (
          <div key={i} className="grid grid-cols-[1.2fr_0.6fr_1fr_40px] gap-2 items-center px-3 py-2 border-b last:border-b-0">
            <Select value={d.kind} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDeliv(i, { kind: e.target.value as Deliverable })}>
              <option value="post">Post</option><option value="story">Story</option><option value="reel">Reel</option>
              <option value="short">Short</option><option value="video_long">Video largo</option><option value="stream">Stream</option><option value="blogpost">Blogpost</option>
            </Select>
            <Input type="number" min={1} value={d.qty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliv(i, { qty: Number(e.target.value) })} />
            <Input type="datetime-local" value={d.dueAt || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliv(i, { dueAt: e.target.value })} />
            <button onClick={() => rmDeliv(i)} className="p-2 rounded-md hover:bg-zinc-100" aria-label="Eliminar"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="px-3 py-2">
          <button onClick={addDeliv} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-zinc-300 bg-white hover:bg-zinc-50">
            <Plus className="h-3.5 w-3.5" /> Añadir entregable
          </button>
        </div>
      </div>

      <div><label className="text-xs text-zinc-600">Notas</label><Textarea rows={3} value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} placeholder="Bajada creativa, referencias, aprobaciones…" /></div>
    </div>
  );
}

function ResultsForm({
  collab,
  onSubmit,
  onCancel,
  components,
}: {
  collab: InfluencerCollab;
  onSubmit: (patch: Partial<InfluencerCollab>) => void;
  onCancel: () => void;
  components: any;
}) {
  const { Input } = components;
  const [clicks, setClicks] = useState(collab.tracking?.clicks || 0);
  const [orders, setOrders] = useState(collab.tracking?.orders || 0);
  const [revenue, setRevenue] = useState(collab.tracking?.revenue || 0);
  const [views, setViews] = useState(collab.tracking?.views || collab.tracking?.impressions || 0);
  const [likes, setLikes] = useState(collab.tracking?.likes || 0);
  const [comments, setComments] = useState(collab.tracking?.comments || 0);
  const [saves, setSaves] = useState(collab.tracking?.saves || 0);
  const [shares, setShares] = useState(collab.tracking?.shares || 0);
  const [productCost, setPC] = useState(collab.costs?.productCost || 0);
  const [shippingCost, setSC] = useState(collab.costs?.shippingCost || 0);
  const [cashPaid, setCash] = useState(collab.costs?.cashPaid || 0);
  const [otherCost, setOC] = useState(collab.costs?.otherCost || 0);

  function submit() {
    onSubmit({
      costs: { productCost, shippingCost, cashPaid, otherCost },
      tracking: {
        ...collab.tracking,
        clicks, orders, revenue,
        views, impressions: views,
        likes, comments, saves, shares,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div><label className="text-xs text-zinc-600">Clicks</label><Input type="number" value={clicks} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClicks(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Pedidos</label><Input type="number" value={orders} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrders(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Ingresos (€)</label><Input type="number" value={revenue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevenue(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Views/Imp.</label><Input type="number" value={views} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setViews(+e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div><label className="text-xs text-zinc-600">Likes</label><Input type="number" value={likes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLikes(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Comentarios</label><Input type="number" value={comments} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComments(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Saves</label><Input type="number" value={saves} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaves(+e.target.value)} /></div>
        <div><label className="text-xs text-zinc-600">Shares</label><Input type="number" value={shares} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShares(+e.target.value)} /></div>
      </div>

      <div className="rounded-xl border border-zinc-200">
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b bg-zinc-50">Costes</div>
        <div className="grid grid-cols-4 gap-3 p-3">
          <div><label className="text-xs text-zinc-600">Producto</label><Input type="number" value={productCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPC(+e.target.value)} /></div>
          <div><label className="text-xs text-zinc-600">Envío</label><Input type="number" value={shippingCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSC(+e.target.value)} /></div>
          <div><label className="text-xs text-zinc-600">Cash</label><Input type="number" value={cashPaid} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCash(+e.target.value)} /></div>
          <div><label className="text-xs text-zinc-600">Otros</label><Input type="number" value={otherCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOC(+e.target.value)} /></div>
        </div>
      </div>
    </div>
  );
}


// =============== Fila de la tabla ===============
function CollabRow({ c, onEdit, onResults, onStatus, components }: {
  c: InfluencerCollab; onEdit: (c: InfluencerCollab) => void; onResults: (c: InfluencerCollab) => void; onStatus: (id: string, s: InfStatus) => void; components: any;
}) {
  const { Select } = components;
  const r = roas(c);
  return (
    <tr className="border-b">
      <td className="px-2 py-2 pr-3">
        <div className="font-medium text-sm text-zinc-800">{c.creatorName}</div>
        <div className="text-xs text-zinc-500">{c.handle || "—"}</div>
      </td>
      <td className="px-2 py-2 pr-3 capitalize">{c.platform}</td>
      <td className="px-2 py-2 pr-3 capitalize">{c.tier}</td>
      <td className="px-2 py-2 pr-3">
        <Select value={c.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatus(c.id, e.target.value as InfStatus)} className="h-8 text-xs">
          <option value="PROSPECT">Prospect</option><option value="OUTREACH">Outreach</option>
          <option value="NEGOTIATING">Negotiating</option><option value="AGREED">Agreed</option>
          <option value="LIVE">Live</option><option value="COMPLETED">Completed</option>
          <option value="PAUSED">Paused</option><option value="DECLINED">Declined</option>
        </Select>
      </td>
      <td className="px-2 py-2 pr-3 text-xs">{c.deliverables.map(d => `${d.qty} ${d.kind}`).join(", ")}</td>
      <td className="px-2 py-2 pr-3 text-xs font-mono">{c.couponCode || "—"}</td>
      <td className="px-2 py-2 pr-3 text-right font-medium">{fmtNum(c.tracking?.orders)}</td>
      <td className="px-2 py-2 pr-3 text-right font-medium">{fmtEur(c.tracking?.revenue || 0)}</td>
      <td className={`px-2 py-2 pr-3 text-right font-bold ${r >= 3 ? "text-emerald-600" : r >= 1 ? "text-amber-600" : "text-rose-600"}`}>
        {r === Infinity ? "∞" : `${r.toFixed(2)}x`}
      </td>
      <td className="px-2 py-2 pr-3 text-xs">{c.ownerUserId || "—"}</td>
      <td className="px-2 py-2 pr-3">
        <div className="flex gap-2">
          <button onClick={() => onEdit(c)} className="p-1.5 rounded-md border hover:bg-zinc-50" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onResults(c)} className="p-1.5 rounded-md border hover:bg-zinc-50" aria-label="Resultados"><BarChart3 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
}

// =============== Vista principal ===============
export default function InfluencerMarketing({ components }: { components: any }) {
  const { SB_COLORS, waterHeader, hexToRgba, AgaveEdge, Input, Select } = components;
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [status, setStatus] = useState<InfStatus | "all">("all");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [data, setData] = useState<InfluencerCollab[]>([]);

  useEffect(() => {
    listCollabs().then(setData);
  }, []);

  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<InfluencerCollab | null>(null);
  const [resultsFor, setResultsFor] = useState<InfluencerCollab | null>(null);

  // KPIs MTD (demo: sobre dataset entero)
  const kpi = useMemo(() => {
    const actives = data.filter(d => ["OUTREACH", "NEGOTIATING", "AGREED", "LIVE"].includes(d.status)).length;
    const liveToday = data.filter(d => d.status === "LIVE").length;

    const spend = data.reduce((s, d) => s + sumCosts(d.costs), 0);
    const revenue = data.reduce((s, d) => s + (d.tracking?.revenue || 0), 0);
    const roasAll = spend > 0 ? revenue / spend : 0;

    return { actives, liveToday, spend, revenue, roasAll };
  }, [data]);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    return data.filter(d => {
      const okQ =
        !q ||
        d.creatorName.toLowerCase().includes(q) ||
        (d.handle || "").toLowerCase().includes(q) ||
        (d.ownerUserId || "").toLowerCase().includes(q) ||
        (d.couponCode || "").toLowerCase().includes(q);
      const okP = platform === "all" || d.platform === platform;
      const okS = status === "all" || d.status === status;
      const okT = tier === "all" || d.tier === tier;
      return okQ && okP && okS && okT;
    });
  }, [data, query, platform, status, tier]);

  // Handlers (conecta aquí a Firestore/SSOT)
  function upsert(patch: Partial<InfluencerCollab>, base?: InfluencerCollab) {
    if (base) {
      setData(prev => prev.map(x => (x.id === base.id ? { ...x, ...patch, deliverables: patch.deliverables || x.deliverables, compensation: patch.compensation || x.compensation, tracking: { ...x.tracking, ...patch.tracking }, costs: { ...x.costs, ...patch.costs } } as InfluencerCollab : x)));
    } else {
      const id = "collab_" + Math.random().toString(36).slice(2, 9);
      const newCollab: InfluencerCollab = {
          id, creatorId: `creator_${Date.now()}`, status: "PROSPECT", tier: "nano", platform: "Instagram", creatorName: "Nuevo/a", deliverables: [], compensation: { type: "gift" },
          createdAt: isoNow(), updatedAt: isoNow(),
          ...patch,
          supplierPartyId: '' // Needs to be filled
      };
      setData(prev => [newCollab, ...prev]);
    }
  }
  function setStatusOf(id: string, s: InfStatus) {
    setData(prev => prev.map(x => (x.id === id ? { ...x, status: s } : x)));
  }

  return (
    <div className="w-full">
      {/* Header/KPIs */}
      <div className="rounded-2xl border overflow-hidden mb-4" style={{ borderColor: hexToRgba(SB_COLORS.marketing, 0.25) }}>
        <div className="relative" style={{ background: waterHeader("influ:hdr", SB_COLORS.marketing), borderColor: hexToRgba(SB_COLORS.marketing, 0.18) }}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Influencer Marketing</div>
            <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-white border hover:brightness-95"><UserPlus2 className="h-4 w-4" /> Nueva colaboración</button>
          </div>
          <div className="absolute left-0 right-0 -bottom-px"><AgaveEdge /></div>
        </div>

        {/* KPI row */}
        <div className="grid sm:grid-cols-4 grid-cols-2 gap-2 p-3 bg-white">
          <Kpi label="Activas" value={kpi.actives} icon={<Sparkles className="h-4 w-4" />} />
          <Kpi label="En vivo" value={kpi.liveToday} icon={<CalendarClock className="h-4 w-4" />} />
          <Kpi label="Gasto (MTD)" value={fmtEur(kpi.spend)} icon={<DollarSign className="h-4 w-4" />} />
          <Kpi label="ROAS (MTD)" value={kpi.roasAll ? `${kpi.roasAll.toFixed(2)}x` : "0.00x"} icon={<BarChart3 className="h-4 w-4" />} />
        </div>
      </div>

      {/* Toolbar filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por creador, handle, owner, cupón…"
            className="w-[320px] pl-9 pr-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 focus:ring-[#F7D15F]" />
        </div>
        <div className="flex items-center gap-2">
          <FilterPill label="Plataforma">
            <Select value={platform} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlatform(e.target.value as any)}><option value="all">Todas</option><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitch</option><option>Blog</option><option>Otro</option></Select>
          </FilterPill>
          <FilterPill label="Estado">
            <Select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="PROSPECT">Prospect</option><option value="OUTREACH">Outreach</option>
              <option value="NEGOTIATING">Negotiating</option><option value="AGREED">Agreed</option>
              <option value="LIVE">Live</option><option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option><option value="DECLINED">Declined</option>
            </Select>
          </FilterPill>
          <FilterPill label="Tier">
            <Select value={tier} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTier(e.target.value as any)}><option value="all">Todos</option><option value="nano">nano</option><option value="micro">micro</option><option value="mid">mid</option><option value="macro">macro</option></Select>
          </FilterPill>
        </div>
      </div>

      {/* Contenido */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2 pr-3">Creador</th>
                  <th className="px-2 py-2 pr-3">Plataforma</th>
                  <th className="px-2 py-2 pr-3">Tier</th>
                  <th className="px-2 py-2 pr-3">Estado</th>
                  <th className="px-2 py-2 pr-3">Entregables</th>
                  <th className="px-2 py-2 pr-3">Cupón</th>
                  <th className="px-2 py-2 pr-3 text-right">Pedidos</th>
                  <th className="px-2 py-2 pr-3 text-right">Ingresos</th>
                  <th className="px-2 py-2 pr-3 text-right">ROAS</th>
                  <th className="px-2 py-2 pr-3">Owner</th>
                  <th className="px-2 py-2 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filtered.map(c => (
                  <CollabRow key={c.id} c={c} components={components} onEdit={setEditing} onResults={setResultsFor} onStatus={setStatusOf} />
                ))}
              </tbody>
            </table>
        </div>
      </div>

      <SBDialog open={openCreate} onOpenChange={setOpenCreate}>
        <SBDialogContent title="Nueva Colaboración" size="lg" onSubmit={(e) => { e.preventDefault(); upsert({}); setOpenCreate(false); }} primaryAction={{label: "Crear", onClick: () => {}}} secondaryAction={{label: "Cancelar", onClick: () => setOpenCreate(false)}}>
             <CollabForm components={components} onCancel={() => setOpenCreate(false)} onSubmit={(p) => { upsert(p); setOpenCreate(false); }} />
        </SBDialogContent>
      </SBDialog>
      
      <SBDialog open={!!editing} onOpenChange={() => setEditing(null)}>
        {editing && <SBDialogContent title="Editar Colaboración"  size="lg" onSubmit={(e) => { e.preventDefault(); setEditing(null);}} primaryAction={{label: "Guardar", onClick: () => {}}} secondaryAction={{label: "Cancelar", onClick: () => setEditing(null)}}>
            <CollabForm defaults={editing} components={components} onCancel={() => setEditing(null)} onSubmit={(p) => { upsert(p, editing); setEditing(null); }} />
        </SBDialogContent>}
      </SBDialog>

      <SBDialog open={!!resultsFor} onOpenChange={() => setResultsFor(null)}>
        {resultsFor && <SBDialogContent title="Registrar Resultados"  size="lg" onSubmit={(e) => { e.preventDefault(); setResultsFor(null);}} primaryAction={{label: "Guardar", onClick: () => {}}} secondaryAction={{label: "Cancelar", onClick: () => setResultsFor(null)}}>
            <ResultsForm collab={resultsFor} components={components} onCancel={() => setResultsFor(null)} onSubmit={(patch) => { upsert(patch, resultsFor); setResultsFor(null); }}/>
        </SBDialogContent>}
      </SBDialog>

    </div>
  );
}

// =============== Sub-componentes UI ===============
function Kpi({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function FilterPill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-1 py-1 rounded-lg border border-zinc-300 bg-white">
      <Filter className="h-4 w-4 text-zinc-500" /><span className="text-xs text-zinc-700">{label}:</span>{children}
    </div>
  );
}
