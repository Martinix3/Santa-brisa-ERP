
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import { TestTube2 } from 'lucide-react';

export default function QualityReleasePage() {
    return (
        <SBCard title="Laboratorio / Liberación de Lotes">
            <div className="p-8 text-center">
                <TestTube2 className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">En Construcción</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Aquí aparecerán los lotes en cuarentena listos para su análisis y liberación.
                </p>
            </div>
        </SBCard>
    )
}
