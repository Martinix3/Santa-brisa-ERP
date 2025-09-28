// src/app/(app)/quality/traceability/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import { useData } from "@/lib/dataprovider";
import { Package, Search, GitBranch, Truck, Factory, FlaskConical, ArrowLeftRight, AlertTriangle, User as UserIcon, FileText, CheckCircle, XCircle } from "lucide-react";
import type { Lot, Item } from "@/domain/ssot";
import { getLotTraceability, type TraceEvent } from "./actions";
import { toast } from "sonner";
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';


// ===========================================
// CONFIGURACIÓN DE ICONOS (CORREGIDA)
// ===========================================
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; }> = {
    RECEIPT: { icon: Truck, color: 'text-sky-600 bg-sky-100' },
    PRODUCTION_IN: { icon: Factory, color: 'text-emerald-600 bg-emerald-100' },
    PRODUCTION_OUT: { icon: Factory, color: 'text-amber-600 bg-amber-100' },
    SHIP: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    SALE: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    ADJUSTMENT: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    TRANSFER: { icon: ArrowLeftRight, color: 'text-zinc-600 bg-zinc-100' },
    QC_TEST: { icon: FlaskConical, color: 'text-indigo-600 bg-indigo-100' },
    GENEALOGY_PARENT: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    GENEALOGY_CHILD: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    DEFAULT: { icon: Package, color: 'text-zinc-600 bg-zinc-100' },
};


// ===========================================
// MINI-COMPONENTES DE DETALLE
// ===========================================
function ProductionEventDetails({ data }: { data?: Record<string, any> }) {
    const { data: santaData } = useData();
    const responsible = useMemo(() => {
        if (!data?.responsibleId || !santaData?.users) return null;
        return santaData.users.find(u => u.id === data.responsibleId);
    }, [data, santaData?.users]);

    if (!data) return null;

    return (
        <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-md">
                <FileText size={14} className="text-zinc-400" />
                <span>Orden: <Link href={`/production/execution?orderId=${data.orderId}`} className="font-medium text-blue-600 hover:underline">{data.orderName || data.orderId}</Link></span>
                {responsible && (
                    <div className="flex items-center gap-2 ml-auto" title={`Responsable: ${responsible.name}`}>
                       <Avatar name={responsible.name} size="md" />
                    </div>
                )}
            </div>
            {data.incidents?.length > 0 && (
                 <div className="flex items-start gap-2 p-2 bg-red-50 text-red-700 rounded-md">
                    <AlertTriangle size={14} className="mt-0.5" />
                    <div>
                        <span className="font-semibold">Incidencias:</span>
                        <ul className="list-disc list-inside">
                            {data.incidents.map((inc: any, i: number) => <li key={i}>{inc.summary || 'Incidencia registrada'}</li>)}
                        </ul>
                    </div>
                 </div>
            )}
        </div>
    );
}

function QcTestEventDetails({ data }: { data?: Record<string, any> }) {
     if (!data) return null;
     const inSpec = data.inSpec === true || data.inSpec === undefined; // Consideramos OK si no está explícitamente a false
     return (
        <div className={`mt-2 text-xs flex items-center gap-2 p-2 rounded-md ${inSpec ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {inSpec ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span className="font-semibold">{data.parameterId}:</span>
            <span>{data.value}</span>
            {data.testedBy && <span className="ml-auto text-zinc-500">por {data.testedBy}</span>}
        </div>
     );
}

function TraceEventCard({ event }: { event: TraceEvent }) {
    const config = EVENT_CONFIG[event.kind.toUpperCase()] || EVENT_CONFIG.DEFAULT;
    const Icon = config.icon;

    return (
        <div className="flex items-start gap-4 p-3 border-b last:border-b-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg grid place-items-center mt-1 ${config.color}`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <p className="font-semibold text-sm">{event.title}</p>
                <p className="text-xs text-zinc-500">{new Date(event.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="text-sm text-zinc-700 mt-1">{event.details}</p>
                
                {/* ===== LÓGICA DEL DESPACHADOR ===== */}
                {(event.kind === 'PRODUCTION_OUT' || event.kind === 'PRODUCTION_IN') && <ProductionEventDetails data={event.data} />}
                {event.kind === 'QC_TEST' && <QcTestEventDetails data={event.data} />}
            </div>
        </div>
    );
}

// ===========================================
// PÁGINA PRINCIPAL
// ===========================================
export default function TraceabilityPage() {
    const { data } = useData();
    const [itemId, setItemId] = useState<string>('');
    const [lotNumber, setLotNumber] = useState<string>('');
    const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
    const [isTracing, startTraceTransition] = useTransition();

    const items = useMemo(() => {
        return (data?.items || []).sort((a,b) => a.name.localeCompare(b.name));
    }, [data?.items]);

    // ================================================================
    // LÓGICA DE BÚSQUEDA DE LOTES (CORREGIDA)
    // ================================================================
    const lotsForItem = useMemo(() => {
        if (!itemId || !data?.lots) return [];
        // La fuente de verdad es la colección `lots`, no el inventario `onHand`.
        return data.lots
            .filter(lot => lot.itemId === itemId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [itemId, data?.lots]);

    useEffect(() => {
        if (items.length > 0 && !itemId) {
            setItemId(items[0].id);
        }
    }, [items, itemId]);

    useEffect(() => {
        // Selecciona el primer lote de la lista si no hay ninguno seleccionado
        if (lotsForItem.length > 0 && !lotNumber) {
            setLotNumber(lotsForItem[0].lotNumber);
        } else if (lotsForItem.length === 0) {
            setLotNumber('');
        }
    }, [lotsForItem, lotNumber]);
    
    useEffect(() => {
        if (lotNumber) {
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
            setTraceEvents([]);
        }
    }, [lotNumber]);
    
    const selectedLot = useMemo(() => {
        return data?.lots.find(l => l.lotNumber === lotNumber) || null;
    }, [lotNumber, data?.lots]);

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
                            setLotNumber('');
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
