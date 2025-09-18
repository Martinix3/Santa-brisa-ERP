

"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { EventMarketing } from '@/domain/ssot';
import { SBCard, DataTableSB, Col, SB_COLORS } from '@/components/ui/ui-primitives';

function StatusPill({ status }: { status: EventMarketing['status'] }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800 animate-pulse',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

const formatNumber = (num?: number) => num?.toLocaleString('es-ES') || 'N/A';
const formatCurrency = (num?: number) => num?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) || 'N/A';

export default function Page(){
  const { data: santaData } = useData();

  const events = useMemo(() => santaData?.mktEvents || [], [santaData]);

  const cols: Col<EventMarketing>[] = [
    { key: 'title', header: 'Evento', render: r => <div className="font-semibold">{r.title}</div> },
    { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
    { key: 'startAt', header: 'Fecha', render: r => new Date(r.startAt).toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'}) },
    { key: 'city', header: 'Ubicación', render: r => r.city || 'N/A'},
    { key: 'spend', header: 'Gasto', className: "justify-end", render: r => formatCurrency(r.spend) },
    { key: 'leads', header: 'Leads', className: "justify-end", render: r => formatNumber(r.goal?.leads) },
    { key: 'sampling', header: 'Asistentes', className: "justify-end", render: r => formatNumber(r.goal?.sampling) },
  ];

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-zinc-800">Histórico de Eventos y Activaciones</h1>
            <p className="text-sm text-zinc-500">
                Los nuevos eventos se crean desde la Agenda.
            </p>
        </div>
        <SBCard title="Resultados de Eventos de Marketing" accent={SB_COLORS.marketing}>
             <DataTableSB rows={events} cols={cols as any} />
        </SBCard>
    </div>
  );
}
