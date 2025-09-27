
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import { Waypoints } from 'lucide-react';

export default function QualityTraceabilityPage() {
    return (
        <SBCard title="Trazabilidad de Lotes">
            <div className="p-8 text-center">
                <Waypoints className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">En Construcción</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Esta sección contendrá el buscador de lotes y el visor de genealogía y timeline.
                </p>
            </div>
        </SBCard>
    )
}
