"use client";
import React, { useMemo, useState } from 'react';
import { ProductionDashboard as ProductionDashboardContent } from '@/features/production/components/ui';
import { useData } from '@/lib/dataprovider';
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
                productionOrders: data.productionOrders?.slice(0, 20).map(o => ({ id: o.id, sku: o.sku, status: o.status, target: o.targetQuantity, date: o.createdAt })),
                lots: data.lots?.slice(0, 20).map(l => ({ id: l.id, sku: l.sku, qty: l.quantity, status: l.quality.qcStatus })),
                inventory: data.inventory?.slice(0, 20).map(i => ({ sku: i.sku, lot: i.lotNumber, qty: i.qty })),
            };
            const result = await generateInsights({ 
                jsonData: JSON.stringify(relevantData),
                context: "Eres un experto en producción y cadena de suministro. Analiza los datos de órdenes de producción, lotes e inventario para encontrar cuellos de botella, ineficiencias o riesgos. Sé conciso y directo."
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
        <SBCard title="Análisis de Producción con IA">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">Encuentra patrones en las órdenes de producción, lotes y niveles de stock.</p>
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


function ProductionDashboardPage() {
    const { data: santaData } = useData();
    const orders = santaData?.productionOrders || [];
    const lots = santaData?.lots || [];

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de producción...</div>;
    }
    
    return (
        <div className="space-y-6">
            <ProductionDashboardContent orders={orders} lots={lots} />
            <div className="pt-6">
                <AIInsightsCard />
            </div>
        </div>
    );
}

export default ProductionDashboardPage;
