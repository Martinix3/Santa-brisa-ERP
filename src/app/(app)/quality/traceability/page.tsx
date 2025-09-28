// src/app/(app)/quality/traceability/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import { useData } from "@/lib/dataprovider";
import { searchLots, type LotHit } from "@/services/lots/searchLots";
import { Package, Search, GitBranch, Truck, Factory, FlaskConical, ArrowLeftRight, AlertTriangle } from "lucide-react";
import type { SantaData } from "@/domain/ssot";
import { getLotTraceability, type TraceEvent } from "./actions"; // <-- Importa la nueva acción
import { toast } from "sonner";


// ===========================================
// Traceability UI Components
// ===========================================

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; }> = {
    receipt: { icon: Truck, color: 'text-sky-600 bg-sky-100' },
    production_in: { icon: Factory, color: 'text-emerald-600 bg-emerald-100' },
    production_out: { icon: Factory, color: 'text-amber-600 bg-amber-100' },
    shipment: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    sale: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    ship: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    adjustment: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    transfer: { icon: ArrowLeftRight, color: 'text-zinc-600 bg-zinc-100' },
    qc_test: { icon: FlaskConical, color: 'text-indigo-600 bg-indigo-100' },
    genealogy_parent: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    genealogy_child: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    DEFAULT: { icon: Package, color: 'text-zinc-600 bg-zinc-100' },
};

function TraceEventCard({ event }: { event: TraceEvent }) {
    const config = EVENT_CONFIG[event.kind] || EVENT_CONFIG.DEFAULT;
    const Icon = config.icon;

    return (
        <div className="flex items-start gap-4 p-3 border-b last:border-b-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg grid place-items-center mt-1 ${config.color}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="font-semibold text-sm">{event.title}</p>
                <p className="text-xs text-zinc-500">{new Date(event.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="text-sm text-zinc-700 mt-1">{event.details}</p>
            </div>
        </div>
    );
}

// ===========================================
// Main Traceability Page Component
// ===========================================

export default function TraceabilityPage() {
    const { data } = useData();
    const [itemId, setItemId] = useState<string>('');
    const [lotNumber, setLotNumber] = useState<string>('');
    const [selectedLot, setSelectedLot] = useState<LotHit | null>(null);
    const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
    const [isTracing, startTraceTransition] = useTransition();

    const items = useMemo(() => {
        if (!data?.items) return [];
        return data.items.sort((a,b) => a.name.localeCompare(b.name));
    }, [data?.items]);

    const lotsForItem = useMemo(() => {
        if (!itemId || !data) return [];
        return searchLots(data, { itemIds: [itemId], includeConsumed: true, sort: "CREATED_AT" });
    }, [itemId, data]);

    useEffect(() => {
        if (items.length > 0 && !itemId) {
            setItemId(items[0].id);
        }
    }, [items, itemId]);

    useEffect(() => {
        if (lotsForItem.length > 0 && !lotNumber) {
            setLotNumber(lotsForItem[0].lotNumber);
        } else if (lotsForItem.length === 0) {
            setLotNumber('');
        }
    }, [lotsForItem, lotNumber]);

    useEffect(() => {
        if (lotNumber) {
            const hit = searchLots(data, { text: lotNumber })[0];
            setSelectedLot(hit);
            
            startTraceTransition(async () => {
                const result = await getLotTraceability(lotNumber);
                if (result.ok) {
                    setTraceEvents(result.data);
                } else {
                    toast.error(result.message);
                    setTraceEvents([]);
                }
            });
        } else {
            setSelectedLot(null);
            setTraceEvents([]);
        }
    }, [lotNumber, data]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Panel de Búsqueda */}
            <div className="md:col-span-1 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-xl border">
                    <label htmlFor="item-select" className="text-sm font-semibold text-zinc-700">Producto a Trazar</label>
                    <select
                        id="item-select"
                        value={itemId}
                        onChange={(e) => {
                            setItemId(e.target.value);
                            setLotNumber(''); // Reset lot selection when item changes
                        }}
                        className="mt-2 w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Selecciona un producto</option>
                        {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </div>

                <div className="flex-1 bg-white p-4 rounded-xl border overflow-y-auto">
                    <h3 className="text-sm font-semibold text-zinc-700">Lotes para <span className="font-bold">{items.find(i=>i.id===itemId)?.name}</span></h3>
                    <div className="mt-2 space-y-2">
                        {lotsForItem.map(lot => (
                            <button
                                key={lot.lotNumber}
                                onClick={() => setLotNumber(lot.lotNumber)}
                                className={`w-full text-left p-2 rounded-lg transition-colors ${lotNumber === lot.lotNumber ? 'bg-blue-100 text-blue-800' : 'hover:bg-zinc-100'}`}
                            >
                                <p className="font-mono text-xs font-semibold">{lot.lotNumber}</p>
                                <p className="text-xs text-zinc-500">
                                    {lot.createdAt ? new Date(lot.createdAt).toLocaleDateString('es-ES') : 'Fecha desconocida'}
                                </p>
                            </button>
                        ))}
                         {lotsForItem.length === 0 && <p className="text-xs text-center text-zinc-500 py-4">No hay lotes para este producto.</p>}
                    </div>
                </div>
            </div>

            {/* Panel de Resultados */}
            <div className="md:col-span-2 bg-white p-4 rounded-xl border overflow-y-auto">
                {selectedLot ? (
                    <div>
                        <h2 className="text-lg font-bold">Trazabilidad del Lote: {selectedLot.lotNumber}</h2>
                        <div className="mt-4">
                            {isTracing ? (
                                <p className="text-zinc-500 text-center py-8">Buscando historial...</p>
                            ) : traceEvents.length > 0 ? (
                                <div className="border-t">
                                    {traceEvents.map(event => <TraceEventCard key={event.id} event={event} />)}
                                </div>
                            ) : (
                                <p className="text-zinc-500 text-center py-8">No se encontraron eventos de trazabilidad para este lote.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <Package size={48} className="mb-4" />
                        <h3 className="text-lg font-semibold">Selecciona un lote</h3>
                        <p className="text-sm">Elige un producto y un lote para ver su historial completo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
