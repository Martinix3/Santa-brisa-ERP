
"use client";
import { WarehouseDashboardPage as WarehouseDashboardContent } from '@/features/warehouse/components/ui-sb-warehouse';
import { useData } from '@/lib/dataprovider';
import React, { useMemo, useState } from 'react';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { BrainCircuit } from 'lucide-react';

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
                inventory: data.inventory?.slice(0, 30).map(i => ({ sku: i.sku, lot: i.lotNumber, qty: i.qty, loc: i.locationId, exp: i.expDate })),
                shipments: data.shipments?.slice(0, 20).map(s => ({ id: s.id, status: s.status, city: s.city, lines: s.lines.length })),
            };
            const result = await generateInsights({ 
                jsonData: JSON.stringify(relevantData),
                context: "Eres un experto en logística y gestión de almacenes. Analiza los datos de inventario y envíos para identificar riesgos de caducidad, niveles de stock anómalos, o patrones en los envíos (p.ej., retrasos, destinos comunes)."
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
        <SBCard title="Análisis de Almacén con IA">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">Encuentra tendencias en el inventario y los envíos pendientes.</p>
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


export default function Dashboard() {
    const { data: santaData } = useData();

    const { inventory, shipments } = useMemo(() => {
        return {
            inventory: santaData?.inventory || [],
            shipments: santaData?.shipments || [],
        };
    }, [santaData]);

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de almacén...</div>;
    }
    
    return (
        <div className="space-y-6">
            <WarehouseDashboardContent inventory={inventory} shipments={shipments} />
            <div className="pt-6">
                <AIInsightsCard />
            </div>
        </div>
    );
}
