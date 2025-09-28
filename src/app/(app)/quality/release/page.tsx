
// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { SBCard, SBButton, Select, Input } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import {
  CheckCircle, XCircle, Hourglass, FlaskConical, ListOrdered, FileQuestion
} from "lucide-react";
import type { Lot, QcTest, QcBatchResult, Item, ParameterCatalog, QcPlan, StockMove, QcStatus, OnHandView } from "@/domain/ssot";
import { qcToBucket } from "@/domain/ssot";
import { saveQcDecision } from './actions';
import { toast } from 'sonner';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================
type BucketKey = "ALL" | "HOLD" | "RELEASED" | "REJECTED";
type LotDetail = Lot & {
    itemName: string;
    itemSku?: string;
    totalStock: number;
    bucket: BucketKey;
};

// ... (Constantes como TABS_CONFIG, QC_STATUS_TEXT, QC_STATUS_TONE se mantienen igual)
// ... (Componente `Badge` se mantiene igual)

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function LabReleasePage() {
  const router = useRouter();
  const { data } = useData();
  const [isPending, startTransition] = useTransition();

  // ============================================================================
  // 1. GESTIÓN DE DATOS Y ESTADO
  // ============================================================================
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [activeTab, setActiveTab] = useState<BucketKey>("ALL");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  
  // Estado para el formulario de análisis
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [reviewerId, setReviewerId] = useState("mj@santabrisa.co"); // Debería venir del usuario autenticado

  // Procesamiento de datos centralizado
  const { lotDetails, items, itemMap, parameterMap, qcPlanMap } = useMemo(() => {
    const iMap = new Map(data?.items.map(i => [i.id, i]));
    const pMap = new Map(data?.qcParameters.map(p => [p.id, p]));
    const qpMap = new Map(data?.qc_plans.map(p => [p.id, p]));
    const onHandByLot = (data?.onHand ?? []).reduce((acc, oh) => {
        if (oh.lotNumber) {
            acc.set(oh.lotNumber, (acc.get(oh.lotNumber) || 0) + oh.qty);
        }
        return acc;
    }, new Map<string, number>());

    const details: LotDetail[] = (data?.lots ?? []).map(lot => {
        const item = iMap.get(lot.itemId);
        return {
            ...lot,
            itemName: item?.name ?? 'Ítem Desconocido',
            itemSku: item?.sku,
            totalStock: onHandByLot.get(lot.lotNumber) || 0,
            bucket: qcToBucket(lot.qcStatus) as BucketKey,
        };
    });

    return { lotDetails: details, items: data?.items ?? [], itemMap: iMap, parameterMap: pMap, qcPlanMap: qpMap };
  }, [data]);

  // Lógica de filtrado
  const filteredLots = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    return lotDetails.filter(lot => {
        if (activeTab !== 'ALL' && lot.bucket !== activeTab) return false;
        if (selectedSku && lot.itemId !== selectedSku) return false;
        if (lowerQuery && !lot.lotNumber.toLowerCase().includes(lowerQuery) && !lot.itemName.toLowerCase().includes(lowerQuery)) return false;
        return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lotDetails, activeTab, selectedSku, query]);

  // Selección automática y reseteo
  useEffect(() => {
    if (filteredLots.length > 0 && !filteredLots.some(l => l.lotNumber === selectedLot)) {
      setSelectedLot(filteredLots[0].lotNumber);
    } else if (filteredLots.length === 0) {
      setSelectedLot(null);
    }
  }, [filteredLots, selectedLot]);
  
  useEffect(() => {
    setAnalysisResults({});
  }, [selectedLot]);

  // Datos para el panel de la derecha
  const selectedLotData = useMemo(() => {
    if (!selectedLot) return null;
    const lot = lotDetails.find(l => l.lotNumber === selectedLot);
    if (!lot) return null;
    const plan = lot.qcPlanId ? qcPlanMap.get(lot.qcPlanId) : undefined;
    return { lot, plan };
  }, [selectedLot, lotDetails, qcPlanMap]);

  // ============================================================================
  // 2. HANDLERS Y ACCIONES
  // ============================================================================
  const handleAnalysisChange = (parameterId: string, value: string) => {
    setAnalysisResults(prev => ({ ...prev, [parameterId]: value }));
  };
  
  const handleSaveDecision = (decision: QcStatus) => {
    if (!selectedLotData) return;
    
    startTransition(async () => {
      const res = await saveQcDecision(selectedLotData.lot.lotNumber, decision, analysisResults, reviewerId);
      if (res.ok) {
        toast.success(`Decisión '${decision}' guardada para el lote ${selectedLotData.lot.lotNumber}.`);
        router.refresh(); // Pide al servidor los datos actualizados
      } else {
        toast.error(res.message);
      }
    });
  };

  const requiredSpecs = selectedLotData?.plan?.specs.filter(s => (s as any).required) ?? [];
  const allRequiredResultsEntered = requiredSpecs.every(spec =>
    analysisResults[spec.parameterId] && analysisResults[spec.parameterId].trim() !== ""
  );

  // ============================================================================
  // 3. RENDERIZADO
  // ============================================================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Columna 1: Filtros y Lista de Lotes */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <SBCard title="Filtros y Lotes" noPadding>
          <div className="p-4 border-b">
            <Select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
                <option value="">Todos los SKUs</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por lote o nombre..." className="mt-2"
            />
          </div>
          <div className="flex border-b">
            {/* ... (Tabs de filtrado) ... */}
          </div>
          <div className="h-full overflow-y-auto">
            {filteredLots.map(lot => (
                <button key={lot.id} onClick={() => setSelectedLot(lot.lotNumber)} className={`w-full text-left p-3 ${selectedLot === lot.lotNumber ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}>
                    {/* ... (Contenido del botón del lote) ... */}
                </button>
            ))}
            {filteredLots.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">No hay lotes que coincidan.</div>}
          </div>
        </SBCard>
      </div>

      {/* Columna 2: Dossier de Lote Interactivo */}
      <div className="lg:col-span-8 h-full overflow-y-auto">
        {selectedLotData ? (
          <SBCard title={<><FlaskConical size={16}/><span>Análisis y Decisión para {selectedLotData.lot.lotNumber}</span></>} accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm space-y-1">
                  <p><b>Ítem:</b> {selectedLotData.lot.itemName}</p>
                  <p><b>Plan QC:</b> {selectedLotData.plan?.name ?? <span className="text-amber-600">Sin plan asignado</span>}</p>
              </div>

              {selectedLotData.plan && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Resultados requeridos</h4>
                    {requiredSpecs.map(spec => (
                      <div key={spec.parameterId} className="grid grid-cols-[1fr_120px_80px] gap-2 items-center text-xs">
                          <label htmlFor={spec.parameterId} className="font-medium truncate">{parameterMap.get(spec.parameterId)?.label ?? spec.parameterId}</label>
                          <Input
                            id={spec.parameterId} type="text"
                            placeholder="Valor medido..."
                            value={analysisResults[spec.parameterId] ?? ""}
                            onChange={e => handleAnalysisChange(spec.parameterId, e.target.value)}
                          />
                          {/* Opcional: mostrar badge de In/Out of Spec */}
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 space-y-3">
                      <div className="grid grid-cols-[100px,1fr] gap-2 items-center text-xs">
                          <label htmlFor="reviewer" className="font-medium">Responsable</label>
                           <Select id="reviewer" value={reviewerId} onChange={e => setReviewerId(e.target.value)}>
                             <option value="mj@santabrisa.co">Martín</option>
                           </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          <SBButton onClick={() => handleSaveDecision('PASSED')} disabled={!allRequiredResultsEntered || isPending}>
                              <CheckCircle size={16}/> Liberar
                          </SBButton>
                          <SBButton variant="secondary" onClick={() => handleSaveDecision('PENDING')} disabled={isPending}>
                              <Hourglass size={16}/> Dejar en Hold
                          </SBButton>
                           <SBButton variant="destructive" onClick={() => handleSaveDecision('FAILED')} disabled={!allRequiredResultsEntered || isPending}>
                              <XCircle size={16}/> Rechazar
                          </SBButton>
                      </div>
                  </div>
                </>
              )}
            </div>
          </SBCard>
        ) : ( <div className="h-full flex items-center justify-center text-zinc-500 border-2 border-dashed rounded-xl">Selecciona un lote para ver su dossier.</div> )}
      </div>
    </div>
  );
}
