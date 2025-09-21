
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Star, BarChart, FileText, Plus } from 'lucide-react';

export default function PosTacticsPage() {
    const { data } = useData();

    // Lógica futura para procesar las tácticas
    const posTactics = useMemo(() => {
        return (data?.interactions || []).filter(i => i.posTactic);
    }, [data?.interactions]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold text-zinc-800">Tácticas en Punto de Venta</h1>
                 <SBButton>
                    <Plus size={16} className="mr-2"/>
                    Nueva Táctica
                 </SBButton>
            </div>
            
            <SBCard title="Dashboard de Tácticas POS">
                <div className="p-8 text-center">
                    <Star className="mx-auto h-12 w-12 text-zinc-400" />
                    <h3 className="mt-4 text-lg font-medium text-zinc-900">Módulo en Construcción</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        Aquí podrás analizar el rendimiento (ROI y uplift) de tus tácticas en el punto de venta.
                    </p>
                </div>
            </SBCard>
            
        </div>
    );
}
