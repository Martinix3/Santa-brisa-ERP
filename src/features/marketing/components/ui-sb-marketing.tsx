
// src/features/marketing/components/ui-sb-marketing.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { listEvents, listActivations, listOnlineCampaigns } from '@/app/marketing/_components/ssot-bridge';
import type { EventMarketing, Activation, OnlineCampaign } from '@/domain/ssot';
import { SBCard, SBButton, KPI, DataTableSB, Col, SB_COLORS } from '@/components/ui/ui-primitives';
import { Megaphone, Calendar, Zap, Wifi, Target, BarChart, CheckCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

export function MarketingNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/marketing/dashboard', label: 'Dashboard' },
        { href: '/marketing/events', label: 'Eventos' },
        { href: '/marketing/online', label: 'Campañas Online' },
    ];

    return (
        <div className="flex gap-6">
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                        'py-3 border-b-2 text-sm font-medium transition-colors',
                        pathname === item.href
                            ? 'border-sb-agua text-sb-agua'
                            : 'border-transparent text-sb-neutral-500 hover:text-sb-neutral-700 hover:border-sb-neutral-300'
                    )}
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );
}

function StatusPill({ status }: { status: 'planned' | 'active' | 'closed' | 'cancelled' }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export function MarketingDashboardPage() {
    const { data } = useData();
    const events = data?.mktEvents || [];
    const campaigns = data?.onlineCampaigns || [];

    const kpis = {
        activeEvents: events.filter(e => e.status === 'active').length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalBudget: campaigns.reduce((acc, c) => acc + c.budget, 0),
    };

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-semibold text-zinc-800">Dashboard de Marketing</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPI label="Eventos Activos" value={kpis.activeEvents.toString()} delta="+1 esta semana" />
                <KPI label="Campañas Online Activas" value={kpis.activeCampaigns.toString()} />
                <KPI label="Presupuesto Total Online" value={`€${kpis.totalBudget.toLocaleString()}`} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Próximos Eventos" accent={SB_COLORS.marketing}>
                    {events.filter(e => e.status === 'planned' || e.status === 'active').slice(0, 5).map(event => (
                        <div key={event.id} className="p-3 border-b last:border-b-0">
                            <p className="font-semibold">{event.title}</p>
                            <div className="flex justify-between items-center text-sm text-zinc-600 mt-1">
                                <span>{new Date(event.startAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} en {event.city}</span>
                                <StatusPill status={event.status} />
                            </div>
                        </div>
                    ))}
                </SBCard>
                <SBCard title="Campañas Online" accent={SB_COLORS.marketing}>
                     {campaigns.slice(0, 5).map(campaign => (
                        <div key={campaign.id} className="p-3 border-b last:border-b-0">
                            <p className="font-semibold">{campaign.title}</p>
                            <div className="flex justify-between items-center text-sm text-zinc-600 mt-1">
                                <span>{campaign.channel} &middot; €{campaign.budget}</span>
                                <StatusPill status={campaign.status} />
                            </div>
                        </div>
                    ))}
                </SBCard>
            </div>
        </div>
    )
}
