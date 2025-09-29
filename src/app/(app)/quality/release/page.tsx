// src/app/(app)/quality/release/page.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import { CheckCircle, XCircle, FlaskConical, ChevronRight } from "lucide-react";
import type { Lot, Item, QcPlanBySku, QcStatus, ParameterBySku } from "@/domain/ssot";
import { saveQcDecision } from '@/app/(app)/quality/actions';
import { toast } from "sonner";

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type LotForQc = Lot & {
    itemName: string;
    plan?: QcPlanBySku;
    totalStock: number;
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

    const { lotsForReview, parameterMap } = useMemo(() => {
        if (!santaData) return { lotsForReview: [], parameterMap: new Map() };

        const { lots, items, qcPlans, qcParameters } = santaData;

        const itemMap = new Map((items || []).map(i => [i.id, i]));
        const planMap = new Map((qcPlans || []).map(p => [p.id, p]));
        const paramMap = new Map((qcParameters || []).map(p => [p.id, p]));

        const lotsWithDetails: LotForQc[] = (lots || [])
            .filter(lot => lot.qcStatus === 'PENDING')
            .map(lot => ({
                ...lot,
                itemName: itemMap.get(lot.itemId)?.name ?? 'Ítem Desconocido',
                plan: lot.qcPlanId ? planMap.get(lot.qcPlanId) : undefined,
                totalStock: lot.quantity,
            }))
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
            <SBCard title={<><FlaskConical size={16}/><span>Parte de Análisis para Lote: {selectedLot.lotNumber}</span></>} accent="hsl(var(--sb-accent-calidad))">
                <div className="p-4 space-y-6">
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm">
                        <p><b>Ítem:</b> {selectedLot.itemName}</p>
                        <p><b>Plan QC:</b> {selectedLot.plan?.name ?? "N/A"}</p>
                        <p><b>Stock Total:</b> {selectedLot.totalStock.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-md font-semibold">Parámetros a Medir</h4>
                        {requiredSpecs.length > 0 ? requiredSpecs.map(spec => {
                            const parameter = parameterMap.get(spec.parameterId);
                            if (!parameter) return null;
                            return (
                                <div key={spec.parameterId} className="grid grid-cols-[1fr_150px] gap-4 items-center">
                                    <label htmlFor={spec.parameterId} className="font-medium text-sm">
                                        {parameter.name ?? spec.parameterId}
                                    </label>
                                    <Input
                                        id={spec.parameterId}
                                        placeholder={parameter.unit || 'Resultado...'}
                                        value={analysisResults[spec.parameterId] ?? ""}
                                        onChange={e => setAnalysisResults(prev => ({...prev, [spec.parameterId]: e.target.value}))}
                                    />
                                </div>
                            )
                        }) : <p className="text-sm text-zinc-500">Este plan no tiene análisis requeridos.</p>}
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center">
                        <SBButton variant="secondary" onClick={() => setSelectedLot(null)}>
                            Volver a la lista
                        </SBButton>
                        <div className="flex gap-2">
                            <SBButton variant="destructive" onClick={() => handleSaveDecision('FAILED')} disabled={!allRequiredResultsEntered || isPending}>
                                <XCircle size={16}/> Rechazar
                            </SBButton>
                            <SBButton onClick={() => handleSaveDecision('PASSED')} disabled={!allRequiredResultsEntered || isPending}>
                                <CheckCircle size={16}/> Liberar Lote
                            </SBButton>
                        </div>
                    </div>
                </div>
            </SBCard>
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
