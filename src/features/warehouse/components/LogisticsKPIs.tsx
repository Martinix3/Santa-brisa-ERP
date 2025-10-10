// src/features/warehouse/components/LogisticsKPIs.tsx
"use client";
import React, { useMemo } from 'react';
import type { Shipment } from '@/domain/ssot';
import { Truck, PackageCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';

function KPI({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) {
    return (
        <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600">
                <Icon size={24} />
            </div>
            <div>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                <p className="text-sm font-medium text-zinc-600">{label}</p>
            </div>
        </div>
    );
}

export function LogisticsKPIs({ shipments }: { shipments: Shipment[] }) {
    const kpis = useMemo(() => ({
        pending: shipments.filter(r => r.status === "DRAFT").length,
        validated: shipments.filter(r => r.status === "READY").length,
        shipped: shipments.filter(r => r.status === "SHIPPED").length,
        delivered: shipments.filter(r => r.status === 'DELIVERED').length
    }), [shipments]);

    return (
        <SBCard>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI icon={Truck} label="Envíos Pendientes" value={kpis.pending} />
                <KPI icon={PackageCheck} label="Listos para Enviar" value={kpis.validated} />
                <KPI icon={AlertCircle} label="En Tránsito" value={kpis.shipped} />
                <KPI icon={CheckCircle} label="Entregados (últ. 7d)" value={kpis.delivered} />
            </div>
        </SBCard>
    );
}
