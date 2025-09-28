// src/app/(app)/warehouse/inventory/page.tsx

"use client";
import React, { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, History, X } from "lucide-react";
import { SBCard, Input, Select, DataTableSB } from "@/components/ui/ui-primitives";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import type { OnHandView, Item, ItemCategory, StockMove, Lot, QcStatus } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { createManualOnHand, rebuildOnHand } from "../actions";
import { qcFromRow } from '@/lib/sb-core';

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

const QCPill = ({ status }: { status?: QcStatus }) => {
  const s = status || 'PENDING';
  const cls = s === "PASSED" ? "bg-green-100 text-green-800" : s === "FAILED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
  const text = s === "PASSED" ? 'Liberado' : s === 'FAILED' ? 'Rechazado' : 'Pendiente';
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cls}`}>{text}</span>;
};

type FormState = {
  itemId: string;
  lotNumber: string;
  qty: number | "";
  uom: string;
  locationId: string;
  occurredAt: string;
  note?: string;
  supplier?: string;
  invoiceRef?: string;
  amount?: number | "";
  currency?: string;
  category?: string;
  sendToQc: boolean;
};

function NewOnHandDialog({
  open, onClose, onCreate, items, locations, defaultLocation
}:{
  open: boolean; onClose:()=>void; onCreate:(p:any)=>Promise<void>;
  items:Item[]; locations:string[]; defaultLocation?: string;
}){
  const [fm, setFm] = useState<FormState>({
    itemId: "", lotNumber: "", qty: "", uom: "unit", locationId: defaultLocation||"",
    occurredAt: new Date().toISOString().slice(0,16), note: "", supplier: "",
    invoiceRef: "", amount: "", currency: "EUR", category: "", sendToQc: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const validate = () => {
    const e:Partial<Record<keyof FormState, string>> = {};
    if (!fm.itemId) e.itemId = "Selecciona un producto";
    if (!fm.qty || fm.qty <= 0) e.qty = "Cantidad debe ser > 0";
    if (!fm.locationId) e.locationId = "Ubicación requerida";
    if (!fm.category) e.category = "Categoría obligatoria";
    if (fm.amount !== "" && !(Number(fm.amount) >= 0)) e.amount = "Importe >= 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    await onCreate({
      itemId: fm.itemId,
      lotNumber: fm.lotNumber.trim(),
      qty: Number(fm.qty),
      uom: fm.uom.trim(),
      locationId: fm.locationId.trim(),
      occurredAt: fm.occurredAt ? new Date(fm.occurredAt).toISOString() : undefined,
      note: fm.note?.trim() || undefined,
      supplier: fm.supplier?.trim() || undefined,
      invoiceRef: fm.invoiceRef?.trim() || undefined,
      amount: fm.amount === "" ? undefined : Number(fm.amount),
      currency: fm.currency,
      category: fm.category as any,
      sendToQc: fm.sendToQc,
    });
  };

  const FieldRow = ({ label, children, error, htmlFor }:{label:string; children:React.ReactNode; error?:string; htmlFor?:string}) => (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
        <label className="text-xs text-zinc-600 font-medium" htmlFor={htmlFor}>{label}</label>
        <div className="flex-1">{children}</div>
        {error && <div className="col-start-2 text-xs text-red-500 -mt-2">{error}</div>}
    </div>
  );

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent title="Añadir Stock Manual" maxWidth="36rem">
        <div className="space-y-3">
            <FieldRow label="Producto" error={errors.itemId}><Select value={fm.itemId} onChange={e=>setFm(s=>({...s,itemId:e.target.value, uom: items.find(i=>i.id===e.target.value)?.uom || 'unit'}))}>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</Select></FieldRow>
            <FieldRow label="Lote (auto si vacío)"><Input value={fm.lotNumber} onChange={e=>setFm(s=>({...s,lotNumber:e.target.value}))} placeholder="SKU-YYMM-XX"/></FieldRow>
            <FieldRow label="Cantidad" error={errors.qty}><div className="flex gap-2"><Input type="number" value={fm.qty} onChange={e=>setFm(s=>({...s,qty:e.target.value===""?"":Number(e.target.value)}))} min={1}/><Select value={fm.uom} onChange={e=>setFm(s=>({...s,uom:e.target.value}))}>{['unit','kg','L','case'].map(u=><option key={u} value={u}>{u}</option>)}</Select></div></FieldRow>
            <FieldRow label="Ubicación" error={errors.locationId}><Select value={fm.locationId} onChange={e=>setFm(s=>({...s,locationId:e.target.value}))}>{locations.map(l=><option key={l} value={l}>{l}</option>)}</Select></FieldRow>
            <FieldRow label="Fecha/hora"><Input type="datetime-local" value={fm.occurredAt} onChange={e=>setFm(s=>({...s,occurredAt:e.target.value}))}/></FieldRow>
            <FieldRow label="Notas"><Input value={fm.note || ''} onChange={e=>setFm(s=>({...s,note:e.target.value}))} placeholder="Ajuste anual, promo, etc."/></FieldRow>
            <div className="border-t pt-4 space-y-3">
                <FieldRow label="Proveedor (texto o ID)"><Input value={fm.supplier || ''} onChange={e => setFm(s => ({ ...s, supplier: e.target.value }))} placeholder="Nombre proveedor o accountId"/></FieldRow>
                <FieldRow label="Nº albarán / doc. ref."><Input value={fm.invoiceRef || ''} onChange={e => setFm(s => ({ ...s, invoiceRef: e.target.value }))} placeholder="p.ej. ALB-2509-123"/></FieldRow>
                <FieldRow label="Importe"><div className="flex gap-2"><Input type="number" step="0.01" min="0" value={fm.amount} onChange={e => setFm(s => ({ ...s, amount: e.target.value === "" ? "" : Number(e.target.value) }))}/><Select value={fm.currency} onChange={e => setFm(s => ({ ...s, currency: e.target.value }))}><option value="EUR">EUR</option><option value="USD">USD</option></Select></div></FieldRow>
                <FieldRow label="Categoría" error={errors.category}><Select value={fm.category} onChange={e => setFm(s => ({ ...s, category: e.target.value }))}><option value="">— Selecciona —</option><option value="fg">Producto Terminado</option><option value="raw">Materia Prima</option><option value="intermediate">Intermedio</option><option value="pack">Packaging / Etiqueta</option><option value="merch">Merchandising</option><option value="consumable">Consumible</option></Select></FieldRow>
                <div className="flex items-center gap-2 pl-[132px]">
                    <input type="checkbox" id="sendToQc" checked={fm.sendToQc} onChange={e => setFm(s => ({...s, sendToQc: e.target.checked}))} />
                    <label htmlFor="sendToQc" className="text-sm">Enviar a cuarentena (QC)</label>
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 border rounded-lg bg-white">Cancelar</button>
          <button onClick={handleCreate} className="px-3 py-1.5 border rounded-lg" style={{backgroundColor:`hsl(${ACCENT})`, color: 'white'}}>Guardar</button>
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
  const [openNew, setOpenNew] = useState(false);

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    (santaData?.items || []).forEach(it => map.set(it.id, it));
    return map;
  }, [santaData?.items]);
  
  const lotMap = useMemo(() => {
    const map = new Map<string, Lot>();
    (santaData?.lots || []).forEach(l => {
      if (l.lotNumber) {
        map.set(l.lotNumber, l);
      }
    });
    return map;
  }, [santaData?.lots]);


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
    { key: "qcStatus", header: "QC", render: r => {
        const lot = r.lotNumber ? lotMap.get(r.lotNumber) : undefined;
        return <QCPill status={lot?.qcStatus} />;
      } 
    },
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
      const lot = r.lotNumber ? lotMap.get(r.lotNumber) : undefined;
      return { itemId:r.itemId, sku:it?.sku||"", name:it?.name||"", lotNumber:r.lotNumber||"", qty:r.qty, uom:r.uom, qcStatus:lot?.qcStatus, locationId:r.locationId||"", updatedAt:r.updatedAt||"", id:r.id };
    });
    download(`inventory_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`, toCsv(rows, headers));
  };
  
  async function handleCreate(payload: any) {
    await createManualOnHand(payload);
    setOpenNew(false);
    router.refresh();
  }

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

          <button
            onClick={() => setOpenNew(true)}
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 ${BTN_SOLID}`}
            style={{ backgroundColor: `hsl(${ACCENT})` } as any}
          >
            <Plus size={14} /> Añadir Entrada
          </button>
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
      
      {openNew && <NewOnHandDialog open={openNew} onClose={()=>setOpenNew(false)} onCreate={handleCreate} items={santaData?.items||[]} locations={locations.filter(l=>l!=='ALL')} defaultLocation={locationFilter==='ALL'?undefined:locationFilter} />}
    </div>
  );
}
