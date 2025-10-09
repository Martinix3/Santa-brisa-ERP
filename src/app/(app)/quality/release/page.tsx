// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import { CheckCircle, XCircle, FlaskConical, ChevronRight, FileText, User } from "lucide-react";
import type { Lot, Item, QcPlanBySku, QcStatus, ParameterBySku } from "@/domain/ssot";
import { saveQcDecision } from '@/server/actions/quality.actions';
import { toast } from "sonner";

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type LotForQc = Lot & {
    itemName: string;
    plan?: QcPlanBySku;
    totalStock: number;
    itemSku?: string;
};

// ============================================================================
// COMPONENTE DE PÁGINA
// ============================================================================
export default function LabReleasePage() {
    const { data: santaData, currentUser } = useData();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedLot, setSelectedLot] = useState<LotForQc | null>(null);
    const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
    const [observations, setObservations] = useState<string>("");
    const [reviewer, setReviewer] = useState<string>(currentUser?.name || currentUser?.email || "");

    const { lotsForReview, parameterMap } = useMemo(() => {
        if (!santaData) return { lotsForReview: [], parameterMap: new Map() };

        const { lots, items, qcPlans, qcParameters } = santaData;

        const itemMap = new Map((items || []).map(i => [i.id, i]));
        const planMap = new Map((qcPlans || []).map(p => [p.id, p]));
        
        // ✅ CRÍTICO: Crear mapa de planes por SKU (los planes están asociados por SKU, no por qcPlanId)
        const plansBySku = new Map((qcPlans || []).map(p => [p.sku, p]));
        const paramMap = new Map((qcParameters || []).map(p => [p.id, p]));

        const lotsWithDetails: LotForQc[] = (lots || [])
            .filter(lot => lot.qcStatus === 'PENDING')
            .map(lot => {
                const item = itemMap.get(lot.itemId);
                
                // ✅ Buscar plan: primero por qcPlanId, si no existe buscar por SKU del item
                let plan: QcPlanBySku | undefined;
                if (lot.qcPlanId) {
                    plan = planMap.get(lot.qcPlanId);
                } else if (item?.sku) {
                    plan = plansBySku.get(item.sku);
                }
                
                return {
                    ...lot,
                    itemName: item?.name ?? 'Ítem Desconocido',
                    plan,
                    totalStock: lot.quantity || 0,
                };
            })
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
            lotsForReview: lotsWithDetails,
            parameterMap: paramMap,
        };
    }, [santaData]);

    const handleSelectLot = (lot: LotForQc) => {
        setSelectedLot(lot);
        setAnalysisResults({});
    };

    const handleSaveDecision = (decision: QcStatus) => {
        if (!selectedLot) return;
        
        startTransition(async () => {
            const res = await saveQcDecision(selectedLot.lotNumber, decision, analysisResults, currentUser?.id || 'system');
            if (res.ok) {
              toast.success(`Decisión '${decision}' guardada para el lote ${selectedLot.lotNumber}.`);
              setSelectedLot(null);
              router.refresh();
            } else {
              toast.error(`Error al guardar: ${res.message}`);
            }
        });
    };
    
    if (selectedLot) {
        const requiredSpecs = selectedLot.plan?.specs ?? [];
        
        const allRequiredResultsEntered = requiredSpecs.every(spec =>
            analysisResults[spec.parameterId] && analysisResults[spec.parameterId].trim() !== ""
        );

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <SBCard title={<><FlaskConical size={16}/><span>Certificado de Análisis - Lote: {selectedLot.lotNumber}</span></>} accent="hsl(var(--sb-accent-calidad))">
                    <div className="p-6 space-y-6">
                        {/* Información del Lote */}
                        <div className="grid md:grid-cols-2 gap-4 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sm">
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Producto</p>
                                <p className="font-semibold">{selectedLot.itemName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Lote</p>
                                <p className="font-mono font-semibold">{selectedLot.lotNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Plan QC</p>
                                <p className="font-medium">{selectedLot.plan?.name ?? "Sin plan asignado"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Cantidad</p>
                                <p className="font-medium">{selectedLot.totalStock.toFixed(2)} {selectedLot.uom}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Fecha Recepción</p>
                                <p className="font-medium">{new Date(selectedLot.createdAt).toLocaleDateString('es-ES')}</p>
                            </div>
                            {selectedLot.expDate && (
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase">Fecha Caducidad</p>
                                    <p className="font-medium">{new Date(selectedLot.expDate).toLocaleDateString('es-ES')}</p>
                                </div>
                            )}
                        </div>

                        {/* Parámetros Analíticos */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <FlaskConical size={18} />
                                Resultados Analíticos
                            </h4>
                            
                            {requiredSpecs.length > 0 ? (
                                <div className="space-y-3">
                                    {requiredSpecs.map(spec => {
                                        const parameter = parameterMap.get(spec.parameterId);
                                        if (!parameter) return null;
                                        
                                        const result = analysisResults[spec.parameterId];
                                        const numResult = result ? parseFloat(result) : null;
                                        const hasRange = parameter.range && (parameter.range.min !== undefined || parameter.range.max !== undefined);
                                        
                                        let isInRange = true;
                                        if (numResult !== null && hasRange) {
                                            if (parameter.range!.min !== undefined && numResult < parameter.range!.min) isInRange = false;
                                            if (parameter.range!.max !== undefined && numResult > parameter.range!.max) isInRange = false;
                                        }
                                        
                                        const resultColor = result && !isInRange ? 'border-red-300 bg-red-50' : result && isInRange ? 'border-green-300 bg-green-50' : '';

                                        return (
                                            <div key={spec.parameterId} className="grid grid-cols-[2fr_1fr_150px] gap-4 items-center p-3 rounded-lg border bg-white">
                                                <div>
                                                    <p className="font-medium text-sm">{parameter.name}</p>
                                                    {hasRange && (
                                                        <p className="text-xs text-zinc-500 mt-1">
                                                            Rango: {parameter.range!.min !== undefined ? parameter.range!.min : '−∞'} - {parameter.range!.max !== undefined ? parameter.range!.max : '+∞'} {parameter.unit}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-sm text-zinc-600">
                                                    <span className="px-2 py-1 bg-zinc-100 rounded text-xs">{spec.point}</span>
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={parameter.unit || '0.00'}
                                                    value={result ?? ""}
                                                    onChange={e => setAnalysisResults(prev => ({...prev, [spec.parameterId]: e.target.value}))}
                                                    className={resultColor}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 p-4 bg-zinc-50 rounded-lg">Este plan no tiene análisis requeridos.</p>
                            )}
                        </div>

                        {/* Observaciones y Firmante */}
                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <FileText size={16} />
                                    Observaciones
                                </label>
                                <textarea
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    placeholder="Añadir observaciones relevantes sobre el análisis..."
                                    className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                    rows={3}
                                />
                            </div>
                            
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <User size={16} />
                                    Responsable del Análisis
                                </label>
                                <Input
                                    value={reviewer}
                                    onChange={e => setReviewer(e.target.value)}
                                    placeholder="Nombre del responsable"
                                />
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="border-t pt-4 flex justify-between items-center">
                            <SBButton variant="secondary" onClick={() => { setSelectedLot(null); setObservations(""); }}>
                                Volver a la lista
                            </SBButton>
                            <div className="flex gap-2">
                                <SBButton variant="destructive" onClick={() => handleSaveDecision('FAILED')} disabled={!allRequiredResultsEntered || !reviewer.trim() || isPending}>
                                    <XCircle size={16}/> Rechazar Lote
                                </SBButton>
                                <SBButton onClick={() => handleSaveDecision('PASSED')} disabled={!allRequiredResultsEntered || !reviewer.trim() || isPending}>
                                    <CheckCircle size={16}/> Liberar Lote
                                </SBButton>
                            </div>
                        </div>
                    </div>
                </SBCard>
            </div>
        );
    }

    return (
        <SBCard title="Lotes Pendientes de Revisión de Calidad" noPadding>
            <div className="divide-y">
                {lotsForReview.map(lot => (
                    <button key={lot.id} onClick={() => handleSelectLot(lot)} className="w-full text-left p-4 hover:bg-zinc-50 flex justify-between items-center">
                        <div>
                            <p className="font-mono text-base font-semibold text-zinc-800">{lot.lotNumber}</p>
                            <p className="text-sm text-zinc-600">{lot.itemName}</p>
                            <p className="text-xs text-zinc-400 mt-1">Creado: {new Date(lot.createdAt).toLocaleDateString('es-ES')}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </button>
                ))}
                {lotsForReview.length === 0 && (
                    <div className="p-8 text-center text-sm text-zinc-500">
                        ¡Buen trabajo! No hay lotes pendientes de revisión.
                    </div>
                )}
            </div>
        </SBCard>
    );
}
