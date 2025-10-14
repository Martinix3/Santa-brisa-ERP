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
import { QuickGoodsReceiptDialog } from "@/features/warehouse/components/QuickGoodsReceiptDialog";

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
  const [openGoodsReceipt, setOpenGoodsReceipt] = useState(false);
  const [isRebuilding, startRebuildTransition] = useTransition();

  // ... (hooks y lógica de datos se mantienen igual) ...
  const onHandFiltered = useMemo(() => {
    let rows = onHand;
    if (locationFilter !== "ALL") rows = rows.filter(r => r.warehouseId === locationFilter);
    if (qcFilter !== 'ALL') rows = rows.filter(r => (r.qcStatus || 'PENDING') === qcFilter);
    if (onlyWithStock) rows = rows.filter(r => (r.qty - (r.reserved ?? 0)) > 0);
    if (globalSearch.trim()) {
      const q = globalSearch.trim().toLowerCase();
      rows = rows.filter(r =>
        (r.sku?.toLowerCase().includes(q)) ||
        (r.lotNumbers && Object.keys(r.lotNumbers).some(ln => ln.toLowerCase().includes(q))) ||
        (items.find(i => i.sku === r.sku)?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows;
  }, [onHand, items, locationFilter, qcFilter, onlyWithStock, globalSearch]);

  const summaries = useMemo(() => computeSkuRollup(onHandFiltered, { nearExpiryDays: 45, items }), [onHandFiltered, items]);
  const alerts = useMemo(() => computeStockAlerts(summaries), [summaries]);
  
  const skusWithLots = useMemo(() => {
      return Object.values(summaries).map(summary => ({
          summary,
          lots: onHandFiltered.filter(lot => lot.sku === summary.sku)
      })).sort((a,b) => (items.find(i => i.sku === a.summary.sku)?.name || '').localeCompare(items.find(i => i.sku === b.summary.sku)?.name || ''));
  }, [summaries, onHandFiltered, items]);

  const lotRows = useMemo(() => onHandFiltered
    .flatMap(r => {
      const lotNumbers = r.lotNumbers ? Object.keys(r.lotNumbers) : [];
      const sku = r.sku ?? '';
      return lotNumbers.map(lotNumber => ({
        id: r.id,
        lotNumber: lotNumber,
        sku: sku,
        name: items.find(i => i.sku === sku)?.name ?? sku,
        qty: r.qty,
        free: Math.max(0, r.qty - (r.reserved ?? 0)),
        uom: 'UNIT' as const,
        locationId: r.warehouseId ?? '',
        qcStatus: r.qcStatus,
        expiryAt: null,
        updatedAt: r.updatedAt,
      }));
    })
    .sort((a, b) => (a.lotNumber || '').localeCompare(b.lotNumber || '')), [onHandFiltered, items]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    onHand.forEach(o => { if (o.warehouseId) set.add(o.warehouseId); });
    return ["ALL", ...Array.from(set)];
  }, [onHand]);

  const handleRebuild = () => {
    startRebuildTransition(async () => {
        toast.info("Iniciando reconstrucción del inventario...");
        const result = await rebuildOnHand();
        if (result.ok) {
            const count = (result.data as any)?.count ?? 0;
            toast.success(`Inventario reconstruido: ${count} registros actualizados.`);
            router.refresh();
        } else {
            toast.error(result.message ?? 'Fallo al reconstruir inventario');
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
    <div className="sb-page">
      {/* Header con título y acciones principales */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sb-page__title">Almacén</h1>
          <p className="sb-page__subtitle">Gestión de inventario y recepciones</p>
        </div>
        <div className="flex gap-2">
          <SBButton variant="outline" onClick={handleRebuild} disabled={isRebuilding}>
            <RefreshCw size={16} className={isRebuilding ? 'animate-spin' : ''} /> 
            {isRebuilding ? 'Reconstruyendo...' : 'Reconstruir'}
          </SBButton>
          <SBButton variant="primary" onClick={() => setOpenNew(true)}>
            <Plus size={16} /> Ajuste Manual
          </SBButton>
        </div>
      </div>

      <div className="sb-page__content">
        <InventoryDashboard summaries={Object.values(summaries)} />
        
        {/* --- NAVEGADOR DE INVENTARIO --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* --- COLUMNA IZQUIERDA: Navegador de Inventario --- */}
          <div className={selectedLotNumber ? "md:col-span-2" : "md:col-span-3"}>
            <div className="sb-card">
              {/* Toolbar de filtros */}
              <div className="sb-card__header">
                <h3 className="sb-card__title">Inventario</h3>
                <div className="flex gap-2">
                  <SBButton variant="outline" size="sm">
                    <Filter size={14} /> Exportar
                  </SBButton>
                  <SBButton variant="primary" size="sm" onClick={() => setOpenGoodsReceipt(true)}>
                    <Plus size={14} /> Nueva Recepción
                  </SBButton>
                </div>
              </div>

              <div className="sb-toolbar">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" size={16} />
                  <Input
                    ref={searchRef}
                    type="text"
                    placeholder="Buscar por SKU, nombre, lote…" 
                    value={globalSearch} 
                    onChange={e=>setGlobalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                  {locations.map(loc => <option key={loc} value={loc}>{loc === "ALL" ? "Todas Ubicaciones" : loc}</option>)}
                </Select>
                <Select value={qcFilter} onChange={(e) => setQcFilter(e.target.value)}>
                  <option value="ALL">Todo QC</option>
                  <option value="PASSED">Liberado</option>
                  <option value="PENDING">Retenido</option>
                  <option value="FAILED">Rechazado</option>
                </Select>
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={onlyWithStock} onChange={e=>setOnlyWithStock(e.target.checked)} />
                  Solo con Stock
                </label>
              </div>

              {/* Alertas */}
              {alerts.length > 0 && (
                <div className="px-4 py-3 bg-destructive/5 border-y border-destructive/20">
                  <h4 className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
                    <AlertCircle size={16} />{alerts.length} Alertas de Inventario
                  </h4>
                  <div className="space-y-1">
                    {alerts.map((a,i)=> (
                      <div key={i} className="text-xs p-2 rounded-md bg-background text-destructive border border-destructive/20 flex items-center gap-2">
                        <AlertCircle size={14}/> {a.sku}: {a.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs y contenido */}
            <Tabs value={viewMode} onValueChange={handleViewChange}>
              <div className="p-4 border-b">
                <TabsList className="relative">
                  <TabsTrigger value="sku" className="data-[state=active]:text-[color:var(--sb-accent)]">Por SKU</TabsTrigger>
                  <TabsTrigger value="lot" className="data-[state=active]:text-[color:var(--sb-accent)]">Por Lote</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sku">
                <div className="sb-table-wrapper">
                  <table className="sb-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-right">Stock Total</th>
                        <th className="text-right">Disponible</th>
                        <th className="text-right">Reservado</th>
                        <th className="text-right">En QC</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                  </table>
                  {skusWithLots.length > 0 ? (
                    <div className="divide-y">
                      {skusWithLots.map(({summary}) => (
                        <SkuAccordionRow key={summary.sku} sku={summary} items={items} onLotSelect={setSelectedLotNumber} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-8">
                      <Empty hint="No hay stock que coincida con los filtros." icon={List} />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="lot">
                  <LotRows lots={lotRows} onLotSelect={setSelectedLotNumber} />
              </TabsContent>
            </Tabs>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: Panel de Detalle --- */}
          {selectedLotDetails && (
            <div className="md:col-span-1">
              <LotDetailPanel lotDetails={selectedLotDetails} items={items} onClose={() => setSelectedLotNumber(null)} />
            </div>
          )}
        </div>
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
      
      <QuickGoodsReceiptDialog
        open={openGoodsReceipt}
        onOpenChange={setOpenGoodsReceipt}
        onSuccess={(info) => {
          toast.success(`Recepción ${info.receiptNumber} creada exitosamente`);
          router.refresh();
        }}
        onError={(msg) => toast.error(`Error: ${msg}`)}
      />
    </div>
  );
}
