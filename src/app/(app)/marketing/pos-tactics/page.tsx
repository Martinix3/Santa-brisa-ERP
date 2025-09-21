
"use client";
import React, { useMemo, useState } from 'react';
import { SBButton, SBCard } from '@/components/ui/ui-primitives';
import { Star, TrendingUp, DollarSign, Trophy, Percent, Plus } from 'lucide-react';
import { usePosTacticsService } from '@/features/marketing/services/posTactics.service';
import { NewPosTacticDialog } from '@/features/marketing/components/NewPosTacticDialog';
import type { PosTactic, PosResult } from '@/domain';
import { useData } from '@/lib/dataprovider';

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

function StatusPill({ status }: { status: PosTactic['status'] }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800 animate-pulse',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}


export default function PosTacticsPage() {
    const { tactics, upsertPosTactic, closePosTactic, catalog, plv } = usePosTacticsService();
    const { data } = useData();
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
            avgLift: (totalLift / closedTactics.length) * 100,
            totalSpend,
            successRate: (successfulTactics / closedTactics.length) * 100,
        };
    }, [tactics]);
    
    const handleSaveTactic = async (tacticData: any) => {
        try {
            await upsertPosTactic(tacticData);
            setIsNewTacticOpen(false);
            setEditingTactic(null);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        }
    };
    
    const handleEdit = (tactic: PosTactic) => {
        setEditingTactic(tactic);
        setIsNewTacticOpen(true);
    };

    const handleCloseTactic = async (tacticId: string) => {
        if (confirm("¿Estás seguro de que quieres cerrar esta táctica? Se calcularán sus resultados finales.")) {
            try {
                await closePosTactic(tacticId);
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
                    <div className="grid grid-cols-6 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                        <span>Cuenta</span>
                        <span>Táctica</span>
                        <span className="text-right">Coste</span>
                        <span className="text-right">Uplift Ventas</span>
                        <span className="text-right">ROI</span>
                        <span>Acciones</span>
                    </div>
                    {tactics.map(tactic => {
                        const account = data?.accounts.find(a => a.id === tactic.accountId);
                        const result = tactic.result;

                        return (
                            <div key={tactic.id} className="grid grid-cols-6 p-3 items-center hover:bg-zinc-50/50 text-sm">
                                <div className="font-medium">{account?.name || tactic.accountId}</div>
                                <div>{tactic.description || tactic.tacticCode}</div>
                                <div className="text-right font-mono">{tactic.actualCost.toFixed(2)}€</div>
                                {result ? (
                                    <>
                                        <div className={`text-right font-semibold ${result.liftPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(result.liftPct * 100).toFixed(1)}%
                                        </div>
                                        <div className={`text-right font-semibold ${result.roi && result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.roi ? `${(result.roi * 100).toFixed(0)}%` : 'N/A'}
                                        </div>
                                    </>
                                ) : (
                                    <td colSpan={2} className="text-center text-xs text-zinc-500">Pendiente de cálculo</td>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <SBButton size="sm" variant="secondary" onClick={() => handleEdit(tactic)}>Editar</SBButton>
                                    {tactic.status !== 'closed' && (
                                        <SBButton size="sm" onClick={() => handleCloseTactic(tactic.id)}>Cerrar</SBButton>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {tactics.length === 0 && (
                        <p className="p-8 text-center text-sm text-zinc-500">No hay tácticas POS registradas todavía.</p>
                    )}
                </div>
            </SBCard>
            
            {isNewTacticOpen && (
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

