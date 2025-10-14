// src/app/(app)/quality/traceability/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import { Package, Search, GitBranch, Truck, Factory, FlaskConical, ArrowLeftRight, AlertTriangle, User as UserIcon, FileText, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import type { 
    Lot, 
    Item, 
    TraceData, 
    ProductionSummary, 
    MaterialConsumption, 
    QualitySummary,
    TraceEvent
} from "@/domain/ssot";
import { getLotTraceability } from "./actions";
import { toast } from "sonner";
import Link from 'next/link';
import { useData } from "@/lib/dataprovider";
import { Avatar } from '@/components/ui/Avatar';


// ===========================================
// CONFIGURACIÓN DE ICONOS
// ===========================================
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; }> = {
    RECEIPT: { icon: Truck, color: 'text-sky-600 bg-sky-100' },
    ARRIVED: { icon: Truck, color: 'text-sky-600 bg-sky-100' },
    PRODUCTION_IN: { icon: Factory, color: 'text-emerald-600 bg-emerald-100' },
    PRODUCTION_OUT: { icon: Factory, color: 'text-amber-600 bg-amber-100' },
    SHIP: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    SALE: { icon: Truck, color: 'text-rose-600 bg-rose-100' },
    ADJUSTMENT: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    TRANSFER: { icon: ArrowLeftRight, color: 'text-zinc-600 bg-zinc-100' },
    QC_TEST: { icon: FlaskConical, color: 'text-indigo-600 bg-indigo-100' },
    QC_DECISION: { icon: FlaskConical, color: 'text-indigo-600 bg-indigo-100' },
    APPROVED: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    REJECTED: { icon: XCircle, color: 'text-red-600 bg-red-100' },
    GENEALOGY_PARENT: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    GENEALOGY_CHILD: { icon: GitBranch, color: 'text-slate-600 bg-slate-100' },
    DEFAULT: { icon: Package, color: 'text-zinc-600 bg-zinc-100' },
};

// ===========================================
// MINI-COMPONENTES DE DETALLE
// ===========================================
function ProductionEventDetails({ data }: { data?: Record<string, any> }) {
    if (!data || !data.orderId) return null;
    return (
        <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-md">
                <FileText size={14} className="text-zinc-400" />
                <span>Orden: <Link href={`/production/execution?orderId=${data.orderId}`} className="font-medium text-blue-600 hover:underline">{data.orderName || data.orderId}</Link></span>
                {data.responsible && (
                    <div className="flex items-center gap-2 ml-auto" title={`Responsable: ${data.responsible}`}>
                       <Avatar name={data.responsible} size="md" />
                    </div>
                )}
            </div>
        </div>
    );
}

function QcTestEventDetails({ data }: { data?: Record<string, any> }) {
     if (!data) return null;
     const inSpec = data.inSpec === true || data.inSpec === undefined;
     return (
        <div className={`mt-2 text-xs flex items-center gap-2 p-2 rounded-md ${inSpec ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {inSpec ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span className="font-semibold">{data.parameterId}:</span>
            <span>{data.value}</span>
            {data.testedBy && <span className="ml-auto text-zinc-500">por {data.testedBy}</span>}
        </div>
     );
}

function QcDecisionEventDetails({ event, data }: { event: TraceEvent, data?: Record<string, any> }) {
    if (!data) return null;
    const isApproved = data.decision === 'PASSED' || event.title?.toLowerCase().includes('aprobado') || event.title?.toLowerCase().includes('liberado') || event.title?.toLowerCase().includes('passed');
    const results = data.results || data.analysisResults || {};
    const observations = data.observations || data.notes;
    const reviewer = data.reviewer || data.approvedBy || data.rejectedBy;

    return (
        <div className="mt-3 space-y-2">
            {Object.keys(results).length > 0 && (
                <div className="border rounded-lg p-3 bg-zinc-50">
                    <p className="text-xs font-semibold text-zinc-700 mb-2">Resultados Analíticos:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(results).map(([param, value]) => (
                            <div key={param} className="text-xs flex justify-between p-2 bg-white rounded border">
                                <span className="font-medium">{param}:</span>
                                <span className="font-mono">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {observations && (
                <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                    <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1"><FileText size={12} />Observaciones:</p>
                    <p className="text-xs text-amber-800">{observations}</p>
                </div>
            )}
            {reviewer && (
                <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${isApproved ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <UserIcon size={14} />
                    <span className="font-semibold">Revisado por:</span>
                    <span>{reviewer}</span>
                    {isApproved ? <CheckCircle size={14} className="ml-auto" /> : <XCircle size={14} className="ml-auto" />}
                </div>
            )}
        </div>
    );
}

function TraceEventCard({ event }: { event: TraceEvent }) {
    if (!event || !event.kind) return null;
    const config = EVENT_CONFIG[event.kind?.toUpperCase()] || EVENT_CONFIG.DEFAULT;
    const Icon = config.icon;
    
    return (
        <div className="flex items-start gap-4 p-3 border-b last:border-b-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg grid place-items-center mt-1 ${config.color}`}><Icon size={20} /></div>
            <div className="flex-1">
                <p className="font-semibold text-sm">{event.title || 'Evento sin título'}</p>
                <p className="text-xs text-zinc-500">{event.at ? new Date(event.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha desconocida'}</p>
                {event.details && <p className="text-sm text-zinc-700 mt-1">{event.details}</p>}
                {(event.kind === 'PRODUCTION_OUT' || event.kind === 'PRODUCTION_IN') && event.data && <ProductionEventDetails data={event.data} />}
                {event.kind === 'QC_TEST' && event.data && <QcTestEventDetails data={event.data} />}
                {(event.data && ('decision' in event.data || 'results' in event.data || 'reviewer' in event.data)) && <QcDecisionEventDetails event={event} data={event.data} />}
            </div>
        </div>
    );
}

// ===========================================
// COMPONENTES PRINCIPALES DEL INFORME
// ===========================================

function LotSummaryCard({ traceData, items, parties }: { traceData: TraceData, items: Item[], parties: any[] }) {
    const { lot, receiptInfo, productionSummary, saleInfo, onHandSummary } = traceData;
    if (!lot) return null;
    const item = items.find(i => i.sku === lot.sku);
    const categoryName = 'N/A';
    const locations = (onHandSummary || []).filter(oh => oh.qty > 0).map(oh => `${oh.warehouseId} (${oh.qty})`).join(', ');
    const supplierName = parties.find(p => p.id === receiptInfo?.supplierPartyId)?.name;

    return (
        <div className="mb-6 p-4 bg-zinc-50 rounded-xl border">
            <h3 className="text-base font-semibold mb-3">Dossier del Lote</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-zinc-500">Estado de Calidad</p><p className="font-medium">{lot.qcStatus}</p></div>
                <div><p className="text-xs text-zinc-500">Categoría</p><p className="font-medium">{categoryName}</p></div>
                <div><p className="text-xs text-zinc-500">Stock Actual</p><p className="font-medium">{locations || 'Sin stock'}</p></div>
                {receiptInfo && <div><p className="text-xs text-zinc-500">Origen</p><p className="font-medium">{supplierName || receiptInfo.supplierPartyId}</p></div>}
                {productionSummary && <div><p className="text-xs text-zinc-500">Orden de Prod.</p><Link href={`/production/execution?orderId=${productionSummary.orderId}`} className="font-medium text-blue-600 hover:underline">{productionSummary.orderName}</Link></div>}
                {saleInfo && <div><p className="text-xs text-zinc-500">Destino</p><p className="font-medium">{saleInfo.customerName}</p></div>}
            </div>
        </div>
    );
}

function QualitySummaryCard({ summary }: { summary: QualitySummary }) {
    const isApproved = summary.finalDecision === 'PASSED' || summary.finalDecision === 'APPROVED';
    const decisionColor = isApproved ? 'bg-green-100 text-green-800' : summary.finalDecision === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
    const DecisionIcon = isApproved ? CheckCircle : summary.finalDecision === 'PENDING' ? AlertTriangle : XCircle;
    
    return (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><ShieldCheck size={18} />Resumen de Calidad</h3>
            <div className="space-y-4">
                <div className={`flex justify-between items-center p-3 rounded-lg ${decisionColor}`}>
                    <div className="flex items-center gap-2">
                        <DecisionIcon size={16} />
                        <span className="font-bold text-sm">Decisión Final: {summary.finalDecision}</span>
                    </div>
                    {summary.decisionBy && (
                        <div className="text-xs text-right">
                            <p>por <strong>{summary.decisionBy}</strong></p>
                            <p>{summary.decisionAt ? new Date(summary.decisionAt).toLocaleString('es-ES') : ''}</p>
                        </div>
                    )}
                </div>
                
                {summary.tests.length > 0 && (
                     <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-semibold text-zinc-700 mb-2">Análisis Realizados:</p>
                        <div className="space-y-1">
                            {summary.tests.map((test, idx) => {
                                const inSpec = test.inSpec === true || test.inSpec === undefined;
                                return (
                                    <div key={idx} className={`flex justify-between items-center text-xs p-2 rounded ${inSpec ? 'bg-zinc-50' : 'bg-red-50'}`}>
                                        <div className="flex items-center gap-1.5">
                                            {inSpec ? <CheckCircle size={12} className="text-green-500"/> : <XCircle size={12} className="text-red-500"/>}
                                            <span className="font-medium">{test.parameterId}</span>
                                        </div>
                                        <span className="font-mono">{test.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {summary.observations && (
                     <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-amber-900 mb-1">Observaciones</p>
                        <p className="text-xs text-amber-800">{summary.observations}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function GenealogyCard({ traceData, items, lots }: { traceData: TraceData, items: Item[], lots: Lot[] }) {
    const parentEvents = traceData.events.filter(e => e.kind === 'GENEALOGY_PARENT');
    const childEvents = traceData.events.filter(e => e.kind === 'GENEALOGY_CHILD');

    if (parentEvents.length === 0 && childEvents.length === 0) return null;

    const findItemName = (lotNumber: string) => {
        const lot = lots.find(l => l.lotNumber === lotNumber);
        if (!lot) return 'Ítem desconocido';
        const item = items.find(i => i.sku === lot.sku);
        return item?.name || lot.sku;
    }

    return (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><GitBranch size={18} />Genealogía del Lote</h3>
            
            {parentEvents.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-zinc-700 mb-2">🔼 Materias Primas Utilizadas (Padres):</p>
                    <div className="space-y-2">
                        {parentEvents.map(event => (
                            <div key={event.id} className="p-2.5 bg-white rounded-lg border">
                                <p className="text-sm font-semibold">{event.title.includes(':') ? event.title.split(':')[1].trim() : findItemName(event.title.split('desde:')[1]?.trim() || '')}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs font-mono text-zinc-600">{event.title.includes('desde:') ? event.title.split('desde:')[1].trim() : ''}</p>
                                    <p className="text-xs text-zinc-500">{event.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {childEvents.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-zinc-700 mb-2">🔽 Usado para Producir (Hijos):</p>
                    <div className="space-y-2">
                         {childEvents.map(event => (
                            <div key={event.id} className="p-2.5 bg-white rounded-lg border">
                                <p className="text-sm font-semibold">{event.title.includes(':') ? event.title.split(':')[1].trim() : findItemName(event.title.split('para:')[1]?.trim() || '')}</p>
                                <div className="flex justify-between items-center mt-1">
                                     <p className="text-xs font-mono text-zinc-600">{event.title.includes('para:') ? event.title.split('para:')[1].trim() : ''}</p>
                                     <p className="text-xs text-zinc-500">{event.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ProductionSummaryCard({ productionSummary }: { productionSummary: ProductionSummary }) {
    return (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Factory size={18} />Resumen de Producción</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Link href={`/production/execution?orderId=${productionSummary.orderId}`} className="text-sm font-bold text-blue-600 hover:underline">{productionSummary.orderName || productionSummary.orderId}</Link>
                        <p className="text-xs text-zinc-600 mt-1">Responsable: {productionSummary.responsible}</p>
                    </div>
                    {productionSummary.protocols.length > 0 && (<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Protocolos OK: {productionSummary.protocols.filter(Boolean).length}/{productionSummary.protocols.length}</span>)}
                </div>
                <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-2"><Package size={14} />Producción Final</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                        <div><p className="text-zinc-500">Teórica</p><p className="font-bold">{productionSummary.targetQty} unit</p></div>
                        <div><p className="text-zinc-500">Real</p><p className="font-bold">{productionSummary.actualQty} unit</p></div>
                        <div><p className="text-zinc-500">Desviación</p><p className={`font-bold ${productionSummary.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>{productionSummary.deviation > 0 ? '+' : ''}{productionSummary.deviation} ({productionSummary.deviationPct.toFixed(2)}%)</p></div>
                    </div>
                </div>
                {productionSummary.materialsConsumed.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-2"><Package size={14} />Consumo de Materias Primas</p>
                        <div className="space-y-2">
                            {productionSummary.materialsConsumed.map((material, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-50 rounded">
                                    <div className="flex-1"><p className="font-medium">{material.itemName}</p><p className="text-zinc-500 text-[10px]">Lote: {material.lotNumber}</p></div>
                                    <div className="text-right"><p className="font-semibold">{material.qtyUsed} {material.uom}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {productionSummary.incidentCount > 0 && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={14} />{productionSummary.incidentCount} incidente(s) registrado(s)</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConsumptionInProductionCard({ traceData }: { traceData: TraceData }) {
    const consumptionEvents = traceData.events.filter(e => e.kind === 'PRODUCTION_OUT' && e.data?.orderId);
    if (consumptionEvents.length === 0) return null;
    const orderMap = new Map<string, TraceEvent[]>();
    
    consumptionEvents.forEach(event => {
        const orderId = event.data?.orderId;
        if (!orderId) return;
        if (!orderMap.has(orderId)) orderMap.set(orderId, []);
        orderMap.get(orderId)!.push(event);
    });

    return (
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Factory size={18} />Uso en Otras Órdenes de Producción</h3>
            <div className="space-y-4">
                {Array.from(orderMap.entries()).map(([orderId, events]) => (
                    <div key={orderId} className="p-3 bg-white rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <Link href={`/production/execution?orderId=${orderId}`} className="text-sm font-bold text-blue-600 hover:underline">{events[0].data?.orderName || orderId}</Link>
                                {events[0].data?.responsible && (<p className="text-xs text-zinc-500">Responsable: {events[0].data.responsible}</p>)}
                            </div>
                            <span className="text-xs text-zinc-400">{new Date(events[0].at).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-red-700 mb-1">📤 Consumido:</p>
                            {events.map(c => (<p key={c.id} className="text-xs text-zinc-600 ml-2">• {c.title}</p>))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function TraceabilityPage() {
    const { data } = useData();
    const [itemId, setItemId] = useState<string>('');
    const [lotNumber, setLotNumber] = useState<string>('');
    const [traceData, setTraceData] = useState<TraceData | null>(null);
    const [isTracing, startTraceTransition] = useTransition();

    const items = data?.items || [];
    const lots = data?.lots || [];
    const parties = data?.accounts || [];

    const lotsForItem = useMemo(() => {
        if (!itemId) return [];
        const selectedItem = items.find(i => i.id === itemId);
        if (!selectedItem?.sku) return [];
        return lots.filter(lot => lot.sku === selectedItem.sku).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [itemId, lots, items]);

    useEffect(() => {
        if (items.length > 0 && !itemId) setItemId(items[0].id);
    }, [items, itemId]);

    useEffect(() => {
        if (lotsForItem.length > 0 && !lotNumber) setLotNumber(lotsForItem[0].lotNumber);
        else if (lotsForItem.length === 0) setLotNumber('');
    }, [lotsForItem, lotNumber]);
    
    useEffect(() => {
        if (lotNumber) {
            startTraceTransition(async () => {
                const res = await getLotTraceability(lotNumber);
                if (res.ok && res.data) setTraceData(res.data);
                else {
                    const errorMsg = !res.ok && 'message' in res ? res.message : `No se encontraron datos para el lote ${lotNumber}.`;
                    toast.error(errorMsg);
                    setTraceData(null);
                }
            });
        } else {
            setTraceData(null);
        }
    }, [lotNumber]);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            <div className="md:col-span-1 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-xl border">
                    <label htmlFor="item-select" className="text-sm font-semibold text-zinc-700">Producto a Trazar</label>
                    <select id="item-select" value={itemId} onChange={e => { setItemId(e.target.value); setLotNumber(''); }} className="mt-2 w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Selecciona un producto</option>
                        {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 bg-white p-4 rounded-xl border overflow-y-auto">
                    <h3 className="text-sm font-semibold text-zinc-700">Lotes para <span className="font-bold">{items.find(i=>i.id===itemId)?.name}</span></h3>
                    <div className="mt-2 space-y-2">
                        {lotsForItem.map(lot => (
                            <button key={lot.lotNumber} onClick={() => setLotNumber(lot.lotNumber)} className={`w-full text-left p-2 rounded-lg transition-colors ${lotNumber === lot.lotNumber ? 'bg-blue-100 text-blue-800' : 'hover:bg-zinc-100'}`}>
                                <p className="font-mono text-xs font-semibold">{lot.lotNumber}</p>
                                <p className="text-xs text-zinc-500">{new Date(lot.createdAt).toLocaleDateString('es-ES')}</p>
                            </button>
                        ))}
                         {lotsForItem.length === 0 && <p className="text-xs text-center text-zinc-500 py-4">No hay lotes para este producto.</p>}
                    </div>
                </div>
            </div>
            <div className="md:col-span-2 bg-white p-4 rounded-xl border overflow-y-auto">
                {isTracing ? (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-500"><Search size={48} className="mb-4 animate-pulse" /><h3 className="text-lg font-semibold">Generando Informe...</h3></div>
                ) : traceData?.lot ? (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Informe de Trazabilidad: {traceData.lot.lotNumber}</h2>
                        <LotSummaryCard traceData={traceData} items={items} parties={parties}/>
                        {traceData.qualitySummary && <QualitySummaryCard summary={traceData.qualitySummary}/>}
                        {traceData.productionSummary && <ProductionSummaryCard productionSummary={traceData.productionSummary}/>}
                        <GenealogyCard traceData={traceData} items={items} lots={lots}/>
                        <ConsumptionInProductionCard traceData={traceData}/>
                        <div className="mt-4">
                            <h3 className="text-base font-semibold mb-3">Historial Cronológico Completo</h3>
                            {traceData.events && traceData.events.length > 0 ? (
                                <div className="border-t">
                                    {traceData.events
                                        .filter(e => e && e.kind && e.kind !== 'GENEALOGY_PARENT' && e.kind !== 'GENEALOGY_CHILD')
                                        .map(event => (<TraceEventCard key={event.id || `${event.kind}-${event.at}`} event={event} />))
                                    }
                                </div>
                            ) : (
                                <p className="text-zinc-500 text-center py-8">No se encontraron eventos para este lote.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <Package size={48} className="mb-4" />
                        <h3 className="text-lg font-semibold">Selecciona un lote</h3>
                        <p className="text-sm">Elige un producto y un lote para ver su informe de trazabilidad.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
