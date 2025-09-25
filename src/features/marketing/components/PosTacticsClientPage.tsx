

// src/features/marketing/components/PosTacticsClientPage.tsx
'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { Star, TrendingUp, DollarSign, Trophy, Percent, Plus } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { NewPosTacticDialog } from '@/features/marketing/components/NewPosTacticDialog';
import type { PosTactic, PosResult, PosCostCatalogEntry, PlvMaterial, Account } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { upsertPosTactic, closePosTactic } from '../services/posTactics.client';

function KPI({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string; value: string | number; unit?: string }) {
    return (
        <SBCard title="">
            <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-zinc-500" />
                    <h3 className="font-semibold text-zinc-700">{label}</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{value}{unit && <span className="text-sm text-zinc-500 ml-1">{unit}</span>}</p>
            </div>
        </SBCard>
    );
}

export function PosTacticsClientPage({
    initialTactics,
    catalog,
    plv,
}: {
    initialTactics: PosTactic[];
    catalog: PosCostCatalogEntry[];
    plv: PlvMaterial[];
}) {
    const { data, currentUser } = useData();
    const [tactics, setTactics] = useState(initialTactics);
    const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);
    const [editingTactic, setEditingTactic] = useState<PosTactic | null>(null);

    const kpis = useMemo(() => {
        const closedTactics = tactics.filter(t => t.status === 'closed' && t.result);
        if (closedTactics.length === 0) {
            return { avgRoi: 0, avgLift: 0, totalSpend: 0, successRate: 0 };
        }
        const totalSpend = tactics.reduce((sum, t) => sum + (t.actualCost || 0), 0);
        const totalRoi = closedTactics.reduce((sum, t) => sum + (t.result?.roi || 0), 0);
        const totalLift = closedTactics.reduce((sum, t) => sum + (t.result?.liftPct || 0), 0);
        const successfulTactics = closedTactics.filter(t => (t.result?.roi || 0) > 0).length;

        return {
            avgRoi: (totalRoi / closedTactics.length) * 100,
            avgLift: (totalLift / closedTactics.length),
            totalSpend,
            successRate: (successfulTactics / closedTactics.length) * 100,
        };
    }, [tactics]);

    const handleSaveTactic = async (tacticData: any) => {
        try {
            const savedTactic = await upsertPosTactic(tacticData, currentUser?.id || 'unknown');
            setTactics(prev => {
                const index = prev.findIndex(t => t.id === savedTactic.id);
                if (index > -1) {
                    const next = [...prev];
                    next[index] = savedTactic;
                    return next;
                }
                return [savedTactic, ...prev];
            });
            setIsNewTacticOpen(false);
            setEditingTactic(null);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        }
    };

    const handleCloseTactic = async (tacticId: string) => {
        if (confirm("¿Estás seguro de que quieres cerrar esta táctica? Se calcularán sus resultados finales.")) {
            try {
                const result = await closePosTactic(tacticId);
                setTactics(prev => prev.map(t => t.id === tacticId ? { ...t, ...result } : t));
            } catch (e) {
                alert((e as Error).message);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold text-zinc-800">Tácticas en Punto de Venta (POS)</h1>
                 <SBButton onClick={() => { setEditingTactic(null); setIsNewTacticOpen(true); }}>
                    <Plus size={16} className="mr-2"/>
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
                    <div className="grid grid-cols-5 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                        <span>Cuenta</span>
                        <span>Táctica</span>
                        <span className="text-right">Coste</span>
                        <span className="text-right">Uplift Ventas</span>
                        <span className="text-right">ROI</span>
                    </div>
                    {tactics.map(tactic => {
                        const account = data?.accounts.find(a => a.id === tactic.accountId);
                        const result = tactic.result;

                        return (
                            <div key={tactic.id} className="grid grid-cols-5 p-3 items-center hover:bg-zinc-50/50 text-sm">
                                <div className="font-medium">{account?.name || tactic.accountId}</div>
                                <div>{tactic.description || tactic.tacticCode}</div>
                                <div className="text-right font-mono">{tactic.actualCost.toFixed(2)}€</div>
                                {result ? (
                                    <>
                                        <div className={`text-right font-semibold ${(result.liftPct || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.liftPct ? `${(result.liftPct * 100).toFixed(1)}%` : 'N/A'}
                                        </div>
                                        <div className={`text-right font-semibold ${result.roi && result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.roi ? `${(result.roi * 100).toFixed(0)}%` : 'N/A'}
                                        </div>
                                    </>
                                ) : (
                                    <td colSpan={2} className="text-center text-xs text-zinc-500">Pendiente de cálculo</td>
                                )}
                            </div>
                        )
                    })}
                    {tactics.length === 0 && (
                        <p className="p-8 text-center text-sm text-zinc-500">No hay tácticas POS registradas todavía.</p>
                    )}
                </div>
            </SBCard>
            
            {isNewTacticOpen && data && (
                <NewPosTacticDialog
                    open={isNewTacticOpen}
                    onClose={() => setIsNewTacticOpen(false)}
                    onSave={handleSaveTactic}
                    tacticBeingEdited={editingTactic}
                    accounts={data?.accounts || []}
                    costCatalog={catalog}
                    plvInventory={plv}
                />
            )}
        </div>
    );
}
