
"use client";
import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OnHandView, QACheck, QCResult, SB_THEME } from '@/domain/ssot';
import { SBCard, SBButton, Input, Textarea, LotQualityStatusPill } from '@/components/ui/ui-primitives';
import { QC_PARAMS } from '@/domain/production.qc';
import type { QCKey } from '@/domain/production.qc';
import { CheckCircle, XCircle, Hourglass, FlaskConical, Thermometer, Beaker, TestTube2, Paperclip, Upload, Trash2 } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = { TestTube2, Thermometer, FlaskConical, Beaker };

function LotListItem({ item, onSelect, isSelected }: { item: OnHandView, onSelect: () => void, isSelected: boolean }) {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 border-b hover:bg-zinc-50 ${isSelected ? 'bg-yellow-50' : ''}`}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-mono text-sm font-semibold">{item.lotNumber}</p>
                    <p className="text-xs text-zinc-500">{item.itemId}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold">{item.qty} {item.uom}</p>
                    <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
        </button>
    );
}

function AnalysisInput({ paramKey, spec, value, onChange }: { paramKey: string, spec: any, value: QCResult, onChange: (key: string, value: QCResult) => void }) {
    const Icon = spec.icon || TestTube2;

    if (spec.unit === 'desc' || spec.unit === 'ok/ko') {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Icon className="sb-icon h-5 w-5 text-zinc-500" />
                    <span className="font-medium text-zinc-800">{spec.label}</span>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => onChange(paramKey, { status: 'ok', value: true })} className={`px-3 py-1 rounded-full text-xs ${value?.value === true ? 'bg-green-500 text-white' : 'bg-zinc-200'}`}>OK</button>
                     <button onClick={() => onChange(paramKey, { status: 'ko', value: false })} className={`px-3 py-1 rounded-full text-xs ${value?.value === false ? 'bg-red-500 text-white' : 'bg-zinc-200'}`}>KO</button>
                </div>
                 <Textarea value={value?.notes || ''} onChange={(e) => onChange(paramKey, {...(value || {status:'ok'}), notes: e.target.value})} placeholder="Notas..." className="flex-grow text-sm" rows={1} />
            </div>
        );
    }

    const isOutOfSpec = value?.value !== undefined && (Number(value.value) < spec.min || Number(value.value) > spec.max);

    return (
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 w-40">
                <Icon className="sb-icon h-5 w-5 text-zinc-500" />
                <span className="font-medium text-zinc-800">{spec.label}</span>
            </div>
            <Input
                type="number"
                step="0.01"
                value={value?.value as number ?? ''}
                onChange={(e) => onChange(paramKey, { ...value, status: 'ok', value: parseFloat(e.target.value) })}
                className={`w-28 text-center ${isOutOfSpec ? 'border-red-500 ring-2 ring-red-200' : ''}`}
            />
            <div className="text-xs text-zinc-500 w-24">
                [{spec.min} - {spec.max}] {spec.unit}
            </div>
            <Textarea value={value?.notes || ''} onChange={(e) => onChange(paramKey, {...(value || {status:'ok'}), notes: e.target.value})} placeholder="Notas..." className="flex-grow text-sm" rows={1}/>
        </div>
    );
}

export default function LotReleasePage() {
    const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
    const [selectedItem, setSelectedItem] = useState<OnHandView | null>(null);
    const [analysisResults, setAnalysisResults] = useState<Record<string, QCResult>>({});

    const pendingItems = useMemo(() => {
        return (santaData?.onHand || []).filter(l => l.locationId === 'FG/QA')
            .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [santaData?.onHand]);

    const handleSelectItem = (item: OnHandView) => {
        setSelectedItem(item);
        setAnalysisResults({});
    };

    const handleResultChange = (paramKey: string, value: QCResult) => {
        setAnalysisResults(prev => ({
            ...prev,
            [paramKey]: value,
        }));
    };
    
    const handleDecision = async (decision: 'release' | 'reject') => {
        if (!selectedItem || !santaData) return;

        // In a real app, this logic would likely be in a server action or worker
        // to handle stock moves transactionally.

        // 1. Move from QA to FG (or REJECT) location
        const updatedItem = {
            ...selectedItem,
            locationId: decision === 'release' ? 'FG/MAIN' : 'REJECT',
            updatedAt: new Date().toISOString(),
        };

        const updatedOnHand = santaData.onHand.map(l => l.id === selectedItem.id ? updatedItem : l);
        
        // 2. Create a QACheck record
        const newQACheck: QACheck = {
            id: `qc_${Date.now()}`,
            subject: { kind: 'LOT', id: selectedItem.lotNumber! },
            summaryStatus: decision === 'release' ? 'ok' : 'ko',
            checklist: Object.entries(analysisResults).map(([key, res]) => ({ name: key, ...res })),
            reviewedById: 'system', // Replace with current user ID
            reviewedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        const updatedQAChecks = [...(santaData.qaChecks || []), newQACheck];
        
        setData({ ...santaData, onHand: updatedOnHand, qaChecks: updatedQAChecks });

        if (isPersistenceEnabled) {
            await saveCollection('onHand', updatedOnHand);
            await saveCollection('qaChecks', updatedQAChecks);
        }

        setSelectedItem(null);
        setAnalysisResults({});
    };

    const currentSpec = selectedItem ? QC_PARAMS[selectedItem.itemId] || {} : {};
    const paramKeys = Object.keys(currentSpec);
    
    const allChecksDone = paramKeys.every(key => analysisResults[key]?.value !== undefined && analysisResults[key]?.value !== '');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1">
                <SBCard title={`Lotes en Cuarentena (${pendingItems.length})`}>
                    <div className="max-h-[75vh] overflow-y-auto">
                        {pendingItems.length > 0 ? (
                            pendingItems.map(item => (
                                <LotListItem 
                                    key={item.id} 
                                    item={item}
                                    onSelect={() => handleSelectItem(item)}
                                    isSelected={selectedItem?.id === item.id}
                                />
                            ))
                        ) : (
                            <p className="p-8 text-center text-zinc-500">¡No hay lotes pendientes de revisión!</p>
                        )}
                    </div>
                </SBCard>
            </div>
            <div className="lg:col-span-2">
                {selectedItem ? (
                    <SBCard title={`Revisión del Lote: ${selectedItem.lotNumber}`}>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm p-4 bg-zinc-50 rounded-lg border">
                                <div><span className="font-semibold">ItemID:</span> {selectedItem.itemId}</div>
                                <div><span className="font-semibold">Cantidad:</span> {selectedItem.qty} {selectedItem.uom}</div>
                                <div><span className="font-semibold">Creado:</span> {new Date(selectedItem.createdAt).toLocaleDateString()}</div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-800">Resultados del Análisis</h3>
                                {paramKeys.length > 0 ? paramKeys.map(key => (
                                    <AnalysisInput
                                        key={key}
                                        paramKey={key}
                                        spec={currentSpec[key as QCKey]}
                                        value={analysisResults[key as QCKey]}
                                        onChange={handleResultChange}
                                    />
                                )) : <p className="text-sm text-zinc-500">No hay parámetros de QC definidos para este SKU.</p>}
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-zinc-800">Documentos (CoA)</h3>
                                <div className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                                    <Upload className="h-8 w-8 text-zinc-400 mb-2"/>
                                    <p className="text-sm text-zinc-600">Arrastra aquí el CoA o haz click para subirlo.</p>
                                    <p className="text-xs text-zinc-400 mt-1">PDF, PNG, JPG hasta 5MB</p>
                                    {/* En una app real, esto sería un input de tipo file */}
                                </div>
                            </div>

                            <div className="flex justify-end items-center gap-3 pt-4 border-t">
                                <p className={`text-sm ${allChecksDone ? 'text-green-600' : 'text-amber-600'}`}>{allChecksDone ? 'Todos los tests rellenados.' : 'Faltan tests por rellenar.'}</p>
                                <SBButton variant="destructive" onClick={() => handleDecision('reject')} disabled={!allChecksDone}>
                                    <XCircle className="h-4 w-4 mr-2"/> Rechazar Lote
                                </SBButton>
                                <SBButton onClick={() => handleDecision('release')} disabled={!allChecksDone}>
                                    <CheckCircle className="h-4 w-4 mr-2"/> Liberar Lote
                                </SBButton>
                            </div>
                        </div>
                    </SBCard>
                ) : (
                    <div className="p-12 text-center border-2 border-dashed rounded-2xl">
                        <Hourglass className="h-12 w-12 mx-auto text-zinc-400 mb-4"/>
                        <h3 className="text-lg font-semibold text-zinc-800">Selecciona un lote</h3>
                        <p className="text-zinc-500">Elige un lote de la lista para empezar la revisión de calidad.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
