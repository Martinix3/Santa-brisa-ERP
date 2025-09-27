
// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle2,
  XCircle,
  Hourglass,
  Search,
  FlaskConical,
  FileCheck2,
  Filter,
  MoveRight,
  ChevronDown
} from "lucide-react";
import type { Lot, QcTest, QcBatchResult, Item, SantaData, QcStatus, ParameterCatalog } from "@/domain/ssot";

// ===== Tipos/UI helpers =====
type BucketKey = "HOLD" | "RELEASED" | "REJECTED";

function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) {
  const color = {
    zinc: "border-zinc-200 bg-white text-zinc-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border font-medium ${color}`}>{children}</span>;
}

function qcTone(s?: string): "emerald" | "amber" | "rose" | "zinc" {
  if (!s) return "amber";
  if (s === "RELEASED") return "emerald";
  if (s === "CONDITIONAL_RELEASE" || s === "WAIVED" || s === "IN_PROGRESS" || s === "PENDING") return "amber";
  if (s === "REJECTED") return "rose";
  return "amber";
}

function prettyStatus(s?: string) {
  return (
    {
      PENDING: "Pendiente",
      IN_PROGRESS: "En curso",
      WAIVED: "Exento",
      CONDITIONAL_RELEASE: "Liberación condicional",
      RELEASED: "Liberado",
      REJECTED: "Rechazado",
    } as Record<string, string>
  )[s ?? "PENDING"] ?? s ?? "PENDIENTE";
}


export default function LabReleasePage() {
  const { data } = useData();

  const lots = (data?.lots ?? []) as Lot[];
  const items = (data?.items ?? []) as Item[];
  const qcTests = (data?.qcTests ?? []) as QcTest[];
  const qcBatchResults = (data?.qcBatchResults ?? []) as QcBatchResult[];
  const qcParameters = (data?.qcParameters ?? []) as ParameterCatalog[];

  const [query, setQuery] = useState("");
  const [filterItem, setFilterItem] = useState<string>("");
  const [activeTab, setActiveTab] = useState<BucketKey>("HOLD");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const buckets = useMemo(() => {
    const hold: Lot[] = [];
    const released: Lot[] = [];
    const rejected: Lot[] = [];
    
    const lowerQuery = query.trim().toLowerCase();

    for (const l of lots) {
      const item = itemMap.get(l.itemId);
      const matchesQuery = !lowerQuery || 
        l.lotNumber.toLowerCase().includes(lowerQuery) || 
        (item?.name || '').toLowerCase().includes(lowerQuery) ||
        (item?.sku || '').toLowerCase().includes(lowerQuery);
      
      const matchesItem = !filterItem || l.itemId === filterItem;

      if (!matchesQuery || !matchesItem) continue;

      const status = l.qcStatus;
      if (status === "RELEASED") released.push(l);
      else if (status === "REJECTED") rejected.push(l);
      else hold.push(l); // Todos los demás estados van a "En Hold"
    }
    const byDateDesc = (a: Lot, b: Lot) => new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();
    return { HOLD: hold.sort(byDateDesc), RELEASED: released.sort(byDateDesc), REJECTED: rejected.sort(byDateDesc) };
  }, [lots, itemMap, query, filterItem]);

  const selected = useMemo(() => (selectedLot ? lots.find((l) => l.lotNumber === selectedLot) ?? null : null), [selectedLot, lots]);
  const selectedItem = useMemo(() => (selected ? itemMap.get(selected.itemId) : null), [selected, itemMap]);
  const testsForSelected = useMemo(() => (selected ? qcTests.filter((t) => t.lotNumber === selected.lotNumber).sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()) : []), [selected, qcTests]);
  const decisionsForSelected = useMemo(() => (selected ? qcBatchResults.filter((r) => r.lotNumber === selected.lotNumber).sort((a, b) => new Date(b.reviewedAt ?? 0).getTime() - new Date(a.reviewedAt ?? 0).getTime()) : []), [selected, qcBatchResults]);
  const itemOptions = useMemo(() => Array.from(new Set(lots.map((l) => l.itemId))).map((id) => ({ id, name: itemMap.get(id)?.name ?? id })), [lots, itemMap]);
  const visibleLots = buckets[activeTab];

  // Auto-seleccionar el primer lote si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedLot && visibleLots.length > 0) {
      setSelectedLot(visibleLots[0].lotNumber);
    }
    if (selectedLot && !visibleLots.some(l => l.lotNumber === selectedLot)) {
      setSelectedLot(visibleLots[0]?.lotNumber ?? null);
    }
  }, [visibleLots, selectedLot]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna 1: Filtros y Tabs */}
      <div className="lg:col-span-3 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="w-full h-10 pl-9 pr-3 border rounded-lg" placeholder="Buscar lote, ítem, SKU…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <select className="w-full h-10 pl-9 pr-8 border rounded-lg appearance-none" value={filterItem} onChange={e => setFilterItem(e.target.value)}>
            <option value="">Todos los ítems</option>
            {itemOptions.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
        
        <div className="space-y-1">
          {[
            { id: "HOLD", label: "En Hold", icon: Hourglass },
            { id: "RELEASED", label: "Liberados", icon: CheckCircle2 },
            { id: "REJECTED", label: "Rechazados", icon: XCircle },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as BucketKey)} 
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
              <div className="flex items-center gap-2"><tab.icon size={16}/> {tab.label}</div>
              <span>{buckets[tab.id as BucketKey].length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Columna 2: Lista de Lotes */}
      <div className="lg:col-span-4 h-full overflow-y-auto border rounded-xl bg-white">
        <ul className="divide-y">
            {visibleLots.length === 0 ? (
                <li className="p-6 text-center text-sm text-zinc-500">No hay lotes en esta categoría.</li>
            ) : visibleLots.map(l => {
                const it = itemMap.get(l.itemId);
                const isSelected = selectedLot === l.lotNumber;
                return (
                    <li key={l.lotNumber}>
                        <button onClick={() => setSelectedLot(l.lotNumber)} className={`w-full text-left p-3 ${isSelected ? 'bg-yellow-50' : 'hover:bg-zinc-50'}`}>
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <p className="font-semibold font-mono text-sm">{l.lotNumber}</p>
                                    <p className="text-xs text-zinc-600 truncate">{it?.name ?? l.itemId}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm">{l.quantity} <span className="text-xs text-zinc-500">{it?.uom}</span></p>
                                  <p className="text-xs text-zinc-500">{l.locationId}</p>
                                </div>
                            </div>
                        </button>
                    </li>
                );
            })}
        </ul>
      </div>

      {/* Columna 3: Panel de Detalle */}
      <div className="lg:col-span-5 h-full overflow-y-auto space-y-4">
        {selected ? (
        <>
            <SBCard title={
                <div className="flex items-center gap-2">
                    <FlaskConical size={16}/><span>Detalle del lote</span>
                </div>
            }>
                <div className="p-4 space-y-2 text-sm">
                    <p className="text-lg font-bold font-mono">{selected.lotNumber}</p>
                    <p><b>Ítem:</b> {selectedItem?.name} ({selectedItem?.sku})</p>
                    <p><b>Cantidad:</b> {selected.quantity} {selectedItem?.uom}</p>
                    <p><b>Ubicación:</b> {selected.locationId || 'N/A'}</p>
                    <p><b>Fecha Recepción/Creación:</b> {new Date(selected.receivedAt ?? selected.createdAt).toLocaleString('es-ES')}</p>
                    <p><b>Estado QC:</b> <Badge tone={qcTone(selected.qcStatus)}>{prettyStatus(selected.qcStatus)}</Badge></p>
                </div>
            </SBCard>

            <SBCard title={
                <div className="flex items-center gap-2">
                    <FileCheck2 size={16}/><span>Resultados Analíticos</span>
                </div>
            }>
              <div className="p-4 space-y-2">
                {testsForSelected.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">Sin tests registrados.</p>
                : testsForSelected.map(t => (
                  <div key={t.id} className="text-xs p-2 border rounded-md grid grid-cols-3 gap-2">
                    <div className="font-medium">{qcParameters.find(p=>p.id===t.parameterId)?.label || t.parameterId}</div>
                    <div className="text-center font-mono">
                      {t.valueNumeric != null ? t.valueNumeric.toFixed(2) : t.valueText ?? (t.valueBool ? 'OK' : 'KO')}
                    </div>
                    <div className="text-right"><Badge tone={t.inSpec ? 'emerald' : 'rose'}>{t.inSpec ? 'EN SPEC' : 'FUERA'}</Badge></div>
                  </div>
                ))}
              </div>
            </SBCard>

             <SBCard title={
                <div className="flex items-center gap-2">
                    <Hourglass size={16}/><span>Decisiones de Calidad</span>
                </div>
            }>
               <div className="p-4 space-y-2">
                {decisionsForSelected.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">Sin decisiones.</p>
                : decisionsForSelected.map(d => (
                  <div key={d.id} className="text-xs p-2 border rounded-md">
                    <div className="flex justify-between items-center">
                        <Badge tone={qcTone(d.status)}>{prettyStatus(d.status)}</Badge>
                        <span className="text-zinc-500">{new Date(d.reviewedAt!).toLocaleString('es-ES')} por {d.reviewedById}</span>
                    </div>
                    {d.remarks && <p className="mt-1 italic">“{d.remarks}”</p>}
                  </div>
                ))}
              </div>
            </SBCard>
            
            <SBCard title="Acción de Liberación">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <SBButton variant="secondary" className="border-green-600 text-green-700 hover:bg-green-50"><CheckCircle2 size={16}/> Liberar</SBButton>
                    <SBButton variant="secondary" className="border-amber-600 text-amber-700 hover:bg-amber-50"><MoveRight size={16}/> Condicional</SBButton>
                    <SBButton variant="secondary" className="border-red-600 text-red-700 hover:bg-red-50"><XCircle size={16}/> Rechazar</SBButton>
                </div>
            </SBCard>
        </>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500 border-2 border-dashed rounded-xl">
            Selecciona un lote para ver los detalles
          </div>
        )}
      </div>
    </div>
  );
}
