// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle2, XCircle, Hourglass, Search, FlaskConical, FileCheck2, Filter, MoveRight, ChevronDown,
  AlertTriangle, GitBranch, FileText, Link2, Factory, User, Calendar, FilePlus2,
} from "lucide-react";
import type {
  Lot, QcTest, QcBatchResult, Item, ParameterCatalog, QcPlan, Incident, LotGenealogyEdge, Coa
} from "@/domain/ssot";

// ===== Tipos y Constantes (Sin cambios) =====
type BucketKey = "HOLD" | "RELEASED" | "REJECTED";

const TABS_CONFIG = [
  { id: "HOLD" as BucketKey, label: "En Hold", icon: Hourglass },
  { id: "RELEASED" as BucketKey, label: "Liberados", icon: CheckCircle2 },
  { id: "REJECTED" as BucketKey, label: "Rechazados", icon: XCircle },
];

const QC_STATUS_TEXT: Record<string, string> = {
  PENDING: "Pendiente", IN_PROGRESS: "En curso", WAIVED: "Exento",
  CONDITIONAL_RELEASE: "Liberación condicional", RELEASED: "Liberado", REJECTED: "Rechazado",
};
const QC_STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "zinc"> = {
  RELEASED: "emerald", CONDITIONAL_RELEASE: "amber", WAIVED: "amber",
  IN_PROGRESS: "amber", PENDING: "amber", REJECTED: "rose",
};
const qcTone = (s?: string) => s ? (QC_STATUS_TONE[s] || "amber") : "amber";
const prettyStatus = (s?: string) => s ? (QC_STATUS_TEXT[s] || s) : "PENDIENTE";

// ===== Componentes de UI Helpers (Sin cambios) =====
function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald" }) {
  const color = {
    zinc: "border-zinc-200 bg-white text-zinc-700", sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700", rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border font-medium ${color}`}>{children}</span>;
}

// ===== NUEVO: Modal para creación de Incidentes =====
function IncidentCreationModal({ lotNumber, onClose, onSubmit }: { lotNumber: string, onClose: () => void, onSubmit: (details: { summary: string, severity: string }) => void }) {
  const [summary, setSummary] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    onSubmit({ summary, severity });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2"><FilePlus2 size={16}/> Registrar Incidente para Lote: {lotNumber}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="summary" className="block text-xs font-medium text-zinc-600 mb-1">Resumen del problema</label>
              <textarea
                id="summary"
                rows={3}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Ej: Parámetro de acidez fuera de especificación."
                value={summary}
                onChange={e => setSummary(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="severity" className="block text-xs font-medium text-zinc-600 mb-1">Severidad</label>
              <select id="severity" value={severity} onChange={e => setSeverity(e.target.value)} className="w-full border rounded-md p-2 text-sm bg-white">
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>
          <div className="p-4 bg-zinc-50 rounded-b-xl flex justify-end gap-2">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit">Crear Incidente</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}


// ===== Componente Principal =====
export default function LabReleasePage() {
  const { data } = useData();

  // === Extracción de datos del SSOT (ampliada) ===
  const lots: Lot[] = data?.lots ?? [];
  const items: Item[] = data?.items ?? [];
  const qcTests: QcTest[] = data?.qcTests ?? [];
  const qcBatchResults: QcBatchResult[] = data?.qcBatchResults ?? [];
  const qcParameters: ParameterCatalog[] = data?.qcParameters ?? [];
  // NUEVOS DATOS para funcionalidades extendidas
  const qcPlans: QcPlan[] = (data as any)?.qc_plans ?? [];
  const incidents: Incident[] = data?.incidents ?? [];
  const lotGenealogy: LotGenealogyEdge[] = data?.lotGenealogy ?? [];
  const coas: Coa[] = (data as any)?.coas ?? [];


  // === Estado local (añadido estado para el modal) ===
  const [query, setQuery] = useState("");
  const [filterItem, setFilterItem] = useState<string>("");
  const [activeTab, setActiveTab] = useState<BucketKey>("HOLD");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);

  // === Memoización de datos para optimizar (ampliada) ===
  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const parameterMap = useMemo(() => new Map(qcParameters.map(p => [p.id, p])), [qcParameters]);
  const qcPlanMap = useMemo(() => new Map(qcPlans.map(p => [p.id, p])), [qcPlans]);

  // Lógica de filtrado y bucketing (sin cambios)
  const buckets = useMemo(() => { /* ...lógica sin cambios... */
    const hold: Lot[] = []; const released: Lot[] = []; const rejected: Lot[] = [];
    const lowerQuery = query.trim().toLowerCase();
    for (const l of lots) {
      const item = itemMap.get(l.itemId);
      const matchesQuery = !lowerQuery || l.lotNumber.toLowerCase().includes(lowerQuery) || (item?.name || '').toLowerCase().includes(lowerQuery) || (item?.sku || '').toLowerCase().includes(lowerQuery);
      const matchesItem = !filterItem || l.itemId === filterItem;
      if (!matchesQuery || !matchesItem) continue;
      if (l.qcStatus === "RELEASED") released.push(l); else if (l.qcStatus === "REJECTED") rejected.push(l); else hold.push(l);
    }
    const byDateDesc = (a: Lot, b: Lot) => new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.createdAt ?? 0).getTime();
    return { HOLD: hold.sort(byDateDesc), RELEASED: released.sort(byDateDesc), REJECTED: rejected.sort(byDateDesc) };
  }, [lots, itemMap, query, filterItem]);

  const visibleLots = buckets[activeTab];

  // Efecto para auto-seleccionar lote (sin cambios)
  useEffect(() => {
    const currentLotIsVisible = visibleLots.some(l => l.lotNumber === selectedLot);
    if (!currentLotIsVisible) setSelectedLot(visibleLots[0]?.lotNumber ?? null);
  }, [visibleLots, selectedLot]);

  // === SELECCIÓN DE DATOS ENRIQUECIDA para el panel de detalle ===
  const selectedLotData = useMemo(() => {
    if (!selectedLot) return null;
    const lot = lots.find((l) => l.lotNumber === selectedLot);
    if (!lot) return null;

    const plan = lot.qcPlanId ? qcPlanMap.get(lot.qcPlanId) : undefined;
    
    return {
        lot,
        item: itemMap.get(lot.itemId),
        plan,
        tests: qcTests.filter((t) => t.lotNumber === selectedLot).sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()),
        decisions: qcBatchResults.filter((r) => r.lotNumber === selectedLot).sort((a, b) => new Date(r.reviewedAt ?? 0).getTime() - new Date(a.reviewedAt ?? 0).getTime()),
        incidents: incidents.filter(i => i.lotNumber === selectedLot),
        coa: coas.find(c => c.lotNumber === selectedLot),
        genealogy: {
            parents: lotGenealogy.filter(e => e.childLot === selectedLot).map(e => e.parentLot),
            children: lotGenealogy.filter(e => e.parentLot === selectedLot).map(e => e.childLot),
        }
    };
  }, [selectedLot, lots, itemMap, qcTests, qcBatchResults, incidents, qcPlanMap, lotGenealogy, coas]);

  const handleSelectLot = useCallback((lotNumber: string) => setSelectedLot(lotNumber), []);
  
  // === Lógica de acciones de calidad (ampliada) ===
  const handleQcAction = useCallback((action: 'release' | 'conditional' | 'reject') => {
      if (!selectedLot) return;
      if (action === 'reject') {
          setIncidentModalOpen(true);
      } else {
          // Aquí iría la lógica de mutación para liberar/condicional
          console.log(`Acción: ${action} sobre el lote ${selectedLot}`);
          alert(`Lote ${selectedLot} marcado para '${action}'.`);
      }
  }, [selectedLot]);

  const handleCreateIncident = useCallback((details: { summary: string, severity: string }) => {
    // En una app real, aquí llamarías a una mutación para crear el incidente en la DB.
    console.log("Creando incidente para lote:", selectedLot, "Detalles:", details);
    alert(`Incidente creado para ${selectedLot}. Lote rechazado.`);
    setIncidentModalOpen(false);
    // Aquí también se ejecutaría la mutación para cambiar el estado del lote a 'REJECTED'.
  }, [selectedLot]);


  return (
    <>
      {isIncidentModalOpen && selectedLot && (
        <IncidentCreationModal lotNumber={selectedLot} onClose={() => setIncidentModalOpen(false)} onSubmit={handleCreateIncident} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Columna 1: Filtros y Tabs (sin cambios) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input className="w-full h-10 pl-9 pr-3 border rounded-lg" placeholder="Buscar lote, ítem, SKU…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <select className="w-full h-10 pl-9 pr-8 border rounded-lg appearance-none bg-white" value={filterItem} onChange={e => setFilterItem(e.target.value)}>
                    <option value="">Todos los ítems</option>
                    {useMemo(() => Array.from(new Set(lots.map(l => l.itemId))).map(id => ({ id, name: itemMap.get(id)?.name ?? id })), [lots, itemMap])
                    .map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
            <div className="space-y-1">
                {TABS_CONFIG.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                        <div className="flex items-center gap-2"><tab.icon size={16}/> {tab.label}</div>
                        <span>{buckets[tab.id].length}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Columna 2: Lista de Lotes (sin cambios) */}
        <div className="lg:col-span-4 h-full overflow-y-auto border rounded-xl bg-white">
            {visibleLots.length === 0 ? <div className="p-6 text-center text-sm text-zinc-500">No hay lotes que coincidan.</div>
            : <ul className="divide-y">{visibleLots.map(l => {
                    const it = itemMap.get(l.itemId); const isSelected = selectedLot === l.lotNumber;
                    return <li key={l.lotNumber}><button onClick={() => handleSelectLot(l.lotNumber)} className={`w-full text-left p-3 ${isSelected ? 'bg-sky-50' : 'hover:bg-zinc-50'}`}>
                        <div className="flex justify-between items-start"><div className="min-w-0"><p className="font-semibold font-mono text-sm">{l.lotNumber}</p><p className="text-xs text-zinc-600 truncate">{it?.name ?? l.itemId}</p></div>
                        <div className="text-right"><p className="font-semibold text-sm">{l.quantity} <span className="text-xs text-zinc-500">{it?.uom}</span></p><p className="text-xs text-zinc-500">{l.locationId}</p></div></div></button></li>;
                })}</ul>}
        </div>

        {/* Columna 3: Panel de Detalle (REESTRUCTURADO Y ENRIQUECIDO) */}
        <div className="lg:col-span-5 h-full overflow-y-auto space-y-4">
          {selectedLotData ? (
          <>
              {/* === CARD: DETALLE DEL LOTE (Enriquecido) === */}
              <SBCard title={<><FlaskConical size={16}/><span>Detalle del lote</span></>}>
                  <div className="p-4 space-y-2 text-sm">
                      <p className="text-lg font-bold font-mono">{selectedLotData.lot.lotNumber}</p>
                      <p><b>Ítem:</b> {selectedLotData.item?.name} ({selectedLotData.item?.sku})</p>
                      <p><b>Cantidad:</b> {selectedLotData.lot.quantity} {selectedLotData.item?.uom}</p>
                      {selectedLotData.lot.expDate && <p><b>Caducidad:</b> {new Date(selectedLotData.lot.expDate).toLocaleDateString('es-ES')}</p>}
                      <p><b>Ubicación:</b> {selectedLotData.lot.locationId || 'N/A'}</p>
                      <p><b>Estado QC:</b> <Badge tone={qcTone(selectedLotData.lot.qcStatus)}>{prettyStatus(selectedLotData.lot.qcStatus)}</Badge></p>
                      {selectedLotData.plan && <p className="text-xs text-zinc-500 pt-1 border-t mt-2"><b>Plan de Calidad Aplicado:</b> {selectedLotData.plan.name}</p>}
                  </div>
              </SBCard>
              
              {/* === CARD: RESULTADOS ANALÍTICOS (Enriquecido con Specs) === */}
              <SBCard title={<><FileCheck2 size={16}/><span>Resultados Analíticos</span></>}>
                <div className="p-4 space-y-2">
                  {selectedLotData.tests.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">Sin tests registrados.</p>
                  : selectedLotData.tests.map(t => {
                    const spec = selectedLotData.plan?.specs.find(s => s.parameterId === t.parameterId);
                    return (
                    <div key={t.id} className="text-xs p-2 border rounded-md grid grid-cols-[1fr,auto,auto] gap-2 items-center">
                      <div>
                        <div className="font-medium truncate">{parameterMap.get(t.parameterId)?.label || t.parameterId}</div>
                        {spec && <div className="text-zinc-500">Spec: {spec.targetRange.min ?? '...'} - {spec.targetRange.max ?? '...'}</div>}
                      </div>
                      <div className="text-center font-mono">
                        {t.valueNumeric != null ? t.valueNumeric.toFixed(2) : t.valueText ?? (t.valueBool ? 'OK' : 'KO')}
                      </div>
                      <div className="text-right"><Badge tone={t.inSpec ? 'emerald' : 'rose'}>{t.inSpec ? 'EN SPEC' : 'FUERA'}</Badge></div>
                    </div>);
                  })}
                </div>
              </SBCard>

              {/* === CARD: GENEALOGÍA (Nuevo) === */}
              {(selectedLotData.genealogy.parents.length > 0 || selectedLotData.genealogy.children.length > 0) && (
                  <SBCard title={<><GitBranch size={16}/><span>Genealogía del Lote</span></>}>
                    <div className="p-4 space-y-3 text-sm">
                      {selectedLotData.genealogy.parents.length > 0 && <div>
                          <h4 className="text-xs font-semibold text-zinc-600 mb-1">UPSTREAM (Lotes Padre)</h4>
                          {selectedLotData.genealogy.parents.map(p => <SBButton key={p} size="sm" variant="secondary" onClick={() => handleSelectLot(p)}><Link2 size={12}/>{p}</SBButton>)}
                      </div>}
                      {selectedLotData.genealogy.children.length > 0 && <div>
                          <h4 className="text-xs font-semibold text-zinc-600 mb-1">DOWNSTREAM (Lotes Hijo)</h4>
                          {selectedLotData.genealogy.children.map(c => <SBButton key={c} size="sm" variant="secondary" onClick={() => handleSelectLot(c)}><Link2 size={12}/>{c}</SBButton>)}
                      </div>}
                    </div>
                  </SBCard>
              )}

              {/* === CARD: INCIDENTES (Nuevo) === */}
              {selectedLotData.incidents.length > 0 && (
                <SBCard title={<><AlertTriangle size={16}/><span>Incidentes y No Conformidades</span></>}>
                  <div className="p-4 space-y-2">
                    {selectedLotData.incidents.map(inc => (
                      <div key={inc.id} className="text-xs p-2 border border-amber-200 bg-amber-50 rounded-md">
                        <div className="flex justify-between items-center font-semibold text-amber-800">
                          <span>{inc.summary}</span>
                          <Badge tone="amber">{inc.status}</Badge>
                        </div>
                        <div className="text-amber-700 text-[11px] mt-1">
                          Abierta el {new Date(inc.at).toLocaleDateString('es-ES')} · Severidad: {inc.severity ?? 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </SBCard>
              )}
              
              {/* === CARD: ACCIONES (Actualizado con CoA e Incidente) === */}
              <SBCard title="Acción de Liberación">
                  <div className="p-4 grid grid-cols-2 md:grid-cols-2 gap-2">
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <SBButton variant="secondary" onClick={() => handleQcAction('release')} className="border-green-600 text-green-700 hover:bg-green-50"><CheckCircle2 size={16}/> Liberar</SBButton>
                          <SBButton variant="secondary" onClick={() => handleQcAction('conditional')} className="border-amber-600 text-amber-700 hover:bg-amber-50"><MoveRight size={16}/> Condicional</SBButton>
                          <SBButton variant="secondary" onClick={() => handleQcAction('reject')} className="border-red-600 text-red-700 hover:bg-red-50"><XCircle size={16}/> Rechazar</SBButton>
                      </div>
                      {selectedLotData.lot.qcStatus === 'RELEASED' && (
                          <a href={selectedLotData.coa?.pdfUrl || '#'} target="_blank" rel="noopener noreferrer"
                             className={`col-span-2 md:col-span-2 ${!selectedLotData.coa ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <SBButton variant="secondary" className="w-full" disabled={!selectedLotData.coa}>
                                  <FileText size={16}/> {selectedLotData.coa ? 'Ver Certificado (CoA)' : 'CoA no disponible'}
                              </SBButton>
                          </a>
                      )}
                  </div>
              </SBCard>
          </>
          ) : ( <div className="h-full flex items-center justify-center text-zinc-500 border-2 border-dashed rounded-xl">Selecciona un lote para ver los detalles</div> )}
        </div>
      </div>
    </>
  );
}
