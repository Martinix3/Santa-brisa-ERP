
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Lot, QACheck } from '@/domain/ssot';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Hourglass, CheckCircle, XCircle, FileText, BrainCircuit } from 'lucide-react';
import { LotQualityStatusPill } from '@/features/production/components/ui';
import { generateInsights } from '@/ai/flows/generate-insights-flow';

function KPI({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    return (
        <SBCard title="">
            <div className="p-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-zinc-100 text-zinc-600">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-zinc-900">{value}</p>
                        <p className="text-sm text-zinc-600">{label}</p>
                    </div>
                </div>
            </div>
        </SBCard>
    );
}

function AIInsightsCard() {
    const { data } = useData();
    const [insights, setInsights] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!data) return;
        setLoading(true);
        setInsights("");
        try {
            const relevantData = {
                lotsInQuarantine: data.lots?.filter(l => l.quality?.qcStatus === 'hold').map(l => ({ id: l.id, sku: l.sku, date: l.createdAt })),
                recentChecks: data.qaChecks?.slice(0, 20).map(c => ({ lotId: c.lotId, result: c.result, date: c.reviewedAt })),
            };
            const result = await generateInsights({ 
                jsonData: JSON.stringify(relevantData),
                context: "Eres un experto en control de calidad. Analiza los lotes en cuarentena y los últimos controles para detectar patrones de fallo, SKUs problemáticos o retrasos en las liberaciones."
            });
            setInsights(result);
        } catch (e) {
            console.error(e);
            setInsights("Hubo un error al generar el informe. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SBCard title="Análisis de Calidad con IA">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">Detecta tendencias en los resultados de calidad y los lotes en espera.</p>
                    <SBButton onClick={handleGenerate} disabled={loading}>
                        <BrainCircuit className="h-4 w-4" /> {loading ? 'Analizando...' : 'Generar Informe'}
                    </SBButton>
                </div>
                {insights && (
                    <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
                        {insights}
                    </div>
                )}
            </div>
        </SBCard>
    );
}

export default function QualityDashboardPage() {
    const { data } = useData();

    const lots = useMemo(() => data?.lots || [], [data]);
    const qaChecks = useMemo(() => data?.qaChecks || [], [data]);

    const kpis = useMemo(() => {
        const pending = lots.filter(l => l.quality?.qcStatus === 'hold').length;
        const released = lots.filter(l => l.quality?.qcStatus === 'release').length;
        const rejected = lots.filter(l => l.quality?.qcStatus === 'reject').length;
        return { pending, released, rejected };
    }, [lots]);

    const recentChecks = useMemo(() => {
        return qaChecks.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()).slice(0, 5);
    }, [qaChecks]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-zinc-800">Dashboard de Control de Calidad</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPI label="Lotes en Cuarentena" value={kpis.pending} icon={Hourglass} />
                <KPI label="Lotes Liberados" value={kpis.released} icon={CheckCircle} />
                <KPI label="Lotes Rechazados" value={kpis.rejected} icon={XCircle} />
            </div>

            <AIInsightsCard />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Lotes Pendientes de Revisión (en cuarentena)">
                     <div className="divide-y divide-zinc-100">
                        {lots.filter(l => l.quality?.qcStatus === 'hold').map(lot => (
                            <div key={lot.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-mono text-sm font-semibold">{lot.id}</p>
                                    <p className="text-xs text-zinc-500">{lot.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">{lot.quantity} uds</p>
                                    <p className="text-xs text-zinc-500">{new Date(lot.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {kpis.pending === 0 && <p className="p-4 text-sm text-center text-zinc-500">No hay lotes en cuarentena.</p>}
                    </div>
                </SBCard>
                <SBCard title="Últimos Controles de Calidad Realizados">
                    <div className="divide-y divide-zinc-100">
                       {recentChecks.map(check => (
                           <div key={check.id} className="p-3 flex justify-between items-center">
                               <div>
                                   <p className="font-mono text-sm font-semibold">{check.lotId}</p>
                                   <p className="text-xs text-zinc-500">
                                       Revisado por {data?.users.find(u => u.id === check.reviewerId)?.name || 'N/A'}
                                   </p>
                               </div>
                               <LotQualityStatusPill status={check.result === 'PASS' ? 'release' : 'reject'} />
                           </div>
                       ))}
                       {recentChecks.length === 0 && <p className="p-4 text-sm text-center text-zinc-500">No hay controles de calidad recientes.</p>}
                    </div>
                </SBCard>
            </div>
        </div>
    );
}
