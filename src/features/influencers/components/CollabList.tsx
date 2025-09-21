
"use client";

import React, { useState, useEffect } from 'react';
import type { InfluencerCollab } from '@/domain';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Plus, Search, User, Instagram, Sparkles, Mail, Phone, MapPin } from 'lucide-react';
import { listCollabs } from '@/features/production/ssot-bridge';

type InfStatus = InfluencerCollab['status'];

// --- Helpers de UI ---

function StatusPill({ status }: { status: InfStatus }) {
    const styles: Record<InfStatus, string> = {
        PROSPECT: 'bg-zinc-100 text-zinc-700',
        OUTREACH: 'bg-blue-100 text-blue-700',
        NEGOTIATING: 'bg-yellow-100 text-yellow-800',
        AGREED: 'bg-purple-100 text-purple-800',
        LIVE: 'bg-green-100 text-green-800 animate-pulse',
        COMPLETED: 'bg-green-100 text-green-800',
        PAUSED: 'bg-gray-100 text-gray-600',
        DECLINED: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status}
        </span>
    );
}

const getRoiClass = (roi: number) => (roi > 2 ? 'text-green-600' : roi > 0 ? 'text-amber-600' : 'text-zinc-500');

// --- Fila de Colaboración ---

function CollabRow({ collab, isOpen, onToggle }: { collab: InfluencerCollab, isOpen: boolean, onToggle: () => void }) {
    const roi = (collab.tracking?.revenue || 0) / ((collab.costs?.cashPaid || 0) + (collab.costs?.productCost || 0) + (collab.costs?.shippingCost || 0) || 1);

    return (
        <div className="border-b border-zinc-100">
            <button
                onClick={onToggle}
                className="w-full text-left grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr] items-center gap-3 px-3 py-3 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 rounded-md"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                    <User className="h-4 w-4 text-zinc-500"/>
                    {collab.creatorName}
                </div>
                <div className="text-sm text-zinc-600 flex items-center gap-1">
                    {collab.platform === "Instagram" ? <Instagram className="h-4 w-4 text-pink-500"/> : <Sparkles className="h-4 w-4 text-blue-500"/>}
                    {collab.platform}
                </div>
                <div className="text-sm text-zinc-600 capitalize">{collab.tier}</div>
                <div className="text-sm text-zinc-600">
                    {collab.dates?.goLiveAt ? new Date(collab.dates.goLiveAt).toLocaleDateString('es-ES') : 'N/A'}
                </div>
                <div><StatusPill status={collab.status} /></div>
                <div className={`text-sm text-right font-medium ${getRoiClass(roi)}`}>
                    {roi.toFixed(2)}x
                </div>
            </button>
            {isOpen && (
                <div className="px-6 pb-4">
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-zinc-50 p-4 rounded-lg">
                        <div className="flex items-start gap-2"><Mail className="h-4 w-4 text-zinc-500 mt-0.5"/><div><div className="text-[11px] uppercase text-zinc-500">Email</div><div className="text-zinc-800">email@example.com</div></div></div>
                        <div className="flex items-start gap-2"><Phone className="h-4 w-4 text-zinc-500 mt-0.5"/><div><div className="text-[11px] uppercase text-zinc-500">Teléfono</div><div className="text-zinc-800">+34 600 111 222</div></div></div>
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-zinc-500 mt-0.5"/><div><div className="text-[11px] uppercase text-zinc-500">Dirección</div><div className="text-zinc-800">Calle Falsa 123, Madrid</div></div></div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Componente Principal ---

export function CollabList() {
    const [collabs, setCollabs] = useState<InfluencerCollab[]>([]);
    const [openRow, setOpenRow] = useState<string | null>(null);

    useEffect(() => { 
        listCollabs().then(setCollabs); 
    }, []);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Colaboraciones con Influencers</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
                        <input className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm w-64" placeholder="Buscar…"/>
                    </div>
                    <SBButton><Plus size={16}/> Nueva Colaboración</SBButton>
                </div>
            </div>
            <SBCard title="Listado de Colaboraciones">
                <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 border-b">
                    <span>Influencer</span>
                    <span>Canal</span>
                    <span>Tier</span>
                    <span>Fecha</span>
                    <span>Estado</span>
                    <span className="text-right">ROI</span>
                </div>
                {collabs.map(collab => (
                    <CollabRow
                        key={collab.id}
                        collab={collab}
                        isOpen={openRow === collab.id}
                        onToggle={() => setOpenRow(openRow === collab.id ? null : collab.id)}
                    />
                ))}
            </SBCard>
        </div>
    );
}
