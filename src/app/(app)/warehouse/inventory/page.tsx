
"use client";
import React, { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, History, X } from "lucide-react";
import { SBCard, Input, Select, DataTableSB } from "@/components/ui/ui-primitives";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import type { OnHandView, Item, ItemCategory, StockMove } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { rebuildOnHand } from "../actions";

// ---- Tema logística (usa tu token CSS) ----
const ACCENT = "var(--sb-accent-logistica)";
const BTN_OUTLINE =
  "border text-[color:var(--sb-accent-logistica)] border-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)/0.08] disabled:opacity-60";
const BTN_SOLID =
  "text-white hover:opacity-90 disabled:opacity-60";

// ---------- Helpers ----------
type Col<T> = { key: keyof T | string; header: string; className?: string; render?: (row: T) => React.ReactNode };
const toCsv = (rows: Record<string, any>[], headers: string[]) => {
  const esc = (v: any) => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
  return `${headers.join(",")}\n${rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n")}`;
};
const download = (fn: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};
const qcFromRow = (r: OnHandView): "hold" | "release" | "reject" | undefined => (r as any).qcStatus || ((r.locationId||"").startsWith("QC/") ? "hold" : "release");
const QCPill = ({ status }: { status?: "hold" | "release" | "reject" }) => {
  const s = status || "hold";
  const cls = s === "release" ? "bg-green-100 text-green-800" : s === "reject" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cls}`}>{s}</span>;
};

// ---------- Dialog Movimientos ----------
function MovementsDialog({
  open, onClose, item, lot, location, moves, itemsById
}: {
  open: boolean; onClose: () => void; item: string; lot?: string; location?: string;
  moves: StockMove[]; itemsById: Map<string, Item>;
}) {
  const filtered = useMemo(() =>
    moves
      .filter(m => m.itemId === item && m.lotNumber === lot)
      .sort((a,b) => new Date((b as any).occurredAt || b.createdAt).getTime() - new Date((a as any).occurredAt || a.createdAt).getTime())
  , [moves, item, lot]);
  const it = itemsById.get(item);
  const pretty = (m: StockMove) => {
    const pos = ["receipt","production_in","return_in"].includes(m.reason);
    const neg = ["ship","sale","production_out","return_out","consignment_send","consignment_sell","sample_send","sample_consume"].includes(m.reason);
    return `${pos ? "＋" : neg ? "−" : m.reason === "transfer" ? "↔︎" : "±"}${m.qty} ${m.uom}`;
  };

  return (
    <SBDialog open={open} onOpenChange={(v)=>{ if(!v) onClose(); }}>
      <SBDialogContent maxWidth="3xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: `hsl(${ACCENT})` as any }} />
            <h3 className="text-lg font-semibold">Movimientos del lote</h3>
          </div>
          <button
            className="rounded-md p-1 hover:bg-zinc-100"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18}/>
          </button>
        </div>
        <div className="text-xs text-zinc-600 space-y-0.5">
          <div>Producto: <span className="font-medium">{it?.name || item}</span> <span className="text-zinc-400">({it?.sku})</span></div>
          <div>Lote: <span className="font-mono">{lot || "—"}</span></div>
          {location ? <div>Ubicación (actual): <span className="font-mono">{location}</span></div> : null}
        </div>

        <div className="mt-3 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left" style={{ background: `hsl(${ACCENT} / 0.08)` as any }}>
              <tr className="text-zinc-700">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Razón</th>
                <th className="py-2 px-3">Cantidad</th>
                <th className="py-2 px-3">Desde</th>
                <th className="py-2 px-3">Hacia</th>
                <th className="py-2 px-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 px-3">{new Date((m as any).occurredAt || m.createdAt).toLocaleString("es-ES")}</td>
                  <td className="py-2 px-3 font-mono">{m.reason}</td>
                  <td className="py-2 px-3">{pretty(m)}</td>
                  <td className="py-2 px-3">{(m as any).fromLocationId || (m as any).fromLocation || "—"}</td>
                  <td className="py-2 px-3">{(m as any).toLocationId || (m as any).toLocation || "—"}</td>
                  <td className="py-2 px-3 text-xs text-zinc-500">
                    {(m as any).ref?.goodsReceiptId ? `GR:${(m as any).ref.goodsReceiptId} ` : ""}
                    {(m as any).ref?.prodOrderId ? `PO:${(m as any).ref.prodOrderId} ` : ""}
                    {(m as any).ref?.shipmentId ? `SH:${(m as any).ref.shipmentId} ` : ""}
                    {(m as any).ref?.orderId ? `ORD:${(m as any).ref.orderId} ` : ""}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-zinc-500">Sin movimientos.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className={`px-3 py-1.5 rounded-md ${BTN_OUTLINE}`}>Cerrar</button>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}

// ---------- Página ----------
export default function InventoryPage() {
  const router = useRouter();
  const { data: santaData } = useData();
  const [activeTab, setActiveTab] = useState<ItemCategory>("fg");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [movOpen, setMovOpen] = useState(false);
  const [movCtx, setMovCtx] = useState<{ item: string; lot?: string; location?: string } | null>(null);

  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [showZeros, setShowZeros] = useState(false);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    (santaData?.items || []).forEach(it => map.set(it.id, it));
    return map;
  }, [santaData?.items]);

  const stockMoves = useMemo(() => (santaData?.stockMoves || []) as StockMove[], [santaData?.stockMoves]);

  const onHandAll: OnHandView[] = useMemo(() => {
    const src = santaData?.onHand || [];
    return [...src].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [santaData?.onHand]);

  useEffect(() => { if (santaData) setLoading(false); }, [santaData]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    onHandAll.forEach(oh => { if (oh.locationId) set.add(oh.locationId); });
    return ["ALL", ...Array.from(set).sort()];
  }, [onHandAll]);

  const filteredByCategory = useMemo(() => {
    return onHandAll.filter(oh => {
      const item = itemsById.get(oh.itemId);
      if (!item) return false;
      return activeTab === "pack" ? (item.category === "pack") : item.category === activeTab;
    });
  }, [onHandAll, itemsById, activeTab]);

  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filteredByCategory.filter(oh => {
      const item = itemsById.get(oh.itemId);
      if (!item) return false;
      if (locationFilter !== "ALL" && (oh.locationId || "") !== locationFilter) return false;
      if (!showZeros && !(oh.qty > 0)) return false;
      if (!q) return true;
      const hay = [item.name || "", item.sku || "", oh.lotNumber || "", oh.locationId || ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [filteredByCategory, itemsById, locationFilter, showZeros, query]);

  const totalQty = useMemo(() => filteredInventory.reduce((a,r)=> a + (Number(r.qty)||0), 0), [filteredInventory]);

  const cols: Col<OnHandView>[] = [
    { key: "lotNumber", header: "Lote", render: r => <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-md">{r.lotNumber || (r as any).id.substring(0,12)}</span> },
    { key: "itemId", header: "Producto (SKU)", render: r => {
        const it = itemsById.get(r.itemId);
        return (<div><span className="font-medium text-zinc-800">{it?.name || r.itemId}</span><p className="text-xs text-zinc-500">{it?.sku}</p></div>);
      }
    },
    { key: "qty", header: "Cantidad", className: "text-right", render: r => <span className="font-semibold">{r.qty} <span className="text-xs text-zinc-500">{r.uom}</span></span> },
    { key: "qcStatus", header: "QC", render: r => <QCPill status={qcFromRow(r)} /> },
    { key: "locationId", header: "Ubicación", render: r => r.locationId || "—" },
    { key: "updatedAt", header: "Fecha", render: r => (r as any).updatedAt ? new Date((r as any).updatedAt).toLocaleDateString("es-ES") : "—" },
    { key: "actions", header: "", className: "text-right", render: r => (
        <button
          className={`text-xs px-2 py-1 rounded-md ${BTN_OUTLINE}`}
          onClick={() => { setMovCtx({ item: r.itemId, lot: r.lotNumber, location: r.locationId }); setMovOpen(true); }}
        >
          Ver movimientos
        </button>
      )
    },
  ];

  const TABS: { id: ItemCategory; label: string }[] = [
    { id: "fg", label: "Producto Terminado" },
    { id: "raw", label: "Materias Primas" },
    { id: "intermediate", label: "Intermedios" },
    { id: "pack", label: "Packaging y Etiquetas" },
    { id: "merch", label: "Merchandising" },
    { id: "consumable", label: "Consumibles" },
  ];

  const exportCsv = () => {
    const headers = ["itemId","sku","name","lotNumber","qty","uom","qcStatus","locationId","updatedAt","id"];
    const rows = filteredInventory.map(r => {
      const it = itemsById.get(r.itemId);
      return { itemId:r.itemId, sku:it?.sku||"", name:it?.name||"", lotNumber:r.lotNumber||"", qty:r.qty, uom:r.uom, qcStatus:qcFromRow(r), locationId:r.locationId||"", updatedAt:r.updatedAt||"", id:r.id };
    });
    download(`inventory_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`, toCsv(rows, headers));
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">Inventario</h1>
          <p className="text-xs text-zinc-500">{filteredInventory.length} líneas · total {totalQty} unidades</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-600">Ubicación</label>
            <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              {locations.map(loc => <option key={loc} value={loc}>{loc === "ALL" ? "Todas" : loc}</option>)}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-600">Mostrar 0</label>
            <input type="checkbox" checked={showZeros} onChange={e => setShowZeros(e.target.checked)} className="h-4 w-4" />
          </div>

          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por SKU, nombre, lote o ubicación…" />

          <button
            onClick={() => startTransition(async () => { await rebuildOnHand(); router.refresh(); })}
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 ${BTN_OUTLINE}`}
            style={{ color: `hsl(${ACCENT})`, borderColor: `hsl(${ACCENT})` } as any}
            disabled={pending}
          >
            {pending ? "Recalculando…" : "Recalcular on-hand"}
          </button>

          <button
            onClick={exportCsv}
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 ${BTN_OUTLINE}`}
            style={{ color: `hsl(${ACCENT})`, borderColor: `hsl(${ACCENT})` } as any}
          >
            <Download size={14} /> Exportar
          </button>

          <Link
            href="/warehouse/goods-receipt"
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 ${BTN_SOLID}`}
            style={{ backgroundColor: `hsl(${ACCENT})` } as any}
          >
            <Plus size={14} /> Añadir Entrada
          </Link>
        </div>
      </div>

      {/* Tabs categorías con acento logística */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex flex-wrap gap-4" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                    ? "border-[color:var(--sb-accent-logistica)] text-[color:var(--sb-accent-logistica)]"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <SBCard title="">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando inventario…</div>
        ) : santaData?.onHand === undefined ? (
          <div className="p-6 text-sm text-zinc-600">
            No existe la vista de inventario todavía.
            <button
              onClick={() => startTransition(async () => { await rebuildOnHand(); router.refresh(); })}
              className="ml-2 underline"
              style={{ color: `hsl(${ACCENT})` } as any}
              disabled={pending}
            >
              {pending ? "Creando…" : "Crear ahora"}
            </button>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No hay resultados para los filtros actuales.</div>
        ) : (
          <DataTableSB rows={filteredInventory} cols={cols as any} />
        )}
      </SBCard>

      {/* Dialog movimientos (controlado) */}
      {movCtx && (
        <MovementsDialog
          open={movOpen}
          onClose={() => { setMovOpen(false); setMovCtx(null); }}
          item={movCtx.item}
          lot={movCtx.lot}
          location={movCtx.location}
          moves={stockMoves}
          itemsById={itemsById}
        />
      )}
    </div>
  );
}
