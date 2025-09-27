// src/app/(app)/production/traceability/page.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { TraceEvent, TraceEventPhase, User, Item } from '@/domain/ssot';
import { SBCard, SBButton, Input } from '@/components/ui/ui-primitives';
import { Waypoints, Search, Factory, FlaskConical, Truck, Package, ShoppingCart, User as UserIcon } from 'lucide-react';
import { DEPT_META, phaseStyle } from '@/domain/ssot';
import { Avatar } from '@/components/ui/Avatar';

const ICONS: Record<TraceEventPhase, React.ElementType> = {
    SOURCE: Package,
    RECEIPT: Truck,
    QC: FlaskConical,
    PRODUCTION: Factory,
    PACK: Package,
    WAREHOUSE: Package,
    SALE: ShoppingCart,
    DELIVERY: Truck,
};

function TraceTimeline({ events, usersById, itemsById }: { events: TraceEvent[], usersById: Map<string, User>, itemsById: Map<string, Item> }) {
    if (events.length === 0) {
        return <div className="text-center py-12 text-zinc-500">No se encontraron eventos para este lote.</div>;
    }
    
    return (
        <div className="space-y-6">
            {events.map(event => {
                const style = phaseStyle(event.phase);
                const Icon = ICONS[event.phase] || Waypoints;
                const user = event.actorId ? usersById.get(event.actorId) : null;
                
                return (
                    <div key={event.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg, color: style.text }}>
                                <Icon size={20} />
                            </div>
                            <div className="w-px h-16" style={{ background: `linear-gradient(to bottom, ${style.bg}, #e5e7eb)` }}/>
                        </div>
                        <div className="flex-1 pt-1.5">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-zinc-800">{event.kind}</p>
                                <p className="text-xs text-zinc-500">{new Date(event.occurredAt).toLocaleString('es-ES')}</p>
                            </div>
                            <div className="text-sm text-zinc-600 mt-1">Fase: {event.phase}</div>
                            {user && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Avatar name={user.name} size="md" />
                                    <span className="text-xs text-zinc-500">{user.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

export default function TraceabilityPage() {
    const { data } = useData();
    const [lotNumber, setLotNumber] = useState('');
    const [searchedLot, setSearchedLot] = useState<string | null>(null);

    const { events, usersById, itemsById } = useMemo(() => {
        if (!data || !searchedLot) {
            return { events: [], usersById: new Map(), itemsById: new Map() };
        }
        
        const filteredEvents = (data.traceEvents || [])
            .filter(e => e.links?.lotNumber === searchedLot)
            .sort((a,b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

        const uById = new Map<string, User>();
        (data.users || []).forEach(u => uById.set(u.id, u));

        const iById = new Map<string, Item>();
        (data.items || []).forEach(i => iById.set(i.id, i));

        return { events: filteredEvents, usersById: uById, itemsById: iById };
    }, [data, searchedLot]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchedLot(lotNumber);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3">
                        <Waypoints /> Trazabilidad de Lotes
                    </h1>
                     <p className="text-sm text-zinc-600 mt-1">Busca un lote para ver su historial completo, desde el origen hasta la entrega.</p>
                </div>
                <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input 
                            value={lotNumber}
                            onChange={e => setLotNumber(e.target.value)}
                            placeholder="Introduce un número de lote..."
                            className="pl-9 w-full md:w-80"
                        />
                    </div>
                    <SBButton type="submit">Buscar</SBButton>
                </form>
            </div>

            <SBCard title={searchedLot ? `Historial del Lote: ${searchedLot}` : "Resultados de Trazabilidad"}>
                <div className="p-6">
                   {searchedLot ? (
                        <TraceTimeline events={events} usersById={usersById} itemsById={itemsById} />
                   ) : (
                        <div className="text-center py-12 text-zinc-500">
                            Introduce un número de lote para empezar.
                        </div>
                   )}
                </div>
            </SBCard>
        </div>
    );
}
