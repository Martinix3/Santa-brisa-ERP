
"use client";
import React from 'react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { FileText } from 'lucide-react';

export default function QualityDashboardPage() {
    return (
        <SBCard title="Dashboard de Calidad">
            <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">En Construcción</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Esta sección mostrará los KPIs principales de calidad, lotes pendientes, y alertas.
                </p>
            </div>
        </SBCard>
    )
}
