// src/app/(app)/warehouse/inventory/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useData } from "@/lib/dataprovider";
import { SBCard, SBButton, Input, Select } from "@/components/ui/ui-primitives";
import type { Item, OnHandView } from "@/domain/ssot";
import {
  computeSkuRollup,
  computeStockAlerts, type StockAlert
} from "@/lib/inventory";
import { Plus, Search, AlertCircle, RefreshCw, Filter } from "lucide-react";
import { RealtimeBadge } from "@/components/RealtimeBadge";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { rebuildOnHand, performDataQualityCheck } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LotDetailPanel } from "./components/LotDetailPanel";
import { SkuAccordionRow } from "./components/SkuAccordionRow";
import { LotRows } from "./components/LotRows";
import { InventoryDashboard } from "@/features/warehouse/components/InventoryDashboard";
import { DataQualityCenter } from "@/features/warehouse/components/DataQualityCenter"; // 👈 1. Importar

function Empty({ hint }: { hint: string }) {
  return <div className="py-10 text-center text-sm text-zinc-500">{hint}</div>;
}

export default function InventoryPage() {
  const { data } = useData();
  const router = useRouter();
  const onHand = data?.onHand || [];
  const lotsMaster = data?.lots || [];
  const items = data?.items || [];
  const stockMoves = data?.stockMoves || [];

  const [globalSearch, setGlobalSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [qcFilter, setQcFilter] = useState<string>("ALL");
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"sku" | "lot">("sku");
  const [selectedLotNumber, setSelectedLotNumber] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [openNew, setOpenNew] = useState(false);
  const [isRebuilding, startRebuildTransition] = useTransition();

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

  const onHandFiltered = useMemo(() => {
    let rows = onHand;
    if (locationFilter !== "ALL") rows = rows.filter(r => r.locationId === locationFilter);
    if (qcFilter !== 'ALL') rows = rows.filter(r => (r.qcStatus || 'PENDING') === qcFilter);
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
  }, [onHand, items, locationFilter, qcFilter, onlyWithStock, globalSearch]);

  const summaries = useMemo(() => computeSkuRollup(onHandFiltered, { nearExpiryDays: 45 }), [onHandFiltered]);
  const alerts = useMemo(() => computeStockAlerts(summaries), [summaries]);
  
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
      qcStatus: r.qcStatus,
      expiryAt: r.expiryAt ?? null,
      updatedAt: r.updatedAt,
  })), [onHandFiltered, items]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    onHand.forEach(o => { if (o.locationId) set.add(o.locationId); });
    return ["ALL", ...Array.from(set)];
  }, [onHand]);

  const handleRebuild = () => {
    startRebuildTransition(async () => {
        toast.info("Iniciando reconstrucción del inventario...");
        const result = await rebuildOnHand();
        if (result.ok) {
            toast.success(`Inventario reconstruido: ${result.data.count} registros actualizados.`);
            router.refresh();
        } else {
            toast.error(`Error: ${result.message}`);
        }
    });
  };

  const handleViewChange = (v: string) => {
    if (v === 'sku' || v === 'lot') {
        setViewMode(v);
        setSelectedLotNumber(null);
    }
  };

  const ACCENT = "var(--sb-accent-logistica)";
  const BTN_OUTLINE = `border text-[color:${ACCENT}] border-[color:${ACCENT}] hover:bg-[color:${ACCENT}]/10`;
  const BTN_SOLID = `bg-[color:${ACCENT}] text-white hover:opacity-90`;

  const selectedLotDetails = useMemo(() => {
      if (!selectedLotNumber) return null;
      const lot = lotRows.find(l => l.lotNumber === selectedLotNumber);
      const moves = stockMoves.filter(m => m.lotNumber === selectedLotNumber);
      return lot ? { lot, moves } : null;
  }, [selectedLotNumber, lotRows, stockMoves]);

  return (
    <div className="space-y-6" style={{'--sb-accent': 'var(--sb-accent-logistica)'} as React.CSSProperties}>
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
            Inventario y Recepciones
            <RealtimeBadge />
        </h1>
        <p className="text-sm text-zinc-500">Vista en tiempo real del stock y registro de entradas.</p>
      </div>

      <InventoryDashboard summaries={Object.values(summaries)} />
      
      <DataQualityCenter /> {/* 👈 2. Añadir el componente aquí */}
      
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
          <Select value={qcFilter} onChange={(e) => setQcFilter(e.target.value)}>
            <option value="ALL">Todo QC</option>
            <option value="PASSED">Liberado</option>
            <option value="PENDING">Retenido</option>
            <option value="FAILED">Rechazado</option>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 pl-2 text-sm">
            <input type="checkbox" checked={onlyWithStock} onChange={e=>setOnlyWithStock(e.target.checked)} />
            Solo con Stock
          </label>
          <details className="relative">
              <summary className="cursor-pointer p-2 rounded-md hover:bg-zinc-100 list-none">
                  <Filter size={16} />
              </summary>
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 space-y-3 z-10">
                  <h4 className="font-semibold text-sm">Filtros Avanzados</h4>
                  <label className="block text-sm">
                      Caduca antes de:
                      <Input type="date" className="mt-1"/>
                  </label>
              </div>
          </details>
          <SBButton variant="outline" className={BTN_OUTLINE}>Exportar</SBButton>
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={() => {}}>Nueva Recepción</SBButton>
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={handleRebuild} disabled={isRebuilding}>
            <RefreshCw size={14} className={isRebuilding ? 'animate-spin' : ''} /> {isRebuilding ? '...' : 'Reconstruir'}
          </SBButton>
          <SBButton className={BTN_SOLID} onClick={() => setOpenNew(true)}>Ajuste Manual</SBButton>
        </div>
      </div>
      
      <details open={alerts.length > 0} className="[&[open]>summary]:mb-2">
        <summary className="list-none cursor-pointer flex items-center gap-2 text-amber-800 font-semibold text-sm">
          <AlertCircle size={16} />
          {alerts.length} Alertas de Inventario
        </summary>
        <SBCard noPadding>
          <div className="p-2 space-y-1">
            {alerts.length === 0 ?
              <div className="text-sm text-zinc-500 p-2">Sin alertas</div>
              : alerts.map((a,i)=> <div key={i} className="text-xs p-1.5 rounded-md bg-amber-50 text-amber-800 flex items-center gap-2"><AlertCircle size={14}/> {a.itemId}: {a.message}</div>)
            }
          </div>
        </SBCard>
      </details>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={selectedLotNumber ? "md:col-span-2" : "md:col-span-3"}>
          <SBCard title={
                <div className="flex justify-between items-center">
                    <span>Inventario</span>
                    <span className="text-sm font-normal text-zinc-500">
                        {viewMode === 'sku' ? `${skusWithLots.length} SKUs` : `${lotRows.length} lotes`}
                    </span>
                </div>
            } noPadding>
              <Tabs value={viewMode} onValueChange={handleViewChange}>
                <div className="flex justify-between items-center p-4">
                  <TabsList className="relative">
                    <TabsTrigger value="sku" className="data-[state=active]:text-[color:var(--sb-accent)]">Por SKU</TabsTrigger>
                    <TabsTrigger value="lot" className="data-[state=active]:text-[color:var(--sb-accent)]">Por Lote</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="sku">
                  <div className="divide-y">
                      <div className="grid grid-cols-[2fr_repeat(5,1fr)] items-center gap-4 px-4 py-2 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                        <span>Producto</span>
                        <span className="text-right">Stock Total</span>
                        <span className="text-right">Disp.</span>
                        <span className="text-right">Reservado</span>
                        <span className="text-right">En QC</span>
                        <span>Estado</span>
                    </div>
                    {skusWithLots.length > 0 ? (
                        skusWithLots.map(({summary}) => <SkuAccordionRow key={summary.itemId} sku={summary} items={items} onLotSelect={setSelectedLotNumber} />)
                    ) : <Empty hint="No hay stock que coincida con los filtros." />}
                  </div>
                </TabsContent>
                <TabsContent value="lot">
                    <LotRows lots={lotRows} onLotSelect={setSelectedLotNumber} />
                </TabsContent>
              </Tabs>
          </SBCard>
        </div>

        {selectedLotDetails && (
          <div className="md:col-span-1">
             <LotDetailPanel lotDetails={selectedLotDetails} items={items} onClose={() => setSelectedLotNumber(null)} />
          </div>
        )}
      </div>
      
      {openNew && (
        <NewOnHandDialog
            open={openNew}
            onClose={() => setOpenNew(false)}
            onSuccess={() => { toast.success("Ajuste manual guardado."); setOpenNew(false); router.refresh(); }}
            onError={(msg) => toast.error(`Error: ${msg}`)}
            items={items}
            locations={locations.filter(l => l !== 'ALL')}
        />
      )}
    </div>
  );
}
