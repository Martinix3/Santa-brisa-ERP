// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle2, XCircle, Hourglass, Search, FlaskConical, Filter, ChevronDown, GitBranch,
  FileQuestion, Package, AlertTriangle, ClipboardCheck, User, Save, FilePlus2, ListOrdered, FileCheck2
} from "lucide-react";
import type {
  Lot, QcTest, QcBatchResult, Item, ParameterCatalog, QcPlan, Incident, Coa,
  QcTestSpec, ProductionOrder, LotGenealogyEdge, StockMove, ProtocolAcknowledgement
} from "@/domain/ssot";


// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

// MEJORA 2: Se añade la clave "UNDEFINED" para lotes legacy
type BucketKey = "HOLD" | "RELEASED" | "REJECTED" | "UNDEFINED";

const TABS_CONFIG = [
  // MEJORA 2: Nuevo tab para lotes sin estado definido
  { id: "UNDEFINED" as BucketKey, label: "Sin Estado", icon: FileQuestion },
  { id: "HOLD" as BucketKey, label: "En Hold", icon: Hourglass },
  { id: "RELEASED" as BucketKey, label: "Liberados", icon: CheckCircle2 },
  { id: "REJECTED" as BucketKey, label: "Rechazados", icon: XCircle },
];

// Mapeos de estado y color (sin cambios)
const QC_STATUS_TEXT: Record<string, string> = { /* ... */ };
const QC_STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "zinc"> = { /* ... */ };
const qcTone = (s?: string) => s ? (QC_STATUS_TONE[s] || "amber") : "zinc";
const prettyStatus = (s?: string) => s ? (QC_STATUS_TEXT[s] || s) : "SIN ESTADO";

// ============================================================================
// COMPONENTES DE UI Y HELPERS
// ============================================================================

// Badge (sin cambios)
function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) { /* ... */ }

// MEJORA 1: Tipo unificado para eventos del timeline
type TraceEvent = {
  id: string; at: string; kind: string; title: string;
  details?: string; icon: React.ReactNode; tone: "zinc" | "sky" | "amber" | "rose" | "emerald";
};

// MEJORA 1: Lógica para normalizar y crear el historial del lote
function normalizeLotHistory(lot: Lot, data: {
  qcTests: QcTest[], qcBatchResults: QcBatchResult[], incidents: Incident[],
  stockMoves: StockMove[], protocolAcks: ProtocolAcknowledgement[], orders: ProductionOrder[]
}): TraceEvent[] {
  const events: TraceEvent[] = [];
  const lotNumber = lot.lotNumber;
  const orderId = lot.producedByOrderId;

  // Entradas de stock
  data.stockMoves.filter(m => m.lotNumber === lotNumber && m.reason === 'receipt').forEach(m => {
    events.push({
      id: `sm-${m.id}`, at: m.occurredAt, kind: 'RECEIPT', title: `Lote recibido en almacén`,
      details: `Cantidad: ${m.qty} ${m.uom}. Ubicación: ${m.toLocationId}`,
      icon: <Package size={14} />, tone: 'sky'
    });
  });

  // Tests analíticos realizados
  data.qcTests.filter(t => t.lotNumber === lotNumber).forEach(t => {
    const value = t.valueNumeric != null ? t.valueNumeric.toFixed(2) : t.valueText ?? (t.valueBool ? 'OK' : 'KO');
    events.push({
      id: `qct-${t.id}`, at: t.testedAt, kind: 'QC_TEST', title: `Análisis: ${t.parameterId}`,
      details: `Resultado: ${value}. ${t.inSpec ? 'Dentro de spec.' : 'Fuera de spec.'}`,
      icon: <FlaskConical size={14} />, tone: t.inSpec ? 'emerald' : 'rose'
    });
  });

  // Decisiones de calidad
  data.qcBatchResults.filter(r => r.lotNumber === lotNumber).forEach(r => {
    events.push({
      id: `qcb-${r.id}`, at: r.reviewedAt!, kind: 'QC_DECISION', title: `Decisión: ${prettyStatus(r.status)}`,
      details: `Revisado por ${r.reviewedById}. ${r.remarks ? `"${r.remarks}"` : ''}`,
      icon: <FileCheck2 size={14} />, tone: qcTone(r.status)
    });
  });

  // Incidentes
  data.incidents.filter(i => i.lotNumber === lotNumber).forEach(i => {
    events.push({
      id: `inc-${i.id}`, at: i.at, kind: 'INCIDENT', title: `Incidente: ${i.summary}`,
      details: `Severidad: ${i.severity ?? 'N/A'}. Estado: ${i.status}`,
      icon: <AlertTriangle size={14} />, tone: 'amber'
    });
  });
  
  // Protocolos
  if (orderId) {
    data.protocolAcks.filter(p => p.orderId === orderId).forEach(p => {
        events.push({
            id: `pa-${p.id}`, at: p.at, kind: 'PROTOCOL', title: `Protocolo Confirmado`,
            details: `Confirmado por ${p.acknowledgedByUserId} para la orden ${orderId}`,
            icon: <ClipboardCheck size={14} />, tone: 'emerald'
        })
    })
  }
  
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ============================================================================
// COMPONENTE PRINCIPAL: LabReleasePage
// ============================================================================
export default function LabReleasePage() {
  const { data } = useData();

  // Extracción de datos completa del SSOT
  const lots: Lot[] = data?.lots ?? []; const items: Item[] = data?.items ?? [];
  const qcTests: QcTest[] = data?.qcTests ?? []; const qcBatchResults: QcBatchResult[] = data?.qcBatchResults ?? [];
  const qcParameters: ParameterCatalog[] = data?.qcParameters ?? []; const qcPlans: QcPlan[] = data?.qc_plans ?? [];
  const incidents: Incident[] = data?.incidents ?? []; const stockMoves: StockMove[] = data?.stockMoves ?? [];
  const protocolAcks: ProtocolAcknowledgement[] = data?.protocolAcks ?? []; const orders: ProductionOrder[] = data?.productionOrders ?? [];
  
  const [query, setQuery] = useState("");
  const [filterItem, setFilterItem] = useState<string>("");
  // MEJORA 2: El tab por defecto es el de lotes sin estado
  const [activeTab, setActiveTab] = useState<BucketKey>("UNDEFINED");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const parameterMap = useMemo(() => new Map(qcParameters.map(p => [p.id, p])), [qcParameters]);
  const qcPlanMap = useMemo(() => new Map(qcPlans.map(p => [p.id, p])), [qcPlans]);

  // MEJORA 2: Lógica de bucketing actualizada para manejar lotes sin estado
  const buckets = useMemo(() => {
    const hold: Lot[] = []; const released: Lot[] = []; const rejected: Lot[] = []; const undefinedState: Lot[] = [];
    const lowerQuery = query.trim().toLowerCase();
    for (const l of lots) {
      const item = itemMap.get(l.itemId);
      const matchesQuery = !lowerQuery || l.lotNumber.toLowerCase().includes(lowerQuery) || (item?.name || '').toLowerCase().includes(lowerQuery);
      const matchesItem = !filterItem || l.itemId === filterItem;
      if (!matchesQuery || !matchesItem) continue;

      const status = l.qcStatus;
      if (status === "RELEASED") released.push(l);
      else if (status === "REJECTED") rejected.push(l);
      else if (status === "PENDING" || status === "IN_PROGRESS" || status === "CONDITIONAL_RELEASE" || status === "WAIVED") hold.push(l);
      else undefinedState.push(l); // Lotes con qcStatus null, undefined, o no reconocido
    }
    const byDateDesc = (a: Lot, b: Lot) => new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();
    return { HOLD: hold.sort(byDateDesc), RELEASED: released.sort(byDateDesc), REJECTED: rejected.sort(byDateDesc), UNDEFINED: undefinedState.sort(byDateDesc) };
  }, [lots, itemMap, query, filterItem]);

  const visibleLots = buckets[activeTab];

  useEffect(() => {
    const currentLotIsVisible = visibleLots.some(l => l.lotNumber === selectedLot);
    if (!currentLotIsVisible) setSelectedLot(visibleLots[0]?.lotNumber ?? null);
  }, [visibleLots, selectedLot]);

  const selectedLotData = useMemo(() => {
    if (!selectedLot) return null;
    const lot = lots.find((l) => l.lotNumber === selectedLot);
    if (!lot) return null;
    const plan = lot.qcPlanId ? qcPlanMap.get(lot.qcPlanId) : undefined;
    const history = normalizeLotHistory(lot, { qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders });
    return { lot, item: itemMap.get(lot.itemId), plan, history };
  }, [selectedLot, lots, itemMap, qcPlans, qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders]);

  // MEJORA 3: Estado y lógica para el módulo de análisis interactivo
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [reviewer, setReviewer] = useState("default.user"); // Simulación de usuario logueado

  // Resetea los inputs cuando cambia el lote
  useEffect(() => {
    setAnalysisResults({});
  }, [selectedLot]);

  const handleAnalysisChange = (parameterId: string, value: string) => {
    setAnalysisResults(prev => ({ ...prev, [parameterId]: value }));
  };

  const handleSaveDecision = (decision: "RELEASED" | "REJECTED") => {
    if (!selectedLotData || !selectedLotData.plan) return;
    // Simulación de una mutación a la base de datos
    console.log({
      action: "SAVE_QC_DECISION",
      lotNumber: selectedLotData.lot.lotNumber,
      decision,
      reviewer,
      results: analysisResults,
      timestamp: new Date().toISOString()
    });
    alert(`Decisión '${decision}' guardada para el lote ${selectedLotData.lot.lotNumber} por ${reviewer}.`);
    setAnalysisResults({});
    // Aquí se debería re-validar la data de `useData` para refrescar la UI.
  };

  const requiredSpecs = selectedLotData?.plan?.specs.filter(s => s.required) ?? [];
  const allRequiredResultsEntered = requiredSpecs.every(spec =>
    analysisResults[spec.parameterId] && analysisResults[spec.parameterId].trim() !== ""
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna 1: Filtros y Tabs */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
         {/* ... inputs de búsqueda y filtro sin cambios ... */}
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
          {/* ... lista de lotes sin cambios ... */}
      </div>

      {/* Columna 3: Dossier de Lote Interactivo */}
      <div className="lg:col-span-5 h-full overflow-y-auto space-y-4">
        {selectedLotData ? (
        <>
          {/* MEJORA 3: Módulo Interactivo de Análisis y Decisión */}
          <SBCard title={<><FlaskConical size={16}/><span>Análisis y Decisión de Calidad</span></>} accent="hsl(var(--sb-sun-strong))">
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
                      inSpec = (numValue >= (spec.targetRange.min ?? -Infinity)) && (numValue <= (spec.targetRange.max ?? Infinity));
                    }
                    return (
                    <div key={spec.parameterId} className="grid grid-cols-[1fr,120px,80px] gap-2 items-center text-xs">
                        <label htmlFor={spec.parameterId} className="font-medium truncate">{parameterMap.get(spec.parameterId)?.label ?? spec.parameterId}</label>
                        <input
                          id={spec.parameterId} type="number" step="0.01"
                          placeholder={`${spec.targetRange.min ?? '...'} - ${spec.targetRange.max ?? '...'}`}
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
                    <div className="grid grid-cols-2 gap-2">
                        <SBButton onClick={() => handleSaveDecision('RELEASED')} disabled={!allRequiredResultsEntered}>
                            <CheckCircle2 size={16}/> Aprobar Lote
                        </SBButton>
                         <SBButton variant="destructive" onClick={() => handleSaveDecision('REJECTED')} disabled={!allRequiredResultsEntered}>
                            <XCircle size={16}/> Rechazar Lote
                        </SBButton>
                    </div>
                </div>
              )}
            </div>
          </SBCard>

          {/* MEJORA 1: Timeline / Historial del Lote */}
          <SBCard title={<><ListOrdered size={16}/><span>Historial del Lote</span></>}>
            <div className="p-4">
              {selectedLotData.history.length === 0 ? <p className="text-sm text-zinc-500 text-center">No hay eventos registrados para este lote.</p>
              : (
                <ul className="space-y-4">
                  {selectedLotData.history.map(ev => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(var(--sb-${ev.tone}-soft))`}}>
                        {React.cloneElement(ev.icon, { className: 'h-4 w-4', style: { color: `hsl(var(--sb-${ev.tone}-strong))` }})}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{ev.title}</p>
                        <p className="text-xs text-zinc-600">{ev.details}</p>
                        <time className="text-xs text-zinc-400">{new Date(ev.at).toLocaleString('es-ES')}</time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SBCard>

        </>
        ) : ( <div className="h-full flex items-center justify-center text-zinc-500 border-2 border-dashed rounded-xl">Selecciona un lote para ver su dossier.</div> )}
      </div>
    </div>
  );
}