"use client";
import React from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, SBCard, DataTableSB, Col, STATUS_STYLES } from '@/components/ui/ui-primitives';
import type { OnlineCampaign } from '@/domain/ssot';

function StatusPill({ status }: { status: 'planned' | 'active' | 'closed' | 'cancelled' }) {
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

const formatCurrency = (num?: number) => num?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) || 'N/A';
const formatNumber = (num?: number) => num?.toLocaleString('es-ES') || 'N/A';

export default function OnlineCampaignsPage(){
  const { data: santaData } = useData();
  const campaigns = santaData?.onlineCampaigns || [];

  const cols: Col<OnlineCampaign>[] = [
    { key: 'title', header: 'Campaña', render: r => <div className="font-semibold">{r.title}</div> },
    { key: 'channel', header: 'Canal', render: r => r.channel },
    { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
    { key: 'budget', header: 'Presupuesto', className: "justify-end", render: r => formatCurrency(r.budget) },
    { key: 'spend', header: 'Gasto', className: "justify-end", render: r => formatCurrency(r.spend) },
    { key: 'impressions', header: 'Impresiones', className: "justify-end", render: r => formatNumber(r.metrics?.impressions) },
    { key: 'clicks', header: 'Clicks', className: "justify-end", render: r => formatNumber(r.metrics?.clicks) },
    { key: 'roas', header: 'ROAS', className: "justify-end font-semibold", render: r => r.metrics?.roas ? `${r.metrics.roas.toFixed(2)}x` : 'N/A' },
  ];

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-zinc-800">Campañas de Publicidad Online</h1>
            <SBButton>
                Nueva Campaña
            </SBButton>
        </div>
        <SBCard title="Resultados de Campañas Online">
             <DataTableSB rows={campaigns} cols={cols as any} />
        </SBCard>
    </div>
  );
}
