
"use client";
import React, { useMemo, useState, useCallback } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Lot, QACheck } from '@/domain/ssot';
import { QC_PARAMS, QCKey } from '@/domain/production.qc';
import { SBCard, SB_COLORS, SBButton } from '@/components/ui/ui-primitives';
import { Hourglass, CheckCircle, XCircle, Beaker, ChevronRight, Save } from 'lucide-react';

function LotRow({ lot, onSelect, isSelected }: { lot: Lot; onSelect: () => void; isSelected: boolean }) {
    return (
        <button 
            onClick={onSelect} 
            className={`w-full text-left p-3 grid grid-cols-4 gap-4 items-center transition-colors ${isSelected ? 'bg-yellow-100' : 'hover:bg-zinc-50'}`}
        >
            <div className="font-mono text-sm font-semibold">{lot.id}</div>
            <div>{lot.sku}</div>
            <div>{lot.quantity} uds</div>
            <div className="flex justify-between items-center">
                <span>{new Date(lot.createdAt).toLocaleDateString()}</span>
                <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
            </div>
        </button>
    );
}

function QCAnalysisPanel({ lot, onSave }: { lot: Lot; onSave: (lotId: string, status: 'release' | 'reject', results: Lot['quality']['results']) => void; }) {
    const spec = QC_PARAMS[lot.sku] || {};
    const [results, setResults] = useState<Lot['quality']['results']>(lot.quality?.results || {});

    const handleResultChange = (key: QCKey, value: string) => {
        const numValue = parseFloat(value);
        const paramSpec = spec[key as keyof typeof spec];
        let status: 'ok' | 'ko' = 'ok';

        if (paramSpec && 'min' in paramSpec && !isNaN(numValue)) {
            if (numValue < paramSpec.min || numValue > paramSpec.max) {
                status = 'ko';
            }
        }

        setResults(prev => ({
            ...prev,
            [key]: { value: isNaN(numValue) ? value : numValue, status }
        }));
    };

    const allTestsPassed = Object.keys(spec).every(key => {
        const result = results[key];
        // If a test hasn't been performed, it hasn't passed.
        if (!result) return false; 
        // If it's a descriptive test, it passes if there's notes.
        if (!('min' in spec[key]) && result.notes) return true;
        // Otherwise, check status.
        return result.status === 'ok';
    });
    
    return (
        <SBCard title={`Análisis para Lote: ${lot.id}`} accent={SB_COLORS.quality}>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.keys(spec) as QCKey[]).map(key => {
                        const param = spec[key];
                        if (!param) return null;
                        const result = results[key];
                        const isNumeric = 'min' in param;
                        const statusColor = result?.status === 'ok' ? 'border-green-400' : result?.status === 'ko' ? 'border-red-400' : 'border-zinc-200';

                        return (
                            <div key={key} className={`p-3 rounded-lg border-2 ${statusColor} bg-white`}>
                                <label className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-800 flex items-center gap-2">
                                        <param.icon className="h-4 w-4 text-zinc-500"/>
                                        {param.label}
                                    </span>
                                    {isNumeric && <span className="text-xs text-zinc-500">Spec: {param.min}-{param.max} {param.unit}</span>}
                                </label>
                                {isNumeric ? (
                                    <input 
                                        type="number"
                                        step="0.01"
                                        placeholder={`Valor (${param.unit})`}
                                        value={result?.value as number || ''}
                                        onChange={e => handleResultChange(key, e.target.value)}
                                        className="mt-2 w-full h-9 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm"
                                    />
                                ) : (
                                    <textarea
                                        placeholder="Notas de cata/observaciones..."
                                        value={result?.notes || ''}
                                        onChange={e => setResults(prev => ({...prev, [key]: {...prev[key], notes: e.target.value, status: e.target.value ? 'ok' : 'ko'}}))}
                                        className="mt-2 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm"
                                        rows={2}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t flex justify-end items-center gap-3">
                 {!allTestsPassed && <span className="text-sm text-amber-700 mr-auto">Faltan pruebas o algunas están fuera de spec.</span>}
                 <SBButton variant="destructive" onClick={() => onSave(lot.id, 'reject', results)}>
                    <XCircle className="h-4 w-4" /> Rechazar Lote
                </SBButton>
                <SBButton onClick={() => onSave(lot.id, 'release', results)} disabled={!allTestsPassed}>
                    <CheckCircle className="h-4 w-4" /> Liberar Lote
                </SBButton>
            </div>
        </SBCard>
    )
}

export default function QualityWorkbenchPage() {
    const { data, setData } = useData();
    const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

    const lotsInQuarantine = useMemo(() => {
        return (data?.lots || []).filter(l => l.quality?.qcStatus === 'hold').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [data?.lots]);

    const selectedLot = useMemo(() => {
        return lotsInQuarantine.find(l => l.id === selectedLotId) || null;
    }, [selectedLotId, lotsInQuarantine]);
    
    // Select first lot by default
    useState(() => {
        if (lotsInQuarantine.length > 0 && !selectedLotId) {
            setSelectedLotId(lotsInQuarantine[0].id);
        }
    });

    const handleSave = useCallback((lotId: string, status: 'release' | 'reject', results: Lot['quality']['results']) => {
        if (!data) return;

        const updatedLots = data.lots.map(lot => {
            if (lot.id === lotId) {
                return {
                    ...lot,
                    quality: {
                        ...lot.quality,
                        qcStatus: status,
                        results,
                    }
                };
            }
            return lot;
        });

        setData({ ...data, lots: updatedLots });
        setSelectedLotId(null); // Deselect after action
    }, [data, setData]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-zinc-800">Banco de Trabajo de Calidad</h1>
            <p className="text-zinc-600">
                Selecciona un lote en cuarentena para introducir los resultados de los análisis y decidir si se libera o se rechaza.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <SBCard title={`Lotes en Cuarentena (${lotsInQuarantine.length})`} accent={SB_COLORS.quality}>
                        <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto">
                            {lotsInQuarantine.length > 0 ? (
                                lotsInQuarantine.map(lot => (
                                    <LotRow 
                                        key={lot.id} 
                                        lot={lot} 
                                        onSelect={() => setSelectedLotId(lot.id)}
                                        isSelected={selectedLotId === lot.id}
                                    />
                                ))
                            ) : (
                                <p className="p-6 text-center text-sm text-zinc-500">¡Todo en orden! No hay lotes pendientes de revisión.</p>
                            )}
                        </div>
                    </SBCard>
                </div>
                <div className="lg:col-span-2">
                    {selectedLot ? (
                        <QCAnalysisPanel lot={selectedLot} onSave={handleSave} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-zinc-50 rounded-2xl border-2 border-dashed">
                             <Beaker className="h-12 w-12 text-zinc-400 mb-4" />
                             <h3 className="text-lg font-semibold text-zinc-800">Selecciona un lote</h3>
                             <p className="text-sm text-zinc-500">Elige un lote de la lista de la izquierda para empezar el análisis de calidad.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
