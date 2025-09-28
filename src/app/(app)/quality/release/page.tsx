
// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle, XCircle, Hourglass, Search, FlaskConical, Filter, ChevronDown, GitBranch,
  FileQuestion, Package, AlertTriangle, ClipboardCheck, User, Save, FilePlus2, ListOrdered, FileCheck, ArrowRight, Truck, Factory as FactoryIcon
} from "lucide-react";
import type {
  Lot, QcTest, QcBatchResult, Item, ParameterCatalog, QcPlan, Incident, Coa,
  QcTestSpec, ProductionOrder, LotGenealogyEdge, StockMove, ProtocolAcknowledgement, QcStatus, OnHandView
} from "@/domain/ssot";
import { qcFromRow } from '@/lib/sb-core';


// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type BucketKey = "ALL" | "HOLD" | "RELEASED" | "REJECTED" | "UNDEFINED";

const TABS_CONFIG = [
  { id: "ALL" as BucketKey, label: "Todos", icon: ListOrdered },
  { id: "UNDEFINED" as BucketKey, label: "Sin Estado", icon: FileQuestion },
  { id: "HOLD" as BucketKey, label: "En Hold", icon: Hourglass },
  { id: "RELEASED" as BucketKey, label: "Liberados", icon: CheckCircle },
  { id: "REJECTED" as BucketKey, label: "Rechazados", icon: XCircle },
];

const QC_STATUS_TEXT: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  CONDITIONAL_RELEASE: "Liberado Condicional",
  RELEASED: "Liberado",
  REJECTED: "Rechazado",
  WAIVED: "Eximido",
  ON_HOLD_QC: "En Hold",
  hold: "Retenido",
  release: "Liberado",
  reject: "Rechazado",
};

const QC_STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "zinc"> = {
  RELEASED: "emerald",
  release: "emerald",
  PENDING: "amber",
  IN_PROGRESS: "amber",
  CONDITIONAL_RELEASE: "amber",
  WAIVED: "amber",
  ON_HOLD_QC: "amber",
  hold: "amber",
  REJECTED: "rose",
  reject: "rose",
};
const qcTone = (s?: string): "emerald" | "amber" | "rose" | "zinc" => (s ? (QC_STATUS_TONE[s.toUpperCase()] || "amber") : "zinc");
const prettyStatus = (s?: string) => s ? (QC_STATUS_TEXT[s.toUpperCase()] || s) : "SIN ESTADO";

// ============================================================================
// COMPONENTES DE UI Y HELPERS
// ============================================================================

function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) {
  const toneClasses = {
    zinc: 'bg-zinc-100 text-zinc-800',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${toneClasses[tone]}`}>{children}</span>;
}

type TraceEvent = {
  id: string; at: string; kind: string; title: string;
  details?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: "zinc" | "sky" | "amber" | "rose" | "emerald";
};

type NormalizeCtx = {
  qcTests: QcTest[];
  qcBatchResults: QcBatchResult[];
  incidents: Incident[];
  stockMoves: StockMove[];
  protocolAcks: ProtocolAcknowledgement[];
  orders: ProductionOrder[];
  genealogy?: LotGenealogyEdge[]; // opcional si lo tienes
};

function normalizeLotHistory(lot: Lot, data: NormalizeCtx): TraceEvent[] {
  const events: TraceEvent[] = [];
  const lotNumber = lot.lotNumber;
  const orderId = lot.producedByOrderId ?? lot.orderId ?? undefined;

  const safeWhen = (...candidates: (string | undefined | null)[]) => {
    for (const c of candidates) {
      if (!c) continue;
      const t = new Date(c);
      if (!Number.isNaN(t.getTime())) return c;
    }
    // fallback: ahora mismo para evitar NaN
    return new Date().toISOString();
  };

  const push = (e: Omit<TraceEvent, "id" | "tone"> & { id?: string; tone?: TraceEvent["tone"] }) => {
    const tone = e.tone ?? "zinc";
    const id = e.id ?? `${e.kind}-${e.at}-${e.title}`; // estable
    events.push({ ...e, id, tone });
  };

  // === INVENTARIO / MOVIMIENTOS ===
  data.stockMoves
    .filter(m => m.lotNumber === lotNumber)
    .forEach(m => {
      const reason = (m.reason || "").toLowerCase();
      const at = safeWhen(m.occurredAt, (m as any).createdAt as string);
      const qty = typeof m.qty === "number" ? m.qty : (m as any).quantity;
      const uom = (m as any).uom || (m as any).unit || "";
      const toLoc = (m as any).toLocationId || (m as any).toLocation || (m as any).to || "";
      const fromLoc = (m as any).fromLocationId || (m as any).fromLocation || (m as any).from || "";
      const isShip = (m.reason || "").toLowerCase() === "ship" || !!(m as any).ref?.shipmentId;
      
      const base = {
        at,
        details: `Cantidad: ${qty ?? "?"} ${uom ?? ""} · ${fromLoc ? `De: ${fromLoc} ` : ""}${toLoc ? `→ A: ${toLoc}` : ""}`.trim(),
      };

      if (reason === "receipt") {
        push({ ...base, kind: "RECEIPT", title: "Entrada en almacén", icon: Package, tone: "sky" });
      } else if (reason === "move" || reason === "transfer") {
        push({ ...base, kind: "MOVE", title: "Movimiento interno", icon: GitBranch, tone: "zinc" });
      } else if (reason === "pick") {
        push({ ...base, kind: "PICK", title: "Preparación de pedido", icon: ClipboardCheck, tone: "amber" });
      } else if (isShip) {
        push({ ...base, kind: "SHIP", title: "Envío/Salida", icon: Truck, tone: "rose" });
      } else if (reason === "adjust") {
        push({ ...base, kind: "ADJUST", title: "Ajuste de inventario", icon: AlertTriangle, tone: "amber" });
      } else {
        push({ ...base, kind: reason.toUpperCase() || "MOVE", title: "Movimiento de stock", icon: Package, tone: "zinc" });
      }
    });

  // === QC TESTS (mediciones) ===
  data.qcTests
    .filter(t => t.lotNumber === lotNumber)
    .forEach(t => {
      const at = safeWhen((t as any).testedAt, (t as any).createdAt);
      const value =
        t.valueNumeric != null
          ? t.valueNumeric.toFixed(2)
          : t.valueText ?? (t.valueBool != null ? (t.valueBool ? "OK" : "KO") : "—");
      const inSpec = t.inSpec === true;
      push({
        id: `qct-${t.id}`,
        at,
        kind: "QC_TEST",
        title: `Análisis: ${t.parameterId}`,
        details: `Resultado: ${value}${inSpec != null ? ` · ${inSpec ? "En spec" : "Fuera de spec"}` : ""}`,
        icon: FlaskConical,
        tone: inSpec ? "emerald" : "rose",
      });
    });

  // === QC DECISIONES (batch results) ===
  data.qcBatchResults
    .filter(r => r.lotNumber === lotNumber)
    .forEach(r => {
      const at = safeWhen((r as any).reviewedAt, (r as any).decidedAt, (r as any).createdAt);
      push({
        id: `qcb-${r.id}`,
        at,
        kind: "QC_DECISION",
        title: `Decisión: ${prettyStatus(r.status)}`,
        details: `Revisado por ${r.reviewedById ?? "—"}${r.remarks ? ` · "${r.remarks}"` : ""}`,
        icon: FileCheck,
        tone: qcTone(r.status),
      });
    });

  // === PROTOCOLOS (seguridad/personal) ligados a la orden (si existe) ===
  if (orderId) {
    data.protocolAcks
      .filter(p => p.orderId === orderId)
      .forEach(p => {
        push({
          id: `pa-${p.id}`,
          at: safeWhen((p as any).at, (p as any).createdAt),
          kind: "PROTOCOL",
          title: "Protocolo confirmado",
          details: `Confirmado por ${p.acknowledgedByUserId} · Orden ${orderId}`,
          icon: ClipboardCheck,
          tone: "emerald",
        });
      });
  }

  // === ESTADOS DE PRODUCCIÓN (si tenemos la orden) ===
  if (orderId) {
    const po = data.orders.find(o => (o as any).id === orderId);
    if (po) {
      const st = (po as any).statusHistory as Array<{ at: string; status: string }> | undefined;
      if (Array.isArray(st)) {
        st.forEach(s =>
          push({
            id: `po-${orderId}-${s.status}-${s.at}`,
            at: safeWhen(s.at),
            kind: "PRODUCTION",
            title: `Producción: ${s.status}`,
            details: `Orden ${orderId}`,
            icon: FactoryIcon,
            tone: s.status === "CLOSED" ? "emerald" : s.status === "PAUSED" ? "amber" : "sky",
          }),
        );
      }
    }
  }

  // === INCIDENTES ===
  data.incidents
    .filter(i => i.lotNumber === lotNumber)
    .forEach(i => {
      push({
        id: `inc-${i.id}`,
        at: safeWhen((i as any).at, (i as any).createdAt, (i as any).updatedAt),
        kind: "INCIDENT",
        title: `Incidente: ${i.description ?? i.id}`,
        details: `Severidad: ${(i as any).severity ?? "N/A"} · Estado: ${i.status ?? "—"}`,
        icon: AlertTriangle,
        tone: "amber",
      });
    });

  // === GENEALOGÍA (opcional) ===
  (data.genealogy ?? [])
  .filter(e => {
    const child = e.childLotNumber;
    const parent = e.parentLotNumber;
    return child === lotNumber || parent === lotNumber;
  })
  .forEach(e => {
    const isParent = e.parentLotNumber === lotNumber;
    push({
      id: `gen-${e.id}`,
      at: safeWhen((e as any).at, (e as any).createdAt),
      kind: "GENEALOGY",
      title: isParent ? `Usado en ${e.childLotNumber}` : `Origen: ${e.parentLotNumber}`,
      details: (e as any).note ?? "",
      icon: GitBranch,
      tone: "zinc",
    });
  });

  // === ORDENAR + DEDUP ===
  const uniq = new Map<string, TraceEvent>();
  for (const ev of events) uniq.set(ev.id, ev);
  return Array.from(uniq.values()).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
// ============================================================================
// COMPONENTE PRINCIPAL: LabReleasePage
// ============================================================================
export default function LabReleasePage() {
  const { data } = useData();

  const {lots, items, qcTests, qcBatchResults, qcParameters, qcPlans, incidents, stockMoves, protocolAcks, orders, onHand} = useMemo(()=> ({
    lots: data?.lots ?? [],
    items: data?.items ?? [],
    qcTests: data?.qcTests ?? [],
    qcBatchResults: data?.qcBatchResults ?? [],
    qcParameters: data?.qcParameters ?? [],
    qcPlans: data?.qc_plans ?? [],
    incidents: data?.incidents ?? [],
    stockMoves: data?.stockMoves ?? [],
    protocolAcks: data?.protocolAcks ?? [],
    orders: data?.productionOrders ?? [],
    onHand: data?.onHand ?? [],
  }), [data]);
  
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [activeTab, setActiveTab] = useState<BucketKey>("ALL");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const parameterMap = useMemo(() => new Map(qcParameters.map(p => [p.id, p])), [qcParameters]);
  const qcPlanMap = useMemo(() => new Map(qcPlans.map(p => [p.id, p])), [qcPlans]);

  const lotsForSelectedSku = useMemo(() => {
    if (!selectedSku) return [];
    const uniqueLotNumbers = new Set<string>();
    onHand.forEach(l => {
      if (l.itemId === selectedSku && l.lotNumber) {
        uniqueLotNumbers.add(l.lotNumber);
      }
    });
    return Array.from(uniqueLotNumbers);
  }, [selectedSku, onHand]);
  
  const latestDecisionByLot = useMemo(() => {
    const map = new Map<string, string>(); // lotNumber -> status
    for (const r of qcBatchResults) {
      if (!r.lotNumber) continue;
      const key = r.lotNumber;
      const when = new Date((r as any).reviewedAt ?? (r as any).decidedAt ?? (r as any).createdAt ?? 0).getTime();
      const prev = map.get(key);
      if (!prev || when > ((map as any)[`__t_${key}`] || 0)) {
        map.set(key, String(r.status).toUpperCase());
        (map as any)[`__t_${key}`] = when;
      }
    }
    return map;
  }, [qcBatchResults]);


  const buckets = useMemo(() => {
    const hold: OnHandView[] = []; const released: OnHandView[] = []; const rejected: OnHandView[] = []; const undefinedState: OnHandView[] = [];
    const lowerQuery = query.trim().toLowerCase();

    const lotsToFilter = selectedSku ? onHand.filter(l => l.itemId === selectedSku) : onHand;

    for (const l of lotsToFilter) {
      if(!l.lotNumber) continue;
      const item = itemMap.get(l.itemId);
      const matchesQuery = !lowerQuery || l.lotNumber.toLowerCase().includes(lowerQuery) || (item?.name || '').toLowerCase().includes(lowerQuery);
      if (!matchesQuery) continue;

      const raw = qcFromRow(l as any) ?? latestDecisionByLot.get(l.lotNumber!) ?? (lots.find(master => master.lotNumber === l.lotNumber)?.qcStatus) ?? '';
      const status = String(raw).toUpperCase();
      
      if (status === "RELEASED" || status === "RELEASE") {
        released.push(l);
      } else if (status === "REJECTED" || status === "REJECT") {
        rejected.push(l);
      } else if (
        status === "HOLD" ||
        status === "PENDING" ||
        status === "IN_PROGRESS" ||
        status === "CONDITIONAL_RELEASE" ||
        status === "WAIVED" ||
        status === "ON_HOLD_QC"
      ) {
        hold.push(l);
      } else {
        undefinedState.push(l);
      }
    }
    const byDateDesc = (a: OnHandView, b: OnHandView) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const HOLD = hold.sort(byDateDesc);
    const RELEASED = released.sort(byDateDesc);
    const REJECTED = rejected.sort(byDateDesc);
    const UNDEFINED = undefinedState.sort(byDateDesc);

    const ALL = [...HOLD, ...RELEASED, ...REJECTED, ...UNDEFINED].sort(byDateDesc);
    return { ALL, HOLD, RELEASED, REJECTED, UNDEFINED };
  }, [onHand, lots, itemMap, query, selectedSku, latestDecisionByLot]);

  const visibleLots = buckets[activeTab];

  useEffect(() => {
    if (!selectedLot && visibleLots.length) setSelectedLot(visibleLots[0].lotNumber!);
    if (selectedLot && !visibleLots.some(l => l.lotNumber === selectedLot)) {
      setSelectedLot(visibleLots[0]?.lotNumber ?? null);
    }
  }, [visibleLots, selectedLot]);
  
  const handleSkuChange = (skuId: string) => {
    setSelectedSku(skuId);
    setQuery('');
    setSelectedLot(null);
    setActiveTab("ALL");
  };

  const handleLotChange = (lotNumber: string) => {
    setSelectedLot(lotNumber);
    setQuery(lotNumber);
  };

  const selectedLotData = useMemo(() => {
    if (!selectedLot) return null;
  
    // 1) Intenta encontrar el lote "master"
    const lotMaster = lots.find(l => l.lotNumber === selectedLot) ?? null;
  
    // 2) Fallback a onHand si no hay master
    const oh = onHand.find(l => l.lotNumber === selectedLot) ?? null;
  
    if (!lotMaster && !oh) return null; // nada que mostrar
  
    // 3) Construye un "virtual lot" mínimamente viable (para timeline) si falta el master
    const lot: Lot = lotMaster ?? ({
      id: `virtual-${selectedLot}`,
      lotNumber: selectedLot,
      itemId: oh?.itemId ?? "",
      producedByOrderId: (oh as any)?.prodOrderId ?? undefined,
      qcPlanId: undefined, // En la rama donde lotMaster es null, esto debe ser undefined
      qcStatus: undefined, // Igual aquí
      status: undefined,   // E igual aquí
      quantity: (oh as any)?.qty ?? (oh as any)?.quantity ?? 0,
      uom: (oh as any)?.uom ?? "",
      createdAt: oh?.createdAt ?? new Date().toISOString(),
      updatedAt: oh?.updatedAt ?? oh?.createdAt ?? new Date().toISOString(),
    } as any);
  
    const plan = lot.qcPlanId ? qcPlanMap.get(lot.qcPlanId) : undefined;
    const history = normalizeLotHistory(lot, { qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders, genealogy: data?.lotGenealogy });
    return { lot, item: itemMap.get(lot.itemId), plan, history };
  }, [selectedLot, lots, onHand, itemMap, qcPlanMap, qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders, data?.lotGenealogy]);


  useEffect(() => {
    const bad = selectedLotData?.history.filter(h => !h.icon);
    if (bad && bad.length) {
      console.warn("Eventos sin icono:", bad.map(b => ({ id: b.id, kind: b.kind, title: b.title })));
    }
  }, [selectedLotData]);

  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [reviewer, setReviewer] = useState("default.user");

  useEffect(() => { setAnalysisResults({}); }, [selectedLot]);

  const handleAnalysisChange = (parameterId: string, value: string) => setAnalysisResults(prev => ({ ...prev, [parameterId]: value }));
  
  const handleSaveDecision = (decision: "RELEASED" | "REJECTED" | "ON_HOLD_QC") => {
    if (!selectedLotData) return;
    console.log({
      action: "SAVE_QC_DECISION",
      lotNumber: selectedLotData.lot.lotNumber,
      decision,
      reviewer,
      results: analysisResults,
      timestamp: new Date().toISOString()
    });
    alert(`Decisión '${QC_STATUS_TEXT[decision] || decision}' guardada para el lote ${selectedLotData.lot.lotNumber} por ${reviewer}.`);
    setAnalysisResults({});
  };

  const requiredSpecs = selectedLotData?.plan?.specs.filter(s => (s as any).required) ?? [];
  const allRequiredResultsEntered = requiredSpecs.every(spec =>
    analysisResults[spec.parameterId] && analysisResults[spec.parameterId].trim() !== ""
  );
  
  
  const toneBg: Record<TraceEvent["tone"], string> = {
    zinc: "bg-zinc-100",
    sky: "bg-sky-100",
    amber: "bg-amber-100",
    rose: "bg-rose-100",
    emerald: "bg-emerald-100",
  };
  const toneFg: Record<TraceEvent["tone"], string> = {
    zinc: "text-zinc-700",
    sky: "text-sky-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna 1: Filtros y Tabs */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        <div className="flex items-center gap-2">
            <select value={selectedSku} onChange={(e) => handleSkuChange(e.target.value)} className="flex-grow h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Todos los SKUs</option>
                {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                ))}
            </select>
            <select value={selectedLot || ''} onChange={(e) => handleLotChange(e.target.value)} disabled={!selectedSku} className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Todos los lotes</option>
                {lotsForSelectedSku.map(lotNumber => (
                    <option key={lotNumber} value={lotNumber}>{lotNumber}</option>
                ))}
            </select>
        </div>
         <div className="space-y-1">
          {TABS_CONFIG.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
              <div className="flex items-center gap-2"><tab.icon size={16}/> {tab.label}</div>
              <span className="font-mono text-xs px-1.5 py-0.5 bg-zinc-200 text-zinc-700 rounded-full">{buckets[tab.id].length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Columna 2: Lista de Lotes */}
      <div className="lg:col-span-4 h-full overflow-y-auto border rounded-xl bg-white">
        <div className="divide-y">
            {visibleLots.map(lot => {
                const item = itemMap.get(lot.itemId);
                const isSelected = selectedLot === lot.lotNumber;
                const status = (qcFromRow(lot as any) ?? latestDecisionByLot.get(lot.lotNumber!) ?? '').toUpperCase() as QcStatus;
                return (
                    <button key={lot.id} onClick={() => setSelectedLot(lot.lotNumber!)} className={`w-full text-left p-3 ${isSelected ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-semibold text-zinc-800">{lot.lotNumber}</span>
                            <Badge tone={qcTone(status)}>{prettyStatus(status)}</Badge>
                        </div>
                        <p className="text-xs text-zinc-600">{item?.name ?? lot.itemId}</p>
                        <p className="text-xs text-zinc-400 mt-1">{new Date(lot.updatedAt ?? lot.createdAt ?? 0).toLocaleDateString()}</p>
                    </button>
                )
            })}
             {visibleLots.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">No hay lotes en esta categoría.</div>}
        </div>
      </div>

      {/* Columna 3: Dossier de Lote Interactivo */}
      <div className="lg:col-span-5 h-full overflow-y-auto space-y-4">
        {selectedLotData ? (
        <>
          <SBCard title={<><FlaskConical size={16}/><span>Análisis y Decisión de Calidad</span></>} accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm space-y-1">
                  <p className="font-bold font-mono text-base">{selectedLotData.lot.lotNumber}</p>
                  <p><b>Ítem:</b> {selectedLotData.item?.name}</p>
                  <p><b>Plan QC:</b> {selectedLotData.plan?.name ?? <span className="text-amber-600">Sin plan asignado</span>}</p>
              </div>

              {!selectedLotData.plan && <div className="text-center text-sm text-zinc-500 py-4">No se puede tomar una decisión sin un Plan de Calidad asignado.</div>}

              {selectedLotData.plan && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Resultados requeridos</h4>
                  {requiredSpecs.length === 0 && <p className="text-xs text-zinc-500">Este plan no tiene tests requeridos.</p>}
                  {requiredSpecs.map(spec => {
                    const value = analysisResults[spec.parameterId] ?? "";
                    const numValue = parseFloat(value);
                    let inSpec: boolean | null = null;
                    if (!isNaN(numValue)) {
                      const range = (spec as any).targetRange;
                      if (range) {
                        inSpec = (numValue >= (range.min ?? -Infinity)) && (numValue <= (range.max ?? Infinity));
                      }
                    }
                    return (
                    <div key={spec.parameterId} className="grid grid-cols-[1fr_120px_80px] gap-2 items-center text-xs">
                        <label htmlFor={spec.parameterId} className="font-medium truncate">{(parameterMap.get(spec.parameterId) as any)?.label ?? spec.parameterId}</label>
                        <input
                          id={spec.parameterId} type="number" step="0.01"
                          placeholder={`${(spec as any).targetRange.min ?? '...'} - ${(spec as any).targetRange.max ?? '...'}`}
                          value={value} onChange={e => handleAnalysisChange(spec.parameterId, e.target.value)}
                          className={`w-full border rounded-md p-1 h-7 text-center font-mono ${
                            value && (inSpec === true ? 'border-emerald-500' : inSpec === false ? 'border-rose-500' : 'border-zinc-300')
                          }`}
                        />
                        {value && <Badge tone={inSpec ? 'emerald' : 'rose'}>{inSpec ? 'EN SPEC' : 'FUERA'}</Badge>}
                    </div>
                  )})}
                </div>
              )}
              
              {selectedLotData.plan && (
                <div className="border-t pt-4 space-y-3">
                    <div className="grid grid-cols-[100px,1fr] gap-2 items-center text-xs">
                        <label htmlFor="reviewer" className="font-medium">Responsable</label>
                         <select id="reviewer" value={reviewer} onChange={e => setReviewer(e.target.value)} className="w-full border rounded-md p-1 h-7 bg-white">
                           <option value="default.user">Usuario por Defecto</option>
                           <option value="qc.manager">Manager de Calidad</option>
                           <option value="lab.tech">Técnico de Lab</option>
                         </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <SBButton onClick={() => handleSaveDecision('RELEASED')} disabled={!allRequiredResultsEntered}>
                            <CheckCircle size={16}/> Aprobar Lote
                        </SBButton>
                        <SBButton variant="secondary" onClick={() => handleSaveDecision('ON_HOLD_QC')}>
                            <Hourglass size={16}/> Poner en Hold
                        </SBButton>
                         <SBButton variant="destructive" onClick={() => handleSaveDecision('REJECTED')} disabled={!allRequiredResultsEntered}>
                            <XCircle size={16}/> Rechazar Lote
                        </SBButton>
                    </div>
                </div>
              )}
            </div>
          </SBCard>
          <SBCard title={<><ListOrdered size={16}/><span>Historial del Lote</span></>}>
            <div className="p-4">
              {selectedLotData && (
                <div className="mb-2 text-[11px] text-zinc-500">
                  <span className="mr-3">sm:{stockMoves.filter(m=>m.lotNumber===selectedLotData.lot.lotNumber).length}</span>
                  <span className="mr-3">qct:{qcTests.filter(t=>t.lotNumber===selectedLotData.lot.lotNumber).length}</span>
                  <span className="mr-3">qcb:{qcBatchResults.filter(r=>r.lotNumber===selectedLotData.lot.lotNumber).length}</span>
                  <span>inc:{incidents.filter(i=>i.lotNumber===selectedLotData.lot.lotNumber).length}</span>
                </div>
              )}
              {selectedLotData.history.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center space-y-2">
                  <p>No hay eventos registrados para este lote.</p>
                  <ul className="text-xs list-disc list-inside text-zinc-400">
                    <li>¿Existen <code>stockMoves</code> con <code>lotNumber="{selectedLotData.lot.lotNumber}"</code>?</li>
                    <li>¿Se han guardado <code>qcTests</code> / <code>qcBatchResults</code>?</li>
                    <li>Si el lote viene de orden, ¿hay <code>protocolAcks</code> o <code>statusHistory</code>?</li>
                  </ul>
                </div>
              ) : (
                <ul className="space-y-4">
                  {selectedLotData.history.map(ev => {
                    const Icon = ev.icon ?? FileQuestion;
                    return (
                        <li key={ev.id} className="flex gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full grid place-items-center ${toneBg[ev.tone]}`}>
                                <Icon className={`h-4 w-4 ${toneFg[ev.tone]}`} />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">{ev.title}</p>
                                {ev.details && <p className="text-xs text-zinc-600">{ev.details}</p>}
                                <time className="text-xs text-zinc-400">
                                {new Date(ev.at).toLocaleString("es-ES")}
                                </time>
                            </div>
                        </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </SBCard>
        </>
        ) : ( <div className="h-full flex items-center justify-center text-zinc-500 border-2 border-dashed rounded-xl">Selecciona un lote para ver su dossier.</div> )}
      </div>
    </div>
    
    <div className="mt-8">
        <SBCard title="Lotes en Crudo (Debug)">
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-zinc-100">
                        <tr>
                            <th className="p-2 text-left">ID Lote</th>
                            <th className="p-2 text-left">Nº Lote</th>
                            <th className="p-2 text-left">Item ID</th>
                            <th className="p-2 text-left">Estado QC</th>
                            <th className="p-2 text-left">Estado</th>
                            <th className="p-2 text-right">Cantidad</th>
                            <th className="p-2 text-left">Fecha Creación</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {(data?.lots || []).map((lot: Lot) => (
                            <tr key={lot.id}>
                                <td className="p-2 font-mono">{lot.id}</td>
                                <td className="p-2 font-mono">{lot.lotNumber}</td>
                                <td className="p-2 font-mono">{lot.itemId}</td>
                                <td className="p-2">{lot.qcStatus || 'N/A'}</td>
                                <td className="p-2">{lot.status || 'N/A'}</td>
                                <td className="p-2 text-right font-semibold">{lot.quantity}</td>
                                <td className="p-2">{new Date(lot.createdAt).toLocaleString('es-ES')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SBCard>
    </div>
    </>
  );
}

