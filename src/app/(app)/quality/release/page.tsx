
// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard, SBButton, Select } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle2, XCircle, Hourglass, Search, FlaskConical, Filter, ChevronDown, GitBranch,
  FileQuestion, Package, AlertTriangle, ClipboardCheck, User, Save, FilePlus2, ListOrdered, FileCheck2
} from "lucide-react";
import type {
  Lot, QcTest, QcBatchResult, Item, ParameterCatalog, QcPlan, Incident, Coa,
  QcTestSpec, ProductionOrder, LotGenealogyEdge, StockMove, ProtocolAcknowledgement, QcStatus
} from "@/domain/ssot";


// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type BucketKey = "HOLD" | "RELEASED" | "REJECTED" | "UNDEFINED";

const TABS_CONFIG = [
  { id: "UNDEFINED" as BucketKey, label: "Sin Estado", icon: FileQuestion },
  { id: "HOLD" as BucketKey, label: "En Hold", icon: Hourglass },
  { id: "RELEASED" as BucketKey, label: "Liberados", icon: CheckCircle2 },
  { id: "REJECTED" as BucketKey, label: "Rechazados", icon: XCircle },
];

const QC_STATUS_TEXT: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  CONDITIONAL_RELEASE: "Liberado Condicional",
  RELEASED: "Liberado",
  REJECTED: "Rechazado",
  WAIVED: "Eximido"
};

const QC_STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "zinc"> = {
  RELEASED: "emerald",
  PENDING: "amber",
  IN_PROGRESS: "amber",
  CONDITIONAL_RELEASE: "amber",
  WAIVED: "amber",
  REJECTED: "rose",
};
const qcTone = (s?: string): "emerald" | "amber" | "rose" | "zinc" => (s ? (QC_STATUS_TONE[s] || "amber") : "zinc");
const prettyStatus = (s?: string) => s ? (QC_STATUS_TEXT[s] || s) : "SIN ESTADO";

// ============================================================================
// COMPONENTES DE UI Y HELPERS
// ============================================================================

function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) {
  const toneClasses = {
    zinc: 'bg-zinc-100 text-zinc-800',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    emerald: 'bg-green-100 text-green-800',
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${toneClasses[tone]}`}>{children}</span>;
}

type TraceEvent = {
  id: string; at: string; kind: string; title: string;
  details?: string; icon: React.ReactNode; tone: "zinc" | "sky" | "amber" | "rose" | "emerald";
};

function normalizeLotHistory(lot: Lot, data: {
  qcTests: QcTest[], qcBatchResults: QcBatchResult[], incidents: Incident[],
  stockMoves: StockMove[], protocolAcks: ProtocolAcknowledgement[], orders: ProductionOrder[]
}): TraceEvent[] {
  const events: TraceEvent[] = [];
  const lotNumber = lot.lotNumber;
  const orderId = lot.producedByOrderId;

  data.stockMoves.filter(m => m.lotNumber === lotNumber && m.reason === 'receipt').forEach(m => {
    events.push({
      id: `sm-${m.id}`, at: m.occurredAt, kind: 'RECEIPT', title: `Lote recibido en almacén`,
      details: `Cantidad: ${m.qty} ${m.uom}. Ubicación: ${m.toLocation ?? ''}`,
      icon: <Package size={14} />, tone: 'sky'
    });
  });

  data.qcTests.filter(t => t.lotNumber === lotNumber).forEach(t => {
    const value = t.valueNumeric != null ? t.valueNumeric.toFixed(2) : t.valueText ?? (t.valueBool ? 'OK' : 'KO');
    events.push({
      id: `qct-${t.id}`, at: t.testedAt, kind: 'QC_TEST', title: `Análisis: ${t.parameterId}`,
      details: `Resultado: ${value}. ${t.inSpec ? 'Dentro de spec.' : 'Fuera de spec.'}`,
      icon: <FlaskConical size={14} />, tone: t.inSpec ? 'emerald' : 'rose'
    });
  });

  data.qcBatchResults.filter(r => r.lotNumber === lotNumber).forEach(r => {
    events.push({
      id: `qcb-${r.id}`, at: r.reviewedAt!, kind: 'QC_DECISION', title: `Decisión: ${prettyStatus(r.status)}`,
      details: `Revisado por ${r.reviewedById}. ${r.remarks ? `"${r.remarks}"` : ''}`,
      icon: <FileCheck2 size={14} />, tone: qcTone(r.status)
    });
  });

  data.incidents.filter(i => i.lotNumber === lotNumber).forEach(i => {
    events.push({
      id: `inc-${i.id}`, at: i.at, kind: 'INCIDENT', title: `Incidente: ${i.summary}`,
      details: `Severidad: ${i.severity ?? 'N/A'}. Estado: ${i.status}`,
      icon: <AlertTriangle size={14} />, tone: 'amber'
    });
  });
  
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

  const lots: Lot[] = data?.lots ?? []; const items: Item[] = data?.items ?? [];
  const qcTests: QcTest[] = data?.qcTests ?? []; const qcBatchResults: QcBatchResult[] = data?.qcBatchResults ?? [];
  const qcParameters: ParameterCatalog[] = data?.qcParameters ?? []; const qcPlans: QcPlan[] = data?.qc_plans ?? [];
  const incidents: Incident[] = data?.incidents ?? []; const stockMoves: StockMove[] = data?.stockMoves ?? [];
  const protocolAcks: ProtocolAcknowledgement[] = data?.protocolAcks ?? []; const orders: ProductionOrder[] = data?.productionOrders ?? [];
  
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [activeTab, setActiveTab] = useState<BucketKey>("UNDEFINED");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const parameterMap = useMemo(() => new Map(qcParameters.map(p => [p.id, p])), [qcParameters]);
  const qcPlanMap = useMemo(() => new Map(qcPlans.map(p => [p.id, p])), [qcPlans]);

  const lotsBySku = useMemo(() => {
    const map = new Map<string, Lot[]>();
    for (const lot of lots) {
        if (!map.has(lot.itemId)) {
            map.set(lot.itemId, []);
        }
        map.get(lot.itemId)!.push(lot);
    }
    return map;
  }, [lots]);

  const buckets = useMemo(() => {
    const hold: Lot[] = []; const released: Lot[] = []; const rejected: Lot[] = []; const undefinedState: Lot[] = [];
    const lowerQuery = query.trim().toLowerCase();

    const lotsToFilter = selectedSku ? lotsBySku.get(selectedSku) || [] : lots;

    for (const l of lotsToFilter) {
      const item = itemMap.get(l.itemId);
      const matchesQuery = !lowerQuery || l.lotNumber.toLowerCase().includes(lowerQuery) || (item?.name || '').toLowerCase().includes(lowerQuery);
      
      if (!matchesQuery) continue;

      const status = l.qcStatus;
      if (status === "RELEASED") released.push(l);
      else if (status === "REJECTED") rejected.push(l);
      else if (status === "PENDING" || status === "IN_PROGRESS" || status === "CONDITIONAL_RELEASE" || status === "WAIVED") hold.push(l);
      else undefinedState.push(l);
    }
    const byDateDesc = (a: Lot, b: Lot) => new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();
    return { HOLD: hold.sort(byDateDesc), RELEASED: released.sort(byDateDesc), REJECTED: rejected.sort(byDateDesc), UNDEFINED: undefinedState.sort(byDateDesc) };
  }, [lots, itemMap, query, selectedSku, lotsBySku]);

  const visibleLots = buckets[activeTab];

  useEffect(() => {
    const currentLotIsVisible = visibleLots.some(l => l.lotNumber === selectedLot);
    if (!currentLotIsVisible) setSelectedLot(visibleLots[0]?.lotNumber ?? null);
  }, [visibleLots, selectedLot]);
  
  const handleSkuChange = (skuId: string) => {
    setSelectedSku(skuId);
    setQuery(''); // Reset manual search
    setSelectedLot(null); // Reset lot selection
  };

  const handleLotChange = (lotNumber: string) => {
    setSelectedLot(lotNumber);
    setQuery(lotNumber); // Set query to focus on the selected lot
  };

  const selectedLotData = useMemo(() => {
    if (!selectedLot) return null;
    const lot = lots.find((l) => l.lotNumber === selectedLot);
    if (!lot) return null;
    const plan = lot.qcPlanId ? qcPlanMap.get(lot.qcPlanId) : undefined;
    const history = normalizeLotHistory(lot, { qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders });
    return { lot, item: itemMap.get(lot.itemId), plan, history };
  }, [selectedLot, lots, itemMap, qcPlans, qcTests, qcBatchResults, incidents, stockMoves, protocolAcks, orders, qcPlanMap]);

  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [reviewer, setReviewer] = useState("default.user");

  useEffect(() => { setAnalysisResults({}); }, [selectedLot]);

  const handleAnalysisChange = (parameterId: string, value: string) => setAnalysisResults(prev => ({ ...prev, [parameterId]: value }));
  
  const handleSaveDecision = (decision: "RELEASED" | "REJECTED") => {
    if (!selectedLotData || !selectedLotData.plan) return;
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
  };

  const requiredSpecs = selectedLotData?.plan?.specs.filter(s => s.required) ?? [];
  const allRequiredResultsEntered = requiredSpecs.every(spec =>
    analysisResults[spec.parameterId] && analysisResults[spec.parameterId].trim() !== ""
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna 1: Filtros y Tabs */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        <div className="flex items-center gap-2">
            <Select value={selectedSku} onChange={(e) => handleSkuChange(e.target.value)} className="flex-grow">
                <option value="">Todos los SKUs</option>
                {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                ))}
            </Select>
             <Select value={selectedLot || ''} onChange={(e) => handleLotChange(e.target.value)} disabled={!selectedSku}>
                <option value="">Todos los lotes</option>
                {(lotsBySku.get(selectedSku) || []).map(lot => (
                    <option key={lot.lotNumber} value={lot.lotNumber}>{lot.lotNumber}</option>
                ))}
            </Select>
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
                return (
                    <button key={lot.id} onClick={() => setSelectedLot(lot.lotNumber)} className={`w-full text-left p-3 ${isSelected ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-semibold text-zinc-800">{lot.lotNumber}</span>
                            <Badge tone={qcTone(lot.qcStatus)}>{prettyStatus(lot.qcStatus)}</Badge>
                        </div>
                        <p className="text-xs text-zinc-600">{item?.name ?? lot.itemId}</p>
                        <p className="text-xs text-zinc-400 mt-1">{new Date(lot.receivedAt ?? lot.createdAt ?? 0).toLocaleDateString()}</p>
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
                         <Select id="reviewer" value={reviewer} onChange={e => setReviewer(e.target.value)} className="w-full border rounded-md p-1 h-7 bg-white">
                           <option value="default.user">Usuario por Defecto</option>
                           <option value="qc.manager">Manager de Calidad</option>
                           <option value="lab.tech">Técnico de Lab</option>
                         </Select>
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
