// src/app/(app)/warehouse/inventory/page.tsx
"use client";
import React, { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, History, X, Truck } from "lucide-react";
import { SBCard, Input, Select, DataTableSB } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import type { OnHandView, Item, ItemCategory, StockMove, Lot, QcStatus, GoodsReceipt, Party } from "@/domain/ssot";
import { createManualOnHand, rebuildOnHand } from "./actions";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { QuickGoodsReceiptDialog } from "@/features/warehouse/components/QuickGoodsReceiptDialog";


// --- Helpers ---
const toCsv = (rows: Record<string, any>[], headers: string[]) => {
  const esc = (v: any) => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return `${headers.join(",")}\n${rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n")}`;
};

const download = (fn: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

const isItemInCategory = (itemCategory: ItemCategory, activeTab: string) => {
  if (activeTab === 'pack') {
    return itemCategory === 'pack' || itemCategory === 'label';
  }
  return itemCategory === activeTab;
};

// --- Sub-components ---

function InventoryHeader({ onNew, onRebuild, onExport, isRebuilding, onNewReceipt }: {
  onNew: () => void;
  onRebuild: () => void;
  onExport: () => void;
  isRebuilding: boolean;
  onNewReceipt: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-800">Inventario y Recepciones</h1>
        <p className="text-xs text-zinc-500">Vista en tiempo real del stock y registro de entradas.</p>
      </div>
      <div className="flex items-center gap-2">
        <SBButton variant="secondary" onClick={onRebuild} disabled={isRebuilding}>
          <History className="w-4 h-4 mr-2" />
          {isRebuilding ? "Recalculando..." : "Recalcular on-hand"}
        </SBButton>
        <SBButton variant="secondary" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </SBButton>
         <SBButton variant="secondary" onClick={onNewReceipt}>
          <Truck className="w-4 h-4 mr-2" />
          Nueva Recepción
        </SBButton>
        <SBButton onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          Ajuste Manual
        </SBButton>
      </div>
    </div>
  );
}

function InventoryFilters({
  query, setQuery, location, setLocation, locations, showZeros, setShowZeros,
}: {
  query: string; setQuery: (q: string) => void;
  location: string; setLocation: (l: string) => void;
  locations: string[];
  showZeros: boolean; setShowZeros: (s: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por SKU, nombre, lote..." />
      <Select value={location} onChange={e => setLocation(e.target.value)}>
        {locations.map(loc => <option key={loc} value={loc}>{loc === "ALL" ? "Todas Ubicaciones" : loc}</option>)}
      </Select>
      <label className="text-sm flex items-center gap-2 whitespace-nowrap">
        <input type="checkbox" checked={showZeros} onChange={e => setShowZeros(e.target.checked)} className="h-4 w-4" />
        Mostrar Lotes sin Stock
      </label>
    </div>
  );
}

const TABS = [
  { id: "fg", label: "Producto Terminado" },
  { id: "raw", label: "Materias Primas" },
  { id: "intermediate", label: "Intermedios" },
  { id: "pack", label: "Packaging y Etiquetas" },
  { id: "merch", label: "Merchandising" },
  { id: "consumable", label: "Consumibles" },
] as const;

function InventoryTabs({ activeTab, tabsWithCounts, onChange }: {
  activeTab: ItemCategory;
  tabsWithCounts: typeof TABS;
  onChange: (tab: ItemCategory) => void;
}) {
  return (
    <div className="border-b border-zinc-200">
      <nav className="-mb-px flex flex-wrap gap-4" aria-label="Tabs">
        {TABS.map(tab => {
          const count = (tabsWithCounts.find(t => t.id === tab.id) as any)?.count || 0;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id as ItemCategory)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {tab.label} <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100'}`}>{count}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
}

// --- Main Page Component ---

export default function InventoryPage() {
  const router = useRouter();
  const { data: santaData } = useData();
  const [activeTab, setActiveTab] = useState<ItemCategory>("fg");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [openNew, setOpenNew] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [showZeros, setShowZeros] = useState(false);

  const { itemsById, lotMap, onHandAll, stockMoves, goodsReceipts } = useMemo(() => {
    if (!santaData) return { itemsById: new Map(), lotMap: new Map(), onHandAll: [], stockMoves: [], goodsReceipts: [] };
    const itemsMap = new Map<string, Item>();
    (santaData.items || []).forEach(it => itemsMap.set(it.id, it));
    const lotsMap = new Map<string, Lot>();
    (santaData.lots || []).forEach(l => { if (l.lotNumber) lotsMap.set(l.lotNumber, l); });
    const onHand = [...(santaData.onHand || [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const receipts = [...(santaData.goodsReceipts || [])].sort((a,b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return { itemsById: itemsMap, lotMap: lotsMap, onHandAll: onHand, stockMoves: santaData.stockMoves || [], goodsReceipts: receipts };
  }, [santaData]);

  useEffect(() => {
    const ready = santaData && 'onHand' in santaData && 'items' in santaData;
    if (ready) setLoading(false);
  }, [santaData]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    onHandAll.forEach(oh => { if (oh.locationId) set.add(oh.locationId); });
    return ["ALL", ...Array.from(set).sort()];
  }, [onHandAll]);

  const filteredInventory = useMemo(() => {
    return onHandAll.filter(oh => {
      if (locationFilter !== "ALL" && (oh.locationId || "") !== locationFilter) return false;
      if (!showZeros && !(oh.qty > 0)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const item = itemsById.get(oh.itemId);
      const hay = [item?.name || "", item?.sku || "", oh.lotNumber || "", oh.locationId || ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [onHandAll, itemsById, locationFilter, showZeros, query]);

  const tabsWithCounts = useMemo(() => {
    const counts: Record<string, number> = { fg: 0, raw: 0, intermediate: 0, pack: 0, label: 0, merch: 0, consumable: 0 };
    for (const item of filteredInventory) {
      if (item.category && counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return TABS.map(tab => ({ ...tab, count: counts[tab.id] || (tab.id === 'pack' ? (counts.pack || 0) + (counts.label || 0) : 0) }));
  }, [filteredInventory]);

  const currentTabData = useMemo(() => {
    return filteredInventory.filter(oh => isItemInCategory(oh.category, activeTab));
  }, [filteredInventory, activeTab]);

  const onHandCols: Col<OnHandView>[] = [
    { key: "lotNumber", header: "Lote", render: (r: OnHandView) => <span className="font-mono text-xs">{r.lotNumber || "-"}</span> },
    { key: "itemId", header: "Producto (SKU)", render: (r: OnHandView) => {
        const it = itemsById.get(r.itemId);
        return (<div><span className="font-medium text-zinc-800">{it?.name || r.itemId}</span><p className="text-xs text-zinc-500">{it?.sku}</p></div>);
      }
    },
    { key: "qty", header: "Cantidad", className: "text-right", render: (r: OnHandView) => <span className="font-semibold">{r.qty} <span className="text-xs text-zinc-500">{r.uom}</span></span> },
    { key: "locationId", header: "Ubicación", render: (r: OnHandView) => r.locationId || "—" },
    { key: "updatedAt", header: "Fecha", render: (r: OnHandView) => (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString("es-ES") : "—") },
  ];

  const receiptCols: Col<GoodsReceipt>[] = [
    { key: 'receiptNumber', header: 'Nº Recepción', render: r => <span className="font-mono text-xs">{r.receiptNumber}</span> },
    { key: 'supplier', header: 'Proveedor', render: r => <span>{santaData?.parties.find((p: Party) => p.id === r.supplierPartyId)?.name || 'N/A'}</span> },
    { key: 'deliveryNote', header: 'Albarán Proveedor', render: r => <span>{r.deliveryNote}</span> },
    { key: 'receivedAt', header: 'Fecha', render: r => <span>{new Date(r.receivedAt).toLocaleDateString('es-ES')}</span> },
    { key: 'lines', header: 'Líneas', className: "text-right", render: r => <span>{r.lines.length}</span> },
    { key: 'status', header: 'Estado', render: r => <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span> },
  ];

  const exportCsv = () => {
    const headers = ["itemId", "sku", "name", "lotNumber", "qty", "uom", "qcStatus", "locationId", "updatedAt", "id"];
    const rows = currentTabData.map(r => {
      const it = itemsById.get(r.itemId);
      const lot = r.lotNumber ? lotMap.get(r.lotNumber) : undefined;
      return { itemId: r.itemId, sku: it?.sku || "", name: it?.name || "", lotNumber: r.lotNumber || "", qty: r.qty, uom: r.uom, qcStatus: lot?.qcStatus, locationId: r.locationId || "", updatedAt: r.updatedAt || "", id: r.id };
    });
    download(`inventory_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, headers));
  };
  
  async function handleCreate(payload: any) {
    await createManualOnHand(payload);
    setOpenNew(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <InventoryHeader
        onNew={() => setOpenNew(true)}
        onRebuild={() => startTransition(async () => { await rebuildOnHand(); router.refresh(); })}
        onExport={exportCsv}
        isRebuilding={pending}
        onNewReceipt={() => setOpenReceipt(true)}
      />
      
      <SBCard title="Inventario por Lote">
        <div className="p-4 border-b">
          <InventoryFilters
            query={query} setQuery={setQuery}
            location={locationFilter} setLocation={setLocationFilter} locations={locations}
            showZeros={showZeros} setShowZeros={setShowZeros}
          />
        </div>
        <InventoryTabs activeTab={activeTab} tabsWithCounts={tabsWithCounts as any} onChange={setActiveTab} />
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando inventario…</div>
        ) : currentTabData.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No hay resultados para los filtros actuales.</div>
        ) : (
          <DataTableSB rows={currentTabData} cols={onHandCols as any} />
        )}
      </SBCard>

      <SBCard title="Historial de Recepciones">
        <DataTableSB rows={goodsReceipts} cols={receiptCols as any[]} />
      </SBCard>

      <NewOnHandDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreate={handleCreate}
        items={santaData?.items || []}
        locations={locations.filter(l => l !== 'ALL')}
        defaultLocation={locationFilter === 'ALL' ? undefined : locationFilter}
      />
      <QuickGoodsReceiptDialog
        open={openReceipt}
        onOpenChange={setOpenReceipt}
      />
    </div>
  );
}