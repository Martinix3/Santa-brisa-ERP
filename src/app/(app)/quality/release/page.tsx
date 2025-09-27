"use client";

/* ============================================================================
 * /quality/laboratorio — Liberación de Lotes (v2)
 * - UX enfocada a operativa: barra de búsqueda + filtro por ítem + tabs de estado.
 * - Layout 3 zonas: Toolbar / Lista (con contador) / Detalle sticky.
 * - Accesible y rápida (teclado ↑/↓ para navegar, Enter para seleccionar).
 * - NO crea lotes. Solo decide sobre los existentes.
 * - Paneles: En hold / Liberados / Rechazados (como tabs).
 * - Detalle: Resumen + QcTests + QcBatchResults.
 * - Acento: --sb-accent-calidad.
 * ==========================================================================*/

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
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
} from "lucide-react";
import type { Lot, QcTest, QcBatchResult, Item } from "@/domain/ssot";

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
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${color}`}>{children}</span>;
}

function qcTone(s?: string): "emerald" | "amber" | "rose" | "zinc" {
  if (!s) return "zinc";
  if (s === "RELEASED") return "emerald";
  if (s === "CONDITIONAL_RELEASE" || s === "WAIVED" || s === "IN_PROGRESS" || s === "PENDING") return "amber";
  if (s === "REJECTED") return "rose";
  return "zinc";
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

  const [query, setQuery] = useState("");
  const [filterItem, setFilterItem] = useState<string>("");
  const [activeTab, setActiveTab] = useState<BucketKey>("HOLD");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  // ===== Filtros =====
  const matchQuery = (l: Lot) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const itemName = items.find((i) => i.id === l.itemId)?.name?.toLowerCase() ?? "";
    return l.lotNumber.toLowerCase().includes(q) || l.itemId.toLowerCase().includes(q) || itemName.includes(q);
  };
  const matchItem = (l: Lot) => (!filterItem ? true : l.itemId === filterItem);

  // ===== Buckets =====
  const buckets = useMemo(() => {
    const hold: Lot[] = [];
    const released: Lot[] = [];
    const rejected: Lot[] = [];

    for (const l of lots) {
      if (!matchQuery(l) || !matchItem(l)) continue;
      const isHold =
        l.status === "ON_HOLD_QC" ||
        ["PENDING", "IN_PROGRESS", "WAIVED", "CONDITIONAL_RELEASE", undefined].includes(l.qcStatus as any);

      if (l.qcStatus === "RELEASED") released.push(l);
      else if (l.qcStatus === "REJECTED") rejected.push(l);
      else if (isHold) hold.push(l);
    }

    const byDateDesc = (a: Lot, b: Lot) =>
      new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();

    return {
      HOLD: hold.sort(byDateDesc),
      RELEASED: released.sort(byDateDesc),
      REJECTED: rejected.sort(byDateDesc),
    } as Record<BucketKey, Lot[]>;
  }, [lots, items, query, filterItem]);

  // ===== Selección =====
  const selected = useMemo(() => (selectedLot ? lots.find((l) => l.lotNumber === selectedLot) ?? null : null), [selectedLot, lots]);
  const selectedItem = useMemo(() => (selected ? items.find((i) => i.id === selected.itemId) ?? null : null), [selected, items]);
  const testsForSelected = useMemo(
    () => (selected ? qcTests.filter((t) => t.lotNumber === selected.lotNumber).sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()) : []),
    [selected, qcTests]
  );
  const decisionsForSelected = useMemo(
    () => (selected ? qcBatchResults.filter((r) => r.lotNumber === selected.lotNumber).sort((a, b) => new Date(b.reviewedAt ?? 0).getTime() - new Date(a.reviewedAt ?? 0).getTime()) : []),
    [selected, qcBatchResults]
  );

  const itemOptions = useMemo(() => {
    const ids = Array.from(new Set(lots.map((l) => l.itemId)));
    return ids.map((id) => ({ id, name: items.find((i) => i.id === id)?.name ?? id }));
  }, [lots, items]);

  // ===== UX: navegación con teclado sobre la lista activa =====
  const visibleLots = buckets[activeTab];
  const selectedIndex = visibleLots.findIndex((l) => l.lotNumber === selectedLot);
  const selectByIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= visibleLots.length) return;
      setSelectedLot(visibleLots[idx].lotNumber);
    },
    [visibleLots]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectByIndex(selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, visibleLots.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectByIndex(selectedIndex <= 0 ? 0 : selectedIndex - 1);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        setSelectedLot(visibleLots[selectedIndex].lotNumber);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleLots, selectedIndex, selectByIndex]);

  // ===== Render =====
  return (
    <div className="mx-auto max-w-screen-2xl p-6 space-y-6">
      {/* Toolbar */}
      <SBCard title="Laboratorio — Liberación de lotes" accent="hsl(var(--sb-accent-calidad))">
        <div className="sb-card__content grid md:grid-cols-[1fr_280px] gap-3">
          <label className="flex items-center gap-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="h-10 border rounded-lg px-3 w-full"
              placeholder="Buscar lote, ítem o nombre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar"
            />
          </label>
          <label className="flex items-center gap-2">
            <Filter size={16} className="text-zinc-500" />
            <select
              className="h-10 border rounded-lg px-2 w-full"
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              aria-label="Filtrar por ítem"
            >
              <option value="">Todos los ítems</option>
              {itemOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SBCard>

      {/* Tabs + contenido */}
      <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6 items-start">
        {/* Lista */}
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                activeTab === "HOLD" ? "bg-[hsl(var(--sb-agua)/.16)]" : "bg-white hover:bg-zinc-50"
              }`}
              onClick={() => setActiveTab("HOLD")}
            >
              <Hourglass size={16} /> En hold
              <span className="ml-1 text-xs text-zinc-600">({buckets.HOLD.length})</span>
            </button>
            <button
              className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                activeTab === "RELEASED" ? "bg-[hsl(var(--sb-agua)/.16)]" : "bg-white hover:bg-zinc-50"
              }`}
              onClick={() => setActiveTab("RELEASED")}
            >
              <CheckCircle2 size={16} /> Liberados
              <span className="ml-1 text-xs text-zinc-600">({buckets.RELEASED.length})</span>
            </button>
            <button
              className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                activeTab === "REJECTED" ? "bg-[hsl(var(--sb-agua)/.16)]" : "bg-white hover:bg-zinc-50"
              }`}
              onClick={() => setActiveTab("REJECTED")}
            >
              <XCircle size={16} /> Rechazados
              <span className="ml-1 text-xs text-zinc-600">({buckets.REJECTED.length})</span>
            </button>
          </div>

          <SBCard title={
            <div className="flex items-center gap-2">
              {activeTab === "HOLD" && <Hourglass size={16} />} {activeTab === "RELEASED" && <CheckCircle2 size={16} />} {activeTab === "REJECTED" && <XCircle size={16} />}
              <span className="capitalize">{activeTab.toLowerCase()}</span>
            </div>
          } accent="hsl(var(--sb-accent-calidad))">
            <div className="p-0">
              {visibleLots.length === 0 ? (
                <div className="p-6 text-sm text-zinc-500">Sin resultados para los filtros aplicados.</div>
              ) : (
                <ul className="divide-y">
                  {visibleLots.map((l) => {
                    const it = items.find((i) => i.id === l.itemId);
                    const isSelected = selected?.lotNumber === l.lotNumber;
                    const lastDecision = qcBatchResults
                      .filter((r) => r.lotNumber === l.lotNumber)
                      .sort((a, b) => new Date(b.reviewedAt ?? 0).getTime() - new Date(a.reviewedAt ?? 0).getTime())[0];

                    return (
                      <li key={l.lotNumber} className={`transition-colors ${isSelected ? "bg-zinc-50" : "bg-white"}`}>
                        <button
                          onClick={() => setSelectedLot(l.lotNumber)}
                          className="w-full text-left p-3 focus:outline-none hover:bg-zinc-50"
                          aria-current={isSelected}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{l.lotNumber}</div>
                              <div className="text-xs text-zinc-600 truncate">
                                {it?.name ?? l.itemId} · {l.quantity} {it?.uom ?? ""}
                                {l.locationId ? <> · {l.locationId}</> : null}
                                {l.receivedAt || l.createdAt ? (
                                  <>
                                    {" "}· {new Date(l.receivedAt ?? l.createdAt!).toLocaleDateString()}
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {lastDecision?.status ? <Badge tone={qcTone(lastDecision.status)}>{prettyStatus(lastDecision.status)}</Badge> : null}
                              <Badge tone={qcTone(l.qcStatus)}>{prettyStatus(l.qcStatus)}</Badge>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </SBCard>
        </div>

        {/* Detalle sticky */}
        <div className="space-y-6 xl:sticky xl:top-6">
          <SBCard title="Detalle del lote" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 text-sm">
              {!selected && <div className="text-zinc-500">Selecciona un lote de la lista para revisar y decidir.</div>}
              {selected && (
                <div className="space-y-2">
                  <div className="text-base font-semibold">{selected.lotNumber}</div>
                  <div className="text-zinc-600">
                    Ítem: {selectedItem?.name ?? selected.itemId} · Cantidad: {selected.quantity} {selectedItem?.uom ?? ""}
                  </div>
                  <div className="text-zinc-600 flex flex-wrap items-center gap-2">
                    <span>
                      QC: <Badge tone={qcTone(selected.qcStatus)}>{prettyStatus(selected.qcStatus)}</Badge>
                    </span>
                    {selected.status ? <span className="text-xs">· Estado: {selected.status}</span> : null}
                    {selected.locationId ? <span className="text-xs">· Ubicación: {selected.locationId}</span> : null}
                    {selected.receivedAt || selected.createdAt ? (
                      <span className="text-xs">· {new Date(selected.receivedAt ?? selected.createdAt!).toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </SBCard>

          <SBCard title="Resultados analíticos" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-3">
              {(!selected || testsForSelected.length === 0) && <div className="text-sm text-zinc-500">Sin tests registrados para este lote.</div>}
              {testsForSelected.map((t) => (
                <div key={t.id} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium inline-flex items-center gap-2">
                      <FlaskConical size={14} /> {t.parameterId}
                    </div>
                    <div className="text-xs text-zinc-500">{new Date(t.testedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-zinc-700">
                    {t.valueNumeric != null ? (
                      <>
                        Valor: <b>{t.valueNumeric}</b> {t.unit ?? ""}
                      </>
                    ) : t.valueText ? (
                      <>
                        Valor: <b>{t.valueText}</b>
                      </>
                    ) : t.valueBool != null ? (
                      <>
                        Valor: <b>{t.valueBool ? "Sí" : "No"}</b>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  {t.inSpec != null && (
                    <div className="text-xs mt-1">
                      {t.inSpec ? <Badge tone="emerald">En especificación</Badge> : <Badge tone="rose">Fuera de espec.</Badge>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SBCard>

          <SBCard title="Histórico de decisiones" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-2">
              {(!selected || decisionsForSelected.length === 0) && <div className="text-sm text-zinc-500">Sin decisiones registradas.</div>}
              {decisionsForSelected.map((d) => (
                <div key={d.id} className="border rounded-lg p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-medium inline-flex items-center gap-2">
                      <FileCheck2 size={14} /> Decisión
                    </div>
                    <div className="text-xs text-zinc-500">{d.reviewedAt ? new Date(d.reviewedAt).toLocaleString() : "—"}</div>
                  </div>
                  <div className="text-sm">
                    <Badge tone={qcTone(d.status)}>{prettyStatus(d.status)}</Badge>
                    {d.remarks ? <span className="ml-2 text-zinc-700">{d.remarks}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </SBCard>

          {/* Botonera de decisión (conecta a tu API) */}
          <SBCard title="Acción de liberación" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 flex flex-col gap-2 text-sm">
              {!selected && <div className="text-zinc-500">Selecciona un lote para decidir.</div>}
              {selected && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-emerald-50 inline-flex items-center justify-center gap-2"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'RELEASED' }
                      console.log("RELEASED", selected.lotNumber);
                    }}
                  >
                    <CheckCircle2 size={16} /> Liberar
                  </button>
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-amber-50 inline-flex items-center justify-center gap-2"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'CONDITIONAL_RELEASE' }
                      console.log("CONDITIONAL_RELEASE", selected.lotNumber);
                    }}
                  >
                    <MoveRight size={16} /> Condicional
                  </button>
                  <button
                    className="h-10 rounded-lg border bg-white hover:bg-rose-50 inline-flex items-center justify-center gap-2"
                    onClick={() => {
                      // TODO: POST /api/quality/release { lotNumber, status:'REJECTED' }
                      console.log("REJECTED", selected.lotNumber);
                    }}
                  >
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}
