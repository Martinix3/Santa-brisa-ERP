
"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SBCard, SBButton, Input, Select, DataTableSB } from "@/components/ui/ui-primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useData } from "@/lib/dataprovider";
import type { ItemCategory, OnHandView, Lot, Item, SkuStockSummary } from "@/domain/ssot";
import {
  computeSkuRollup, computeStockAlerts, computeCoverage, suggestReplenishment,
  computeExpiryBuckets, detectQcStuck, auditOnHandVsLots,
  stockStatusBadgeClass, stockStatusLabel,
} from "@/lib/inventory";
import {
  exportReplenishmentCsvServer,
} from "./actions";
import { getLotTraceability as getLotDossierServer } from "@/app/(app)/quality/traceability/actions";
import { Plus, Download, Search, AlertCircle, ChevronDown } from "lucide-react";
import { QuickGoodsReceiptDialog } from "@/features/warehouse/components/QuickGoodsReceiptDialog";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { RealtimeBadge } from "@/components/RealtimeBadge";
import { useLiveCollection } from "@/hooks/useLiveCollection";
import { useMutate } from "@/lib/mutate";


const CATEGORY_ORDER: { value: ItemCategory; label: string }[] = [
  { value: "fg",            label: "Producto Terminado" },
  { value: "raw",           label: "Materias Primas" },
  { value: "intermediate",  label: "Intermedios" },
  { value: "pack",          label: "Packaging y Etiquetas" },
  { value: "merch",         label: "Merchandising" },
  { value: "consumable",    label: "Consumibles" },
];

function Empty({ hint }: { hint: string }) {
  return (
    <div className="py-10 text-center text-sm text-zinc-500">{hint}</div>
  );
}

function InspectorSku({ itemId, summary, coverage, suggested }: any) {
  if (!summary) return <div className="text-sm text-zinc-500">Sin datos</div>;
  return (
    <div className="text-sm space-y-3">
      <div className="font-medium">{itemId}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>Disponible: <b>{summary.totalReleasedFree}</b></div>
        <div>Cuarentena: <b>{summary.totalOnHold}</b></div>
        <div>1ª Caducidad: <b>{summary.earliestExpiryAt ?? "—"}</b></div>
        <div>Cobertura (d): <b>{coverage?.daysCover?.toFixed?.(1) ?? "—"}</b></div>
      </div>
      <div>Estado: <span className={stockStatusBadgeClass(summary.status)}>{stockStatusLabel(summary.status)}</span></div>
      <div className="pt-2 border-t border-zinc-200/60">
        Reposición sugerida: <b>{Math.ceil(suggested ?? 0)}</b>
      </div>
    </div>
  );
}

function InspectorLot({ lotNumber, dossier }: any) {
  if (!dossier) {
    return <div className="text-sm text-zinc-500">Cargando dossier de {lotNumber}…</div>;
  }
  const { lot, qcBadge, currentStock, producedBy, receivedFrom, expDate, events } = dossier;
  return (
    <div className="text-sm space-y-3">
      <div className="font-medium">{lot.lotNumber}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>Estado QC: <b>{qcBadge}</b></div>
        <div>Caducidad: <b>{expDate ? new Date(expDate).toLocaleDateString() : "—"}</b></div>
        <div>Ubicación/Stock:</div>
        <div className="space-y-1">
          {currentStock?.length
            ? currentStock.map((s:any, i:number)=> <div key={i}>{s.locationId} ({s.qty} {s.uom})</div>)
            : <span className="text-zinc-500">—</span>}
        </div>
        <div>Origen:</div>
        <div className="space-y-1">
          {producedBy && <div>Producido en orden: {producedBy.orderId}</div>}
          {receivedFrom && <div>Recepción: {receivedFrom.grId} — Albarán: {receivedFrom.deliveryNote ?? "—"}</div>}
          {!producedBy && !receivedFrom && <span className="text-zinc-500">—</span>}
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-200/60">
        <div className="font-medium mb-1">Movimientos</div>
        <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
          {events?.map((e:any, i:number)=>(
            <div key={i} className="rounded-md border border-zinc-200/60 p-2">
              <div className="flex justify-between">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()}</div>
              </div>
              {e.subtitle && <div className="text-xs text-zinc-600">{e.subtitle}</div>}
              {e.refId && <div className="text-[11px] text-zinc-500">Ref: {e.refId}</div>}
            </div>
          ))}
          {!events?.length && <div className="text-xs text-zinc-500">Sin movimientos.</div>}
        </div>
      </div>
    </div>
  );
}


function SkuAccordionRow({ sku, summary, lots, items, onSelect, setViewMode, setSelectedKey }: { sku: SkuStockSummary; summary: SkuStockSummary; lots: OnHandView[]; items: Item[]; onSelect: (key: string) => void; setViewMode: (mode: 'sku' | 'lot') => void; setSelectedKey: (key: string | null) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const item = items.find(i => i.id === sku.itemId);
  
    return (
      <div className="border-b last:border-b-0">
        <div
          className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 p-3 cursor-pointer hover:bg-zinc-50"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          <div onClick={(e)=>{e.stopPropagation(); onSelect(sku.itemId)}}>
              <p className="font-bold text-sm text-zinc-800">{item?.name || 'Nombre Desconocido'}</p>
              <p className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded-full inline-block mt-1">{item?.sku || sku.itemId}</p>
          </div>
          <div className="text-sm font-semibold">{summary.totalReleasedFree}</div>
          <div className="text-sm font-semibold">{summary.totalOnHold}</div>
          <div className="text-sm">{summary.earliestExpiryAt ? new Date(summary.earliestExpiryAt).toLocaleDateString('es-ES') : '—'}</div>
          <div><span className={stockStatusBadgeClass(summary.status)}>{stockStatusLabel(summary.status)}</span></div>
          <SBButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSelect(sku.itemId)}}>Ver detalles</SBButton>
        </div>
        {isOpen && (
          <div className="bg-zinc-50/70 p-4 pl-12">
              <DataTableSB
                  rows={lots}
                  cols={[
                    { key: "lotNumber", header: "Lote", render: (r: any) => <span className="font-mono text-xs">{r.lotNumber}</span> },
                    { key: "qty", header: "Cantidad", render: (r:any)=> (<>{r.qty} <span className="text-xs text-zinc-500">{r.uom}</span></>) },
                    { key: "locationId", header: "Ubicación" },
                    { key: "expiryAt", header: "Caducidad", render: (r:any)=> r.expiryAt ? new Date(r.expiryAt).toLocaleDateString() : "—" },
                    { key: 'actions', header: 'Acciones', render: (r:any) => <SBButton size="sm" variant="subtle" onClick={() => { setViewMode('lot'); setSelectedKey(r.lotNumber)}}>Inspeccionar</SBButton> }
                  ]}
                  onRowClick={(r:any)=> { setViewMode('lot'); setSelectedKey(r.lotNumber)}}
              />
          </div>
        )}
      </div>
    );
  }


export default function InventoryPage() {
  const { data } = useData();
  const onHand = (data?.onHand ?? []) as OnHandView[];
  const lotsMaster = (data?.lots ?? []) as Lot[];
  const items = data?.items ?? [];

  // ───────────────── toolbar state
  const [isPending, startTransition] = useTransition();
  const [globalSearch, setGlobalSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(true);
  const [cat, setCat] = useState<ItemCategory>("fg");
  const [viewMode, setViewMode] = useState<"sku" | "lot">("lot");
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // itemId o lotNumber
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const [openNew, setOpenNew] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  
  const mutate = useMutate();

  // ⌘/Ctrl+K → foco en búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ───────────────── filtros base
  const onHandFiltered = useMemo(() => {
    let rows = onHand;
    if (cat) rows = rows.filter(r => r.category === cat);
    if (locationFilter !== "ALL") rows = rows.filter(r => r.locationId === locationFilter);
    if (onlyWithStock) rows = rows.filter(r => (r.qty - (r.reservedQty ?? 0)) > 0);
    if (globalSearch.trim()) {
      const q = globalSearch.trim().toLowerCase();
      rows = rows.filter(r =>
        r.itemId.toLowerCase().includes(q) ||
        (r.lotNumber && r.lotNumber.toLowerCase().includes(q)) ||
        (items.find(i => i.id === r.itemId)?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows;
  }, [onHand, items, cat, locationFilter, onlyWithStock, globalSearch]);

  // ───────────────── KPIs y derivados
  const summaries = useMemo(() => computeSkuRollup(onHandFiltered, { nearExpiryDays: 45 }), [onHandFiltered]);
  const alerts = useMemo(() => computeStockAlerts(summaries), [summaries]);
  const coverage = useMemo(() => computeCoverage(summaries, [], 30), [summaries]); // si tienes velocityHistory, pásalo aquí
  const replen = useMemo(() => suggestReplenishment(summaries, coverage as any, {
    minStockByItem: {}, safetyByItem: {}, targetDaysOfCover: 14
  }), [summaries, coverage]);
  const expiryBuckets = useMemo(() => computeExpiryBuckets(onHandFiltered, 7, 45), [onHandFiltered]);
  const qcStuck = useMemo(() => detectQcStuck(onHandFiltered, new Date(), 3), [onHandFiltered]);
  const audit = useMemo(() => auditOnHandVsLots(onHandFiltered, lotsMaster), [onHandFiltered, lotsMaster]);

  // ───────────────── contadores por categoría (badges en tabs)
  const countsByCat = useMemo(() => {
    const map: Partial<Record<ItemCategory, number>> = {};
    for (const r of onHand) {
      if (r.category) {
        map[r.category] = (map[r.category] ?? 0) + 1;
      }
    }
    return map;
  }, [onHand]);

  // ───────────────── listas para las tablas
  const skusWithLots = useMemo(() => {
      return Object.values(summaries).map(summary => ({
          summary,
          lots: onHandFiltered.filter(lot => lot.itemId === summary.itemId)
      })).sort((a,b) => (items.find(i => i.id === a.summary.itemId)?.name || '').localeCompare(items.find(i => i.id === b.summary.itemId)?.name || ''));
  }, [summaries, onHandFiltered, items]);

  const lotRows = useMemo(() => onHandFiltered
    .sort((a, b) => (a.lotNumber || '').localeCompare(b.lotNumber || ''))
    .map(r => ({
      id: r.id,
      lotNumber: r.lotNumber,
      itemId: r.itemId,
      name: items.find(i => i.id === r.itemId)?.name ?? r.itemId,
      qty: r.qty,
      free: Math.max(0, r.qty - (r.reservedQty ?? 0)),
      uom: r.uom,
      locationId: r.locationId,
      expiryAt: r.expiryAt ?? null,
      updatedAt: r.updatedAt,
  })), [onHandFiltered, items]);


  const lotCols: any[] = [
    { key: "lotNumber", header: "Lote", render: (r: any) => <span className="font-mono text-xs">{r.lotNumber}</span> },
    { key: "name", header: "Producto (SKU)", render: (r:any)=> (
        <div className="leading-tight">
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-zinc-500">{r.itemId}</div>
        </div>
      )
    },
    { key: "free", header: "Cantidad", render: (r:any)=> (<>{r.free} <span className="text-xs text-zinc-500">{r.uom}</span></>) },
    { key: "locationId", header: "Ubicación" },
    { key: "expiryAt", header: "Fecha", render: (r:any)=> r.expiryAt ? new Date(r.expiryAt).toLocaleDateString() : "—" },
  ];

  // ───────────────── acciones
  const onExportReplen = async () => {
    const url = await exportReplenishmentCsvServer(replen);
    const a = document.createElement("a");
    a.href = url; a.download = "replenishment.csv"; a.click();
  };

  // ───────────────── dossier lote (inspector)
  const [dossier, setDossier] = useState<any>(null);
  useEffect(() => {
    if (viewMode === "lot" && selectedKey) {
      getLotDossierServer(selectedKey).then((res) => {
        if(res.ok) setDossier(res.data);
        else setDossier(null);
      });
    } else {
      setDossier(null);
    }
  }, [viewMode, selectedKey]);

  // ───────────────── ubicaciones únicas (select)
  const locations = useMemo(() => {
    const set = new Set<string>();
    onHand.forEach(o => { if (o.locationId) set.add(o.locationId); });
    return ["ALL", ...Array.from(set)];
  }, [onHand]);

  const ACCENT = "var(--sb-accent-logistica)";
  const BTN_OUTLINE = `border text-[color:${ACCENT}] border-[color:${ACCENT}] hover:bg-[color:${ACCENT}]/10`;
  const BTN_SOLID = `bg-[color:${ACCENT}] text-white hover:opacity-90`;

  return (
    <div className="space-y-4" style={{'--sb-accent': 'var(--sb-accent-logistica)'} as React.CSSProperties}>
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
            Inventario y Recepciones
            <RealtimeBadge />
        </h1>
        <p className="text-sm text-zinc-500">Vista en tiempo real del stock y registro de entradas.</p>
      </div>

      {/* TOOLBAR (sticky) */}
      <div className="sticky top-[64px] z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="flex-1 flex gap-2 min-w-[260px]">
          <Input
            ref={searchRef}
            placeholder="Buscar por SKU, nombre, lote… (⌘/Ctrl+K)"
            value={globalSearch}
            onChange={e=>setGlobalSearch(e.target.value)}
          />
          <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            {locations.map(loc => <option key={loc} value={loc}>{loc === "ALL" ? "Todas Ubicaciones" : loc}</option>)}
          </Select>
          <label className="flex items-center gap-2 pl-2 text-sm">
            <input type="checkbox" checked={onlyWithStock} onChange={e=>setOnlyWithStock(e.target.checked)} />
            Mostrar Lotes con Stock
          </label>
        </div>
        <div className="flex gap-2">
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={onExportReplen}>Exportar</SBButton>
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={() => setOpenReceipt(true)}>Nueva Recepción</SBButton>
          <SBButton className={BTN_SOLID} onClick={() => setOpenNew(true)}>Ajuste Manual</SBButton>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_360px] gap-4">
        {/* Panel Izquierdo: Alertas + Categorías */}
        <div className="space-y-4">
          <SBCard title="Alertas de Inventario">
            {(alerts.length === 0 && qcStuck.length === 0 && (audit.inOnHandNotLots.length + audit.inLotsNotOnHand.length) === 0) ? (
              <div className="text-sm text-zinc-500 p-4">Sin alertas</div>
            ) : (
              <div className="p-2 space-y-1">
                {alerts.map((a,i)=> <div key={i} className="text-xs p-1.5 rounded-md bg-amber-50 text-amber-800 flex items-center gap-2"><AlertCircle size={14}/> {a.itemId}: {a.message}</div>)}
                {qcStuck.map(q=> <div key={q.lotNumber} className="text-xs p-1.5 rounded-md bg-blue-50 text-blue-800 flex items-center gap-2"><AlertCircle size={14}/> QC {q.itemId}/{q.lotNumber}</div>)}
                {audit.inOnHandNotLots.length > 0 && <div className="text-xs p-1.5 rounded-md bg-red-50 text-red-800 flex items-center gap-2"><AlertCircle size={14}/> Lotes sin onHand: {audit.inOnHandNotLots.length}</div>}
                {audit.inLotsNotOnHand.length > 0 && <div className="text-xs p-1.5 rounded-md bg-red-50 text-red-800 flex items-center gap-2"><AlertCircle size={14}/> onHand sin Lote: {audit.inLotsNotOnHand.length}</div>}
              </div>
            )}
          </SBCard>

          <SBCard title="Categorías" noPadding>
             <div className="p-2 flex flex-wrap gap-2">
              {CATEGORY_ORDER.map(c => (
                <button
                  key={c.value}
                  onClick={()=>setCat(c.value)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${cat===c.value ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white hover:bg-zinc-50'}`}
                >
                  {c.label} <span className="ml-1 rounded bg-black/10 px-1 text-[10px]">{countsByCat[c.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </SBCard>
        </div>

        {/* Panel Central: Tabla + tabs de vista */}
        <div className="space-y-4">
          <SBCard title="Inventario" noPadding>
              <Tabs value={viewMode} onValueChange={(v: string) => { setViewMode(v as any); setSelectedKey(null); }}>
                <div className="flex justify-between items-center p-4">
                  <TabsList className="relative">
                    <TabsTrigger value="lot" className="data-[state=active]:text-[color:var(--sb-accent)]">Por Lote</TabsTrigger>
                    <TabsTrigger value="sku" className="data-[state=active]:text-[color:var(--sb-accent)]">Por SKU</TabsTrigger>
                  </TabsList>
                  <div className="text-xs text-zinc-500 pr-1">Cat: {CATEGORY_ORDER.find(x=>x.value===cat)?.label}</div>
                </div>

                <TabsContent value="lot">
                  {lotRows.length === 0 ? <Empty hint="No hay lotes que cumplan los filtros." /> : <DataTableSB rows={lotRows} cols={lotCols} onRowClick={(r:any)=> {setViewMode('lot'); setSelectedKey(r.lotNumber)}} />}
                </TabsContent>
                <TabsContent value="sku">
                  <div className="divide-y">
                     <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                        <div/>
                        <span>Producto</span>
                        <span>Disp.</span>
                        <span>En QC</span>
                        <span>Cad. Próx.</span>
                        <span>Estado</span>
                        <div/>
                    </div>
                    {skusWithLots.length === 0 ? <Empty hint="No hay stock agrupado por SKU para esta vista." /> : (
                        skusWithLots.map(s => <SkuAccordionRow key={s.summary.itemId} sku={s.summary} summary={s.summary} lots={s.lots} items={items} onSelect={setSelectedKey} setViewMode={setViewMode} setSelectedKey={setSelectedKey} />)
                    )}
                  </div>
                </TabsContent>
              </Tabs>
          </SBCard>
        </div>

        {/* Panel Derecho: Inspector */}
        <div className="space-y-4">
          <SBCard title="Inspector">
            <div className="p-4">
              {!selectedKey ? (
                <div className="text-sm text-zinc-500">Selecciona un {viewMode === "sku" ? "SKU" : "Lote"}…</div>
              ) : viewMode === "sku" ? (
                <InspectorSku itemId={selectedKey} summary={summaries[selectedKey]} coverage={(coverage as any)[selectedKey]} suggested={replen[selectedKey] ?? 0} />
              ) : (
                <InspectorLot lotNumber={selectedKey} dossier={dossier} />
              )}
            </div>
          </SBCard>
        </div>
      </div>
       <NewOnHandDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        onSuccess={(result) => {
            mutate(() => Promise.resolve({ ok: true, id: result.lotNumber }), { label: "Ajuste manual" });
            router.refresh();
            setOpenNew(false);
        }}
        onError={(msg) => toast.error(`Error: ${msg}`)}
        items={items || []}
        locations={locations.filter(l => l !== 'ALL')}
        defaultLocation={locationFilter === 'ALL' ? undefined : locationFilter}
      />
      <QuickGoodsReceiptDialog
        open={openReceipt}
        onOpenChange={setOpenReceipt}
        onSuccess={(info) => {
          mutate(() => Promise.resolve({ ok: true, id: info.receiptNumber }), { label: "Recepción de mercancía" });
          router.refresh();
        }}
        onError={(msg) => toast.error(`Error: ${msg}`)}
      />
    </div>
  );
}
