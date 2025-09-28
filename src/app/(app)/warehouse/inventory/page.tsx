
"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SBCard, SBButton, Input, Select, DataTableSB } from "@/components/ui/ui-primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useData } from "@/lib/dataprovider";
import type { ItemCategory, OnHandView, Lot, Item } from "@/domain/ssot";
import {
  computeSkuRollup, computeStockAlerts, computeCoverage, suggestReplenishment,
  computeExpiryBuckets, detectQcStuck, auditOnHandVsLots,
  stockStatusBadgeClass, stockStatusLabel, type SkuStockSummary,
} from "@/lib/inventory";
import {
  exportReplenishmentCsvServer,
  createManualOnHand,
  rebuildOnHand,
} from "./actions";
import { getLotTraceability as getLotDossierServer } from "@/app/(app)/quality/traceability/actions";
import { Plus, Download, Search, AlertCircle } from "lucide-react";
import { QuickGoodsReceiptDialog } from "@/features/warehouse/components/QuickGoodsReceiptDialog";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


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

export default function InventoryPage() {
  const { data } = useData();
  const onHand = (data?.onHand ?? []) as OnHandView[];
  const lotsMaster = (data?.lots ?? []) as Lot[];
  const items = (data?.items ?? []) as Item[];

  // ───────────────── toolbar state
  const [isPending, startTransition] = useTransition();
  const [globalSearch, setGlobalSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(false);
  const [cat, setCat] = useState<ItemCategory>("fg");
  const [viewMode, setViewMode] = useState<"sku" | "lot">("lot");
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // itemId o lotNumber
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const [openNew, setOpenNew] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);

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
  const skuRows = useMemo(() => Object.keys(summaries).map(itemId => ({ id: itemId, itemId })), [summaries]);
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


  const skuCols: any[] = [
    { key: "itemId", header: "SKU" },
    { key: "released", header: "Disponible", render: (r:any)=> summaries[r.itemId].totalReleasedFree },
    { key: "hold", header: "Cuarentena", render: (r:any)=> summaries[r.itemId].totalOnHold },
    { key: "expiry", header: "1ª Caducidad", render: (r:any)=> summaries[r.itemId].earliestExpiryAt ?? "—" },
    { key: "coverage", header: "Cobertura (d)", render: (r:any)=> (coverage as any)[r.itemId]?.daysCover?.toFixed?.(1) ?? "—" },
    { key: "status", header: "Estado", render: (r:any)=> {
      const st = summaries[r.itemId].status as SkuStockSummary["status"];
      return <span className={stockStatusBadgeClass(st)}>{stockStatusLabel(st)}</span>;
    }},
    { key: "replen", header: "Reposición", render: (r:any)=> replen[r.itemId] ?? 0 },
  ];

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

  const onRebuildOnHand = () => {
    startTransition(async () => {
        try {
            const result = await rebuildOnHand();
            if (result.ok) {
                toast.success(`Inventario reconstruido: ${result.data.count} registros actualizados.`);
                router.refresh();
            } else {
                toast.error(`Error al reconstruir: ${result.message}`);
            }
        } catch (e: any) {
            toast.error(`Error inesperado: ${e.message}`);
        }
    });
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
        <h1 className="text-xl font-semibold">Inventario y Recepciones</h1>
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
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={onRebuildOnHand} disabled={isPending}>Recalcular on-hand</SBButton>
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
              <div className="flex flex-wrap gap-2">
                {alerts.map((a,i)=> <span key={i} className="sb-badge sb-badge--warn">{a.itemId}: {a.message}</span>)}
                {qcStuck.map(q=> <span key={q.lotNumber} className="sb-badge sb-badge--info">QC {q.itemId}/{q.lotNumber}</span>)}
                {audit.inOnHandNotLots.length > 0 && <span className="sb-badge sb-badge--danger">Lotes sin onHand: {audit.inOnHandNotLots.length}</span>}
                {audit.inLotsNotOnHand.length > 0 && <span className="sb-badge sb-badge--danger">Lotes sin onHand: {audit.inLotsNotOnHand.length}</span>}
              </div>
            )}
          </SBCard>

          <SBCard title="Categorías">
             <div className="p-2 flex flex-wrap gap-2">
              {CATEGORY_ORDER.map(c => (
                <button
                  key={c.value}
                  onClick={()=>setCat(c.value)}
                  className={`sb-badge ${cat===c.value ? 'sb-badge--info' : ''}`}
                >
                  {c.label} <span className="ml-1 rounded bg-black/10 px-1 text-[11px]">{countsByCat[c.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </SBCard>
        </div>

        {/* Panel Central: Tabla + tabs de vista */}
        <div className="space-y-4">
          <SBCard title="Inventario" noPadding>
              <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as any)}>
                <div className="flex justify-between items-center p-4">
                  <TabsList className="relative">
                    <TabsTrigger value="lot" className="data-[state=active]:text-[color:var(--sb-accent)]">Por Lote</TabsTrigger>
                    <TabsTrigger value="sku" className="data-[state=active]:text-[color:var(--sb-accent)]">Por SKU</TabsTrigger>
                  </TabsList>
                  <div className="text-xs text-zinc-500 pr-1">Cat: {CATEGORY_ORDER.find(x=>x.value===cat)?.label}</div>
                </div>

                <TabsContent value="lot">
                  {lotRows.length === 0 ? <Empty hint="No hay lotes que cumplan los filtros." /> : <DataTableSB rows={lotRows} cols={lotCols} onRowClick={(r:any)=> setSelectedKey(r.lotNumber)} />}
                </TabsContent>
                <TabsContent value="sku">
                  {skuRows.length === 0 ? <Empty hint="No hay stock agrupado por SKU para esta vista." /> : <DataTableSB rows={skuRows} cols={skuCols} onRowClick={(r:any)=> setSelectedKey(r.itemId)} />}
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
        onSuccess={() => {
            toast.success("Entrada manual creada con éxito.");
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
        onSuccess={() => {
          toast.success("Recepción de mercancía guardada.");
          router.refresh();
        }}
        onError={(msg) => toast.error(`Error: ${msg}`)}
      />
    </div>
  );
}

    