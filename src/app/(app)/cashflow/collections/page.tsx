
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import { SB_COLORS } from '@/domain/ssot';
import { FileText } from 'lucide-react';

export default function CollectionsPage() {
    return (
        <SBCard title="Cuentas por Cobrar" accent={SB_COLORS.primary.teal}>
            <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">Módulo de Cobros</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Esta sección mostrará un listado detallado de todas las facturas pendientes de cobro.
                </p>
            </div>
        </SBCard>
    )
}
