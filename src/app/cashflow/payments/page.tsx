
"use client";
import React from 'react';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import { FileText } from 'lucide-react';

export default function PaymentsPage() {
    return (
        <SBCard title="Cuentas por Pagar" accent={SB_COLORS.finance}>
            <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">Módulo de Pagos</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Esta sección mostrará un listado detallado de todas las facturas de proveedores pendientes de pago.
                </p>
            </div>
        </SBCard>
    )
}
