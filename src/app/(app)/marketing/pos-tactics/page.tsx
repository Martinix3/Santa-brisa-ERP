
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Star, TrendingUp, DollarSign, Trophy, Percent, ChevronDown } from 'lucide-react';
import { usePosTactics } from '@/features/marketing/services/pos.service';
import type { Interaction, PosResult, Account, Activation, Promotion } from '@/domain';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import Typeahead from '@/components/ui/Typeahead';

type Tactic = (Activation | Promotion) & { tacticType: 'Activation' | 'Promotion' };

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

function ConfidencePill({ confidence }: { confidence?: PosResult['confidence']}) {
    if (!confidence) return <span className="text-zinc-400">—</span>;
    const styles = {
        HIGH: 'bg-green-100 text-green-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        LOW: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[confidence]}`}>{confidence}</span>
}


export default function PosTacticsPage() {
    const { data } = useData();
    const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);

    const allTactics = useMemo((): Tactic[] => {
        if (!data) return [];
        const activations: Tactic[] = (data.activations || []).map(a => ({ ...a, tacticType: 'Activation' }));
        const promotions: Tactic[] = (data.promotions || []).map(p => ({ ...p, tacticType: 'Promotion' }));
        // En un futuro, las promociones también deberían estar ligadas a una cuenta.
        // Por ahora, las excluimos o las asociamos a una cuenta dummy si es necesario.
        return [...activations].sort((a,b) => new Date(b.startDate || b.validFrom).getTime() - new Date(a.startDate || a.validFrom).getTime());
    }, [data]);

    const completedTactics = useMemo(() => {
        // Lógica para filtrar tácticas con resultados computados.
        // Por ahora, simularemos que algunas tienen resultados.
        return allTactics.map((t, i) => ({
            ...t,
            // Simulación de resultados
            result: i % 3 !== 0 ? {
                liftPct: (Math.random() - 0.2) * 0.5,
                roi: (Math.random() - 0.3) * 3,
                confidence: (['HIGH', 'MEDIUM', 'LOW'] as const)[i % 3]
            } as PosResult : undefined
        }));
    }, [allTactics]);

    const kpis = useMemo(() => {
        const withResults = completedTactics.filter(t => t.result);
        if (withResults.length === 0) {
            return { avgRoi: 0, avgLift: 0, totalSpend: 0, successRate: 0 };
        }
        const totalSpend = allTactics.reduce((sum, t) => sum + ((t as Activation).cost || 0), 0);
        const totalRoi = withResults.reduce((sum, t) => sum + (t.result?.roi || 0), 0);
        const totalLift = withResults.reduce((sum, t) => sum + (t.result?.liftPct || 0), 0);
        const successfulTactics = withResults.filter(t => (t.result?.roi || 0) > 0).length;

        return {
            avgRoi: (totalRoi / withResults.length) * 100,
            avgLift: (totalLift / withResults.length) * 100,
            totalSpend,
            successRate: (successfulTactics / withResults.length) * 100,
        };
    }, [completedTactics, allTactics]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold text-zinc-800">Tácticas en Punto de Venta (POS)</h1>
                 <SBButton onClick={() => setIsNewTacticOpen(true)}>
                    <Star size={16} className="mr-2"/>
                    Nueva Táctica
                 </SBButton>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="ROI Medio" value={kpis.avgRoi.toFixed(0)} icon={TrendingUp} unit="%" />
                <KPI label="Uplift Medio Ventas" value={kpis.avgLift.toFixed(1)} icon={Percent} unit="%" />
                <KPI label="Inversión Total" value={kpis.totalSpend.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})} icon={DollarSign} />
                <KPI label="Tasa de Éxito" value={kpis.successRate.toFixed(0)} icon={Trophy} unit="%" />
            </div>

            <SBCard title="Historial y Rentabilidad de Tácticas">
                 <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-6 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                        <span>Cuenta</span>
                        <span>Táctica</span>
                        <span className="text-right">Coste</span>
                        <span className="text-right">Uplift Ventas</span>
                        <span className="text-right">ROI</span>
                        <span>Confianza</span>
                    </div>
                    {completedTactics.map(tactic => {
                        const account = data?.accounts.find(a => a.id === (tactic as Activation).accountId);
                        const result = (tactic as any).result;
                        const cost = (tactic as Activation).cost || ((tactic as Promotion).value || 0);

                        return (
                            <div key={tactic.id} className="grid grid-cols-6 p-3 items-center hover:bg-zinc-50/50 text-sm">
                                <div className="font-medium">{account?.name || 'N/A'}</div>
                                <div>{tactic.description || tactic.name}</div>
                                <div className="text-right font-mono">{cost.toFixed(2)}€</div>
                                {result ? (
                                    <>
                                        <div className={`text-right font-semibold ${result.liftPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(result.liftPct * 100).toFixed(1)}%
                                        </div>
                                        <div className={`text-right font-semibold ${result.roi && result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.roi ? `${(result.roi * 100).toFixed(0)}%` : 'N/A'}
                                        </div>
                                        <div><ConfidencePill confidence={result.confidence} /></div>
                                    </>
                                ) : (
                                    <td colSpan={3} className="text-center text-xs text-zinc-500">Pendiente de cálculo</td>
                                )}
                            </div>
                        )
                    })}
                    {completedTactics.length === 0 && (
                        <p className="p-8 text-center text-sm text-zinc-500">No hay tácticas POS con resultados todavía.</p>
                    )}
                </div>
            </SBCard>
        </div>
    );
}
