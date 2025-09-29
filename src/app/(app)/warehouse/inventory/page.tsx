// src/app/(app)/warehouse/inventory/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SBCard, DataTableSB, SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ItemCategory, OnHandView, Lot, QcStatus, Item } from "@/domain/ssot";
import {
  computeSkuRollup, computeStockAlerts,
  stockStatusBadgeClass, stockStatusLabel, type SkuStockSummary,
} from "@/lib/inventory";
import { Plus, Download, Search, AlertCircle, ChevronDown, PackageSearch, FileClock } from "lucide-react";
import { RealtimeBadge } from "@/components/RealtimeBadge";
import { QuickGoodsReceiptDialog } from "@/features/warehouse/components/QuickGoodsReceiptDialog";

// ================================================================
// DATOS DE PRUEBA (MOCK DATA)
// ================================================================
const MOCK_ITEMS: Item[] = [
  { id: 'item_sb_750', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'fg', uom: 'uds', active: true, stdCost: 8.5 },
  { id: 'item_sb_magnum', sku: 'SB-MAGNUM', name: 'Santa Brisa Magnum 1.5L', category: 'fg', uom: 'uds', active: true, stdCost: 15 },
  { id: 'item_agave', sku: 'RM-AGAVE-01', name: 'Agave Crudo', category: 'raw', uom: 'kg', active: true, stdCost: 2.1 },
  { id: 'item_botella', sku: 'PKG-BOTELLA-STD', name: 'Botella Vidrio 750ml', category: 'pack', uom: 'uds', active: true, stdCost: 0.8 },
];

const MOCK_ON_HAND: OnHandView[] = [
  { id: 'oh_1', itemId: 'item_sb_750', lotNumber: 'L240801-A', locationId: 'FG/MAIN', qty: 120, reservedQty: 20, uom: 'uds', qcStatus: 'PASSED', category: 'fg', expiryAt: '2026-08-01T00:00:00Z', createdAt: '2024-08-01T00:00:00Z', updatedAt: '2024-08-10T00:00:00Z' },
  { id: 'oh_2', itemId: 'item_sb_750', lotNumber: 'L240715-B', locationId: 'FG/MAIN', qty: 80, reservedQty: 0, uom: 'uds', qcStatus: 'PASSED', category: 'fg', expiryAt: '2026-07-15T00:00:00Z', createdAt: '2024-07-15T00:00:00Z', updatedAt: '2024-08-01T00:00:00Z' },
  { id: 'oh_3', itemId: 'item_sb_750', lotNumber: 'L240815-A', locationId: 'QC/AREA', qty: 200, reservedQty: 0, uom: 'uds', qcStatus: 'PENDING', category: 'fg', createdAt: '2024-08-15T00:00:00Z', updatedAt: '2024-08-15T00:00:00Z' },
  { id: 'oh_4', itemId: 'item_agave', lotNumber: 'RM-AG-240805', locationId: 'RM/MAIN', qty: 500, reservedQty: 150, uom: 'kg', qcStatus: 'PASSED', category: 'raw', createdAt: '2024-08-05T00:00:00Z', updatedAt: '2024-08-05T00:00:00Z' },
  { id: 'oh_5', itemId: 'item_botella', lotNumber: 'PKG-B-240720', locationId: 'PKG/MAIN', qty: 2500, reservedQty: 1200, uom: 'uds', qcStatus: 'PASSED', category: 'pack', createdAt: '2024-07-20T00:00:00Z', updatedAt: '2024-07-20T00:00:00Z' },
  { id: 'oh_6', itemId: 'item_sb_magnum', lotNumber: 'L240810-M', locationId: 'FG/MAIN', qty: 30, reservedQty: 0, uom: 'uds', qcStatus: 'PASSED', category: 'fg', expiryAt: '2026-08-10T00:00:00Z', createdAt: '2024-08-10T00:00:00Z', updatedAt: '2024-08-10T00:00:00Z' },
];

const MOCK_LOTS: Lot[] = MOCK_ON_HAND.map(oh => ({
  id: oh.lotNumber,
  lotNumber: oh.lotNumber,
  itemId: oh.itemId,
  qcStatus: oh.qcStatus,
  quantity: oh.qty,
  createdAt: oh.createdAt,
  expDate: oh.expiryAt,
} as Lot));


// ================================================================
// COMPONENTES UI (Mantenidos igual, pero ahora consumen mock data)
// ================================================================
const CATEGORY_ORDER: { value: ItemCategory; label: string }[] = [
  { value: "fg", label: "Producto Terminado" },
  { value: "raw", label: "Materias Primas" },
  { value: "intermediate", label: "Intermedios" },
  { value: "pack", label: "Packaging y Etiquetas" },
  { value: "merch", label: "Merchandising" },
  { value: "consumable", label: "Consumibles" },
];

function Empty({ hint }: { hint: string }) {
  return <div className="py-10 text-center text-sm text-zinc-500">{hint}</div>;
}

function SkuAccordionRow({ sku, summary, lots, items, onSelect, setViewMode, setSelectedKey }: { sku: SkuStockSummary; summary: SkuStockSummary; lots: OnHandView[]; items: Item[]; onSelect: (key: string) => void; setViewMode: (mode: 'sku' | 'lot') => void; setSelectedKey: (key: string | null) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    const item = items.find(i => i.id === sku.itemId);
  
    const lotCols: any[] = [
        { key: "lotNumber", header: "Lote", render: (r: any) => <span className="font-mono text-xs">{r.lotNumber}</span> },
        { key: "qty", header: "Cantidad", render: (r:any)=> (<>{r.qty} <span className="text-xs text-zinc-500">{r.uom}</span></>) },
        { key: "locationId", header: "Ubicación" },
        { key: "qcStatus", header: "Estado QC", render: (r:any) => <QcStatusPill status={r.qcStatus} /> },
        { key: "expiryAt", header: "Caducidad", render: (r:any)=> r.expiryAt ? new Date(r.expiryAt).toLocaleDateString() : "—" },
        { key: 'actions', header: 'Acciones', render: (r:any) => <SBButton size="sm" variant="subtle" onClick={() => { setViewMode('lot'); setSelectedKey(r.lotNumber)}}>Inspeccionar</SBButton> }
    ];

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
              <DataTableSB<OnHandView>
                  rows={lots}
                  cols={lotCols}
                  onRowClick={(r:any)=> { setViewMode('lot'); setSelectedKey(r.lotNumber)}}
              />
          </div>
        )}
      </div>
    );
  }

  function QcStatusPill({ status }: { status: QcStatus }) {
    const styles: Record<QcStatus, string> = {
        PENDING: "bg-yellow-100 text-yellow-800",
        PASSED: "bg-green-100 text-green-800",
        FAILED: "bg-red-100 text-red-800",
        WAIVED: "bg-blue-100 text-blue-800",
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

// ================================================================
// PÁGINA DE INVENTARIO (Componente Principal)
// ================================================================

export default function InventoryPage() {
  // Usamos los datos de prueba
  const onHand = MOCK_ON_HAND;
  const lotsMaster = MOCK_LOTS;
  const items = MOCK_ITEMS;

  const [globalSearch, setGlobalSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(true);
  const [cat, setCat] = useState<ItemCategory>("fg");
  const [viewMode, setViewMode] = useState<"sku" | "lot">("lot");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [openNew, setOpenNew] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);

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

  const summaries = useMemo(() => computeSkuRollup(onHandFiltered, { nearExpiryDays: 45 }), [onHandFiltered]);
  const alerts = useMemo(() => computeStockAlerts(summaries), [summaries]);
  
  const countsByCat = useMemo(() => {
    const map: Partial<Record<ItemCategory, number>> = {};
    for (const r of onHand) {
      if (r.category) {
        map[r.category] = (map[r.category] ?? 0) + 1;
      }
    }
    return map;
  }, [onHand]);

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
    { key: "qcStatus", header: "Estado QC", render: (r:any) => <QcStatusPill status={r.qcStatus} /> },
    { key: "expiryAt", header: "Fecha", render: (r:any)=> r.expiryAt ? new Date(r.expiryAt).toLocaleDateString() : "—" },
  ];

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
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
            Inventario y Recepciones
            <RealtimeBadge />
        </h1>
        <p className="text-sm text-zinc-500">Vista en tiempo real del stock y registro de entradas.</p>
      </div>

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
            Solo con Stock
          </label>
        </div>
        <div className="flex gap-2">
          <SBButton variant="outline" className={BTN_OUTLINE}>Exportar</SBButton>
          <SBButton variant="outline" className={BTN_OUTLINE} onClick={() => setOpenReceipt(true)}>Nueva Recepción</SBButton>
          <SBButton className={BTN_SOLID} onClick={() => setOpenNew(true)}>Ajuste Manual</SBButton>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <div className="space-y-4">
          <SBCard title="Alertas de Inventario" noPadding>
            {(alerts.length === 0) ? (
              <div className="text-sm text-zinc-500 p-4">Sin alertas</div>
            ) : (
              <div className="p-2 space-y-1">
                {alerts.map((a,i)=> <div key={i} className="text-xs p-1.5 rounded-md bg-amber-50 text-amber-800 flex items-center gap-2"><AlertCircle size={14}/> {a.itemId}: {a.message}</div>)}
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

        <div className="space-y-4">
          <SBCard title="Inventario" noPadding>
              <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as any); setSelectedKey(null); }}>
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
                        skusWithLots.map(({summary, lots}) => <SkuAccordionRow key={summary.itemId} sku={summary} summary={summary} lots={lots} items={items} onSelect={setSelectedKey} setViewMode={setViewMode} setSelectedKey={setSelectedKey} />)
                    )}
                  </div>
                </TabsContent>
              </Tabs>
          </SBCard>
        </div>
      </div>
      
      <QuickGoodsReceiptDialog
        open={openReceipt}
        onOpenChange={setOpenReceipt}
      />
    </div>
  );
}
