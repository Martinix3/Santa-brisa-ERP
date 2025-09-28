// src/app/(app)/quality/traceability/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import { searchLots, type LotHit } from "@/services/lots/searchLots";
import { Package, Search, ChevronsRight, GitBranch } from "lucide-react";
import type { SantaData } from "@/domain/ssot";

// ===========================================
// Traceability UI Components
// ===========================================

function TraceEventCard({ event }: { event: any }) {
    return (
        <div className="flex items-start gap-3 p-3 border-b">
            <div className="p-2 bg-zinc-100 rounded-lg mt-1">
                <GitBranch size={16} className="text-zinc-600" />
            </div>
            <div>
                <p className="font-semibold text-sm capitalize">{event.kind.toLowerCase().replace(/_/g, ' ')}</p>
                <p className="text-xs text-zinc-500">{new Date(event.at).toLocaleString('es-ES')}</p>
                <p className="text-sm text-zinc-700 mt-1">{event.title}</p>
                {event.details && <p className="text-xs text-zinc-500 mt-1">{event.details}</p>}
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
    const [lotHits, setLotHits] = useState<LotHit[]>([]);
    const [selectedLot, setSelectedLot] = useState<LotHit | null>(null);
    const [traceEvents, setTraceEvents] = useState<any[]>([]);

    const items = useMemo(() => {
        if (!data?.items) return [];
        // Quitamos el filtro para que se pueda trazar cualquier cosa
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
        if (lotsForItem.length > 0) {
            setLotNumber(lotsForItem[0].lotNumber);
        } else {
            setLotNumber('');
        }
    }, [lotsForItem]);

    useEffect(() => {
        if (data && lotNumber) {
            const hit = searchLots(data, { text: lotNumber })[0];
            setSelectedLot(hit);
            // Re-implementar normalizeLotHistory si es necesario, o usar una nueva función
            // const history = normalizeLotHistory(hit, data);
            // setTraceEvents(history);
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
                        onChange={(e) => setItemId(e.target.value)}
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
                            {traceEvents.length > 0 ? (
                                traceEvents.map(event => <TraceEventCard key={event.id} event={event} />)
                            ) : (
                                <div className="text-center text-zinc-500 p-8">
                                    <p>No hay eventos de trazabilidad para este lote.</p>
                                    <p className="text-xs mt-2">(La función de historial detallado está en construcción)</p>
                                </div>
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