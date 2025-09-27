"use client";

/* ============================================================================
 * /quality/laboratorio — Liberación de Lotes
 * - NO crea lotes. Solo lista y permite revisar/decidir sobre lotes que vienen
 *   desde inventario/producción.
 * - Paneles: En hold / Liberados / Rechazados
 * - Detalle: resumen + QcTests + QcBatchResults
 * - Acento: --sb-accent-calidad
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import { CheckCircle2, XCircle, Hourglass, Search, FlaskConical, FileCheck2, Filter } from "lucide-react";
import type { Lot, QcTest, QcBatchResult, Item } from "@/domain/ssot";

type BucketKey = "HOLD" | "RELEASED" | "REJECTED";

function Badge({ children, tone="zinc" }: { children: React.ReactNode; tone?: "zinc"|"sky"|"amber"|"rose"|"emerald" }) {
  const color = {
    zinc: "border-zinc-200 bg-white text-zinc-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${color}`}>{children}</span>;
}

function qcTone(s?: string): "emerald"|"amber"|"rose"|"zinc" {
  if (!s) return "zinc";
  if (s === "RELEASED") return "emerald";
  if (s === "CONDITIONAL_RELEASE" || s === "WAIVED" || s === "IN_PROGRESS") return "amber";
  if (s === "REJECTED") return "rose";
  return "zinc";
}

export default function LabReleasePage() {
  const { data } = useData();

  const lots = (data?.lots ?? []) as Lot[];
  const items = (data?.items ?? []) as Item[];
  const qcTests = (data?.qcTests ?? []) as QcTest[];
  const qcBatchResults = (data?.qcBatchResults ?? []) as QcBatchResult[];

  const [query, setQuery] = useState("");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [filterItem, setFilterItem] = useState<string>("");

  const matchQuery = (l: Lot) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      l.lotNumber.toLowerCase().includes(q) ||
      l.itemId.toLowerCase().includes(q)
    );
  };

  const matchItem = (l: Lot) => {
    if (!filterItem) return true;
    return l.itemId === filterItem;
  };

  // Reglas de bucket:
  // - HOLD: lotStatus==='ON_HOLD_QC' o qcStatus in ['PENDING','IN_PROGRESS','WAIVED','CONDITIONAL_RELEASE']
  // - RELEASED: qcStatus==='RELEASED'
  // - REJECTED: qcStatus==='REJECTED'
  const buckets = useMemo(() => {
    const hold: Lot[] = [];
    const released: Lot[] = [];
    const rejected: Lot[] = [];
    for (const l of lots) {
      if (!matchQuery(l) || !matchItem(l)) continue;
      const isHold =
        l.status === "ON_HOLD_QC" ||
        ["PENDING", "IN_PROGRESS", "WAIVED", "CONDITIONAL_RELEASE"].includes(l.qcStatus as any);
      if (l.qcStatus === "RELEASED") released.push(l);
      else if (l.qcStatus === "REJECTED") rejected.push(l);
      else if (isHold) hold.push(l);
      // Si no tiene qcStatus, lo consideramos HOLD por defecto
      else if (!l.qcStatus) hold.push(l);
    }
    // Ordena por fecha (más recientes arriba si tienen createdAt)
    const byDateDesc = (a: Lot, b: Lot) =>
      new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();
    return {
      HOLD: hold.sort(byDateDesc),
      RELEASED: released.sort(byDateDesc),
      REJECTED: rejected.sort(byDateDesc),
    } as Record<BucketKey, Lot[]>;
  }, [lots, query, filterItem]);

  const selected = useMemo(
    () => (selectedLot ? lots.find(l => l.lotNumber === selectedLot) ?? null : null),
    [selectedLot, lots]
  );

  const selectedItem = useMemo(
    () => (selected ? items.find(i => i.id === selected.itemId) ?? null : null),
    [selected, items]
  );

  const testsForSelected = useMemo(
    () => (selected ? qcTests.filter(t => t.lotNumber === selected.lotNumber).sort((a,b)=> new Date(b.testedAt).getTime()-new Date(a.testedAt).getTime()) : []),
    [selected, qcTests]
  );

  const decisionsForSelected = useMemo(
    () => (selected ? qcBatchResults.filter(r => r.lotNumber === selected.lotNumber).sort((a,b)=> new Date(b.reviewedAt ?? 0).getTime()-new Date(a.reviewedAt ?? 0).getTime()) : []),
    [selected, qcBatchResults]
  );

  const itemOptions = useMemo(() => {
    const ids = Array.from(new Set(lots.map(l => l.itemId)));
    return ids.map(id => ({ id, name: items.find(i => i.id === id)?.name ?? id }));
  }, [lots, items]);

  return (
    <div className="mx-auto max-w-screen-2xl p-6 space-y-6">
      <SBCard title="Laboratorio — Liberación de lotes" accent="hsl(var(--sb-accent-calidad))">
        <div className="p-4 grid md:grid-cols-[1fr_240px] gap-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="h-10 border rounded-lg px-3 w-full"
              placeholder="Buscar por lote o ítem…"
              value={query}
              onChange={e=>setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-zinc-500" />
            <select className="h-10 border rounded-lg px-2 w-full" value={filterItem} onChange={e=>setFilterItem(e.target.value)}>
              <option value="">Todos los ítems</option>
              {itemOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>
        </div>
      </SBCard>

      <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
        {/* Columna izquierda: Listas */}
        <div className="space-y-6">
          {/* HOLD */}
          <SBCard title={<div className="flex items-center gap-2"><Hourglass size={16}/> En hold</div>} accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4">
              {buckets.HOLD.length === 0 && <div className="text-sm text-zinc-500">Sin lotes en hold.</div>}
              <ul className="divide-y">
                {buckets.HOLD.map(l => (
                  <li key={l.lotNumber} className="py-2">
                    <button
                      onClick={()=>setSelectedLot(l.lotNumber)}
                      className="w-full text-left rounded-lg p-2 hover:bg-zinc-50 border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{l.lotNumber}</div>
                          <div className="text-xs text-zinc-600 truncate">
                            {l.itemId} · {l.quantity} {items.find(i=>i.id===l.itemId)?.uom ?? ""} · QC {l.qcStatus ?? "PENDING"}
                          </div>
                        </div>
                        <Badge tone={qcTone(l.qcStatus)}>{l.qcStatus ?? "PENDING"}</Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </SBCard>

          {/* RELEASED */}
          <SBCard title={<div className="flex items-center gap-2"><CheckCircle2 size={16}/> Liberados</div>} accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4">
              {buckets.RELEASED.length === 0 && <div className="text-sm text-zinc-500">Sin lotes liberados.</div>}
              <ul className="grid md:grid-cols-2 gap-2">
                {buckets.RELEASED.map(l => (
                  <li key={l.lotNumber} className="border rounded-lg p-2 bg-white">
                    <div className="font-medium">{l.lotNumber}</div>
                    <div className="text-xs text-zinc-600">{l.itemId} · {l.quantity} {items.find(i=>i.id===l.itemId)?.uom ?? ""}</div>
                  </li>
                ))}
              </ul>
            </div>
          </SBCard>

          {/* REJECTED */}
          <SBCard title={<div className="flex items-center gap-2"><XCircle size={16}/> Rechazados</div>} accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4">
              {buckets.REJECTED.length === 0 && <div className="text-sm text-zinc-500">Sin lotes rechazados.</div>}
              <ul className="grid md:grid-cols-2 gap-2">
                {buckets.REJECTED.map(l => (
                  <li key={l.lotNumber} className="border rounded-lg p-2 bg-white">
                    <div className="font-medium">{l.lotNumber}</div>
                    <div className="text-xs text-zinc-600">{l.itemId} · {l.quantity} {items.find(i=>i.id===l.itemId)?.uom ?? ""}</div>
                  </li>
                ))}
              </ul>
            </div>
          </SBCard>
        </div>

        {/* Columna derecha: Detalle */}
        <div className="space-y-6">
          <SBCard title="Detalle del lote" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 text-sm">
              {!selected && <div className="text-zinc-500">Selecciona un lote en hold para revisar y decidir.</div>}
              {selected && (
                <div className="space-y-2">
                  <div className="text-base font-semibold">{selected.lotNumber}</div>
                  <div className="text-zinc-600">
                    Ítem: {selectedItem?.name ?? selected.itemId} · Cantidad: {selected.quantity} {selectedItem?.uom ?? ""}
                  </div>
                  <div className="text-zinc-600">
                    QC: <Badge tone={qcTone(selected.qcStatus)}>{selected.qcStatus ?? "PENDING"}</Badge>
                    {selected.status ? <> · Estado: {selected.status}</> : null}
                    {selected.locationId ? <> · Ubicación: {selected.locationId}</> : null}
                  </div>
                </div>
              )}
            </div>
          </SBCard>

          <SBCard title="Resultados analíticos" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-3">
              {(!selected || testsForSelected.length === 0) && <div className="text-sm text-zinc-500">Sin tests registrados para este lote.</div>}
              {testsForSelected.map(t => (
                <div key={t.id} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium inline-flex items-center gap-2"><FlaskConical size={14}/> {t.parameterId}</div>
                    <div className="text-xs text-zinc-500">{new Date(t.testedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-zinc-700">
                    {t.valueNumeric!=null ? <>Valor: <b>{t.valueNumeric}</b> {t.unit ?? ""}</> :
                     t.valueText ? <>Valor: <b>{t.valueText}</b></> :
                     t.valueBool!=null ? <>Valor: <b>{t.valueBool ? "Sí" : "No"}</b></> : "—"}
                  </div>
                  {t.inSpec!=null && <div className="text-xs">{t.inSpec ? <Badge tone="emerald">En especificación</Badge> : <Badge tone="rose">Fuera de espec.</Badge>}</div>}
                </div>
              ))}
            </div>
          </SBCard>

          <SBCard title="Histórico de decisiones" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-2">
              {(!selected || decisionsForSelected.length === 0) && <div className="text-sm text-zinc-500">Sin decisiones registradas.</div>}
              {decisionsForSelected.map(d => (
                <div key={d.id} className="border rounded-lg p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-medium inline-flex items-center gap-2"><FileCheck2 size={14}/> Decisión</div>
                    <div className="text-xs text-zinc-500">{d.reviewedAt ? new Date(d.reviewedAt).toLocaleString() : "—"}</div>
                  </div>
                  <div className="text-sm">
                    <Badge tone={qcTone(d.status)}>{d.status}</Badge>
                    {d.remarks ? <span className="ml-2 text-zinc-700">{d.remarks}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </SBCard>

          {/* Botonera de decisión (placeholders; conecta a tu API para persistir) */}
          <SBCard title="Acción de liberación" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 flex flex-col gap-2 text-sm">
              {!selected && <div className="text-zinc-500">Selecciona un lote para decidir.</div>}
              {selected && (
                <>
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-emerald-50"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'RELEASED' }
                      // y actualizar inventario/ubicación si procede
                      console.log("RELEASED", selected.lotNumber);
                    }}
                  >
                    Liberar (RELEASED)
                  </button>
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-amber-50"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'CONDITIONAL_RELEASE' }
                      console.log("CONDITIONAL_RELEASE", selected.lotNumber);
                    }}
                  >
                    Liberación condicional
                  </button>
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-rose-50"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'REJECTED' }
                      console.log("REJECTED", selected.lotNumber);
                    }}
                  >
                    Rechazar (REJECTED)
                  </button>
                </>
              )}
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}
