
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Star, BarChart, FileText, Plus, TrendingUp, DollarSign, Trophy, Percent, ChevronDown } from 'lucide-react';
import { usePosTactics } from '@/features/marketing/services/pos.service';
import type { Interaction, PosResult, Account } from '@/domain';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import Typeahead from '@/components/ui/Typeahead';

const POS_TACTICS_DICTIONARY = [
    "ICE_BUCKET", "GLASSWARE", "BARTENDER_INCENTIVE", "MENU_PLACEMENT",
    "CHALKBOARD", "TWO_FOR_ONE", "HAPPY_HOUR", "SECONDARY_PLACEMENT", "OTHER"
];

function KPI({ label, value, icon: Icon, unit = '' }: { label: string; value: string | number; icon: React.ElementType, unit?: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-xl font-bold text-zinc-800">{value}{unit}</p>
                    <p className="text-xs text-zinc-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function NewTacticDialog({
    open,
    onClose,
    onSave,
}: {
    open: boolean,
    onClose: () => void,
    onSave: (interactionId: string, payload: any) => Promise<void>
}) {
    const { data } = useData();
    const [tacticCode, setTacticCode] = useState(POS_TACTICS_DICTIONARY[0]);
    const [accountId, setAccountId] = useState('');
    const [accountName, setAccountName] = useState('');
    const [costTotal, setCostTotal] = useState<number | ''>('');
    const [executionScore, setExecutionScore] = useState<number | ''>(80);

    const accountsForTypeahead = useMemo(() => {
        return (data?.accounts || []).map(a => ({ id: a.id, label: a.name, meta: a.city || '' }));
    }, [data?.accounts]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || costTotal === '' || executionScore === '') {
            alert('Por favor, completa todos los campos requeridos.');
            return;
        }
        
        // Se crea una Interaction para contener la táctica
        const newInteraction: Interaction = {
            id: `int_${Date.now()}`,
            accountId: accountId,
            userId: data!.currentUser!.id,
            createdAt: new Date().toISOString(),
            status: 'open',
            kind: 'OTRO',
            dept: 'MARKETING',
            note: `Táctica POS: ${tacticCode}`,
            posTactic: {
                tacticCode,
                startDate: new Date().toISOString(),
                costTotal: Number(costTotal),
                executionScore: Number(executionScore),
            }
        };

        await onSave(newInteraction.id, newInteraction);
        onClose();
    };

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title="Registrar Nueva Táctica POS"
                description="Rellena los datos de la acción realizada en el punto de venta."
                onSubmit={handleSave}
                primaryAction={{ label: "Guardar Táctica", type: "submit" }}
                secondaryAction={{ label: "Cancelar", onClick: onClose }}
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Cuenta</span>
                        <Typeahead
                            items={accountsForTypeahead}
                            value={accountName}
                            onChange={setAccountName}
                            onSelect={(item) => {
                                setAccountId(item.id);
                                setAccountName(item.label);
                            }}
                            placeholder="Busca una cuenta..."
                        />
                    </label>
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium">Táctica</span>
                        <select value={tacticCode} onChange={e => setTacticCode(e.target.value)} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                            {POS_TACTICS_DICTIONARY.map(code => <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>)}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Coste Total (€)</span>
                            <input type="number" value={costTotal} onChange={e => setCostTotal(Number(e.target.value))} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required/>
                        </label>
                         <label className="grid gap-1.5">
                            <span className="text-sm font-medium">Ejecución (0-100)</span>
                            <input type="number" min="0" max="100" value={executionScore} onChange={e => setExecutionScore(Number(e.target.value))} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required/>
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

function ConfidencePill({ confidence }: { confidence: PosResult['confidence']}) {
    const styles = {
        HIGH: 'bg-green-100 text-green-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        LOW: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[confidence]}`}>{confidence}</span>
}


export default function PosTacticsPage() {
    const { data, setData } = useData();
    const { createOrUpdatePosTactic } = usePosTactics();
    const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);

    const posTactics = useMemo(() => {
        return (data?.interactions || []).filter(i => i.posTactic)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [data?.interactions]);

    const completedTactics = useMemo(() => {
        return posTactics.filter(t => t.posTacticResult);
    }, [posTactics]);

    const kpis = useMemo(() => {
        if (completedTactics.length === 0) {
            return { avgRoi: 0, avgLift: 0, totalSpend: 0, successRate: 0 };
        }
        const totalSpend = completedTactics.reduce((sum, t) => sum + (t.posTactic?.costTotal || 0), 0);
        const totalRoi = completedTactics.reduce((sum, t) => sum + (t.posTacticResult?.roi || 0), 0);
        const totalLift = completedTactics.reduce((sum, t) => sum + (t.posTacticResult?.liftPct || 0), 0);
        const successfulTactics = completedTactics.filter(t => (t.posTacticResult?.roi || 0) > 0).length;

        return {
            avgRoi: (totalRoi / completedTactics.length) * 100,
            avgLift: (totalLift / completedTactics.length) * 100,
            totalSpend,
            successRate: (successfulTactics / completedTactics.length) * 100,
        };
    }, [completedTactics]);

    const handleSaveTactic = async (interactionId: string, newInteraction: Interaction) => {
        if (!data) return;
        
        const updatedInteractions = [...(data.interactions || []), newInteraction];
        setData({ ...data, interactions: updatedInteractions });

        // En una app real, la llamada al servicio se haría aquí.
        // await createOrUpdatePosTactic(interactionId, newInteraction.posTactic!);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold text-zinc-800">Tácticas en Punto de Venta</h1>
                 <SBButton onClick={() => setIsNewTacticOpen(true)}>
                    <Plus size={16} className="mr-2"/>
                    Nueva Táctica
                 </SBButton>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="ROI Medio" value={kpis.avgRoi.toFixed(0)} icon={TrendingUp} unit="%" />
                <KPI label="Uplift Medio Ventas" value={kpis.avgLift.toFixed(1)} icon={BarChart} unit="%" />
                <KPI label="Inversión Total" value={kpis.totalSpend.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})} icon={DollarSign} />
                <KPI label="Tasa de Éxito" value={kpis.successRate.toFixed(0)} icon={Trophy} unit="%" />
            </div>

            <SBCard title="Historial de Tácticas POS">
                 <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-6 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                        <span>Cuenta</span>
                        <span>Táctica</span>
                        <span className="text-right">Coste</span>
                        <span className="text-right">Uplift</span>
                        <span className="text-right">ROI</span>
                        <span>Confianza</span>
                    </div>
                    {posTactics.map(tactic => {
                        const account = data?.accounts.find(a => a.id === tactic.accountId);
                        const result = tactic.posTacticResult;
                        return (
                            <div key={tactic.id} className="grid grid-cols-6 p-3 items-center hover:bg-zinc-50/50">
                                <div className="font-medium">{account?.name || 'N/A'}</div>
                                <div className="text-sm">{tactic.posTactic?.tacticCode.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-right font-mono">{tactic.posTactic?.costTotal.toFixed(2)}€</div>
                                {result ? (
                                    <>
                                        <div className={`text-sm text-right font-semibold ${result.liftPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(result.liftPct * 100).toFixed(1)}%
                                        </div>
                                        <div className={`text-sm text-right font-semibold ${result.roi && result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.roi ? (result.roi * 100).toFixed(0) + '%' : 'N/A'}
                                        </div>
                                        <div><ConfidencePill confidence={result.confidence} /></div>
                                    </>
                                ) : (
                                    <td colSpan={3} className="text-center text-xs text-zinc-500">Pendiente de cálculo</td>
                                )}
                            </div>
                        )
                    })}
                    {posTactics.length === 0 && (
                        <p className="p-8 text-center text-sm text-zinc-500">No hay tácticas POS registradas todavía.</p>
                    )}
                </div>
            </SBCard>

            {isNewTacticOpen && (
                <NewTacticDialog
                    open={isNewTacticOpen}
                    onClose={() => setIsNewTacticOpen(false)}
                    onSave={handleSaveTactic}
                />
            )}
        </div>
    );
}
