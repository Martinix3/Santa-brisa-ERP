
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
import { Plus, Search, AlertCircle, RefreshCw, Filter, List } from "lucide-react";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { rebuildOnHand } from '@/server/actions/inventory.actions';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LotDetailPanel } from "./components/LotDetailPanel";
import { SkuAccordionRow } from "./components/SkuAccordionRow";
import { LotRows } from "./components/LotRows";
import { InventoryDashboard } from "@/features/warehouse/components/InventoryDashboard";
import { DataQualityCenter } from "@/features/warehouse/components/DataQualityCenter";

// Componente EmptyState más robusto
function Empty({ hint, icon: Icon }: { hint: string, icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border-2 border-dashed rounded-2xl bg-secondary/50 text-muted-foreground">
        {Icon && (
            <div className="p-3 rounded-full bg-secondary mb-4">
                <Icon className="h-8 w-8" />
            </div>
        )}
        <p className="text-sm max-w-sm">{hint}</p>
    </div>
  );
}


export default function InventoryPage() {
  const { data } = useData();
  const router = useRouter();
  const onHand = data?.onHand || [];
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

  // ... (hooks y lógica de datos se mantienen igual) ...
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

  const selectedLotDetails = useMemo(() => {
      if (!selectedLotNumber) return null;
      const lot = lotRows.find(l => l.lotNumber === selectedLotNumber);
      const moves = stockMoves.filter(m => m.lotNumber === selectedLotNumber);
      return lot ? { lot, moves } : null;
  }, [selectedLotNumber, lotRows, stockMoves]);

  const sectionStyle = { '--primary': 'hsl(var(--sb-accent-logistica))', '--primary-foreground': 'hsl(var(--card-foreground))' } as React.CSSProperties;

  return (
    <div className="space-y-6" style={{'--sb-accent': 'var(--sb-accent-logistica)'} as React.CSSProperties}>
      
      <InventoryDashboard summaries={Object.values(summaries)} />
      <DataQualityCenter />
      
      {/* --- NUEVA ESTRUCTURA DE LAYOUT ESTABLE --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* --- COLUMNA IZQUIERDA: Navegador de Inventario Unificado --- */}
        <div className={selectedLotNumber ? "md:col-span-2" : "md:col-span-3"}>
          <SBCard noPadding>
            {/* El header de la tarjeta ahora contiene los filtros y acciones */}
            <div className="p-3 border-b space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Inventario</h3>
                <div className="flex gap-2 items-center">
                  <SBButton variant="outline" style={sectionStyle}>Exportar</SBButton>
                  <SBButton variant="outline" style={sectionStyle}>Nueva Recepción</SBButton>
                  <SBButton variant="outline" style={sectionStyle} onClick={handleRebuild} disabled={isRebuilding}>
                    <RefreshCw size={14} className={isRebuilding ? 'animate-spin' : ''} /> {isRebuilding ? '...' : 'Reconstruir'}
                  </SBButton>
                  <SBButton variant="primary" style={sectionStyle} onClick={() => setOpenNew(true)}>Ajuste Manual</SBButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 flex gap-2 min-w-[260px]">
                  <Input ref={searchRef} placeholder="Buscar por SKU, nombre, lote…" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} />
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
                <label className="flex items-center gap-2 pl-2 text-sm">
                  <input type="checkbox" className="sb-checkbox" checked={onlyWithStock} onChange={e=>setOnlyWithStock(e.target.checked)} />
                  Solo con Stock
                </label>
              </div>
            </div>

            {/* Las alertas ahora son visibles y no están en un <details> */}
            {alerts.length > 0 && (
              <div className="p-3 border-b space-y-1">
                <h4 className="flex items-center gap-2 text-destructive font-semibold text-sm"><AlertCircle size={16} />{alerts.length} Alertas de Inventario</h4>
                {alerts.map((a,i)=> <div key={i} className="text-xs p-1.5 rounded-md bg-destructive-foreground text-destructive border border-destructive/20 flex items-center gap-2"><AlertCircle size={14}/> {a.itemId}: {a.message}</div>)}
              </div>
            )}
            
            {/* Las pestañas y el contenido principal */}
            <Tabs value={viewMode} onValueChange={handleViewChange}>
              <div className="p-4 border-b">
                <TabsList className="relative">
                  <TabsTrigger value="sku" className="data-[state=active]:text-[color:var(--sb-accent)]">Por SKU</TabsTrigger>
                  <TabsTrigger value="lot" className="data-[state=active]:text-[color:var(--sb-accent)]">Por Lote</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sku">
                <div className="divide-y">
                    <div className="grid grid-cols-[2fr_repeat(5,1fr)] items-center gap-4 px-4 py-2 bg-secondary text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      <span>Producto</span><span className="text-right">Stock Total</span><span className="text-right">Disp.</span><span className="text-right">Reservado</span><span className="text-right">En QC</span><span>Estado</span>
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

        {/* --- COLUMNA DERECHA: Panel de Detalle (estable) --- */}
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
