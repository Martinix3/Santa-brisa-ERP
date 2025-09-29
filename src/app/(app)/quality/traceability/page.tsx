// src/app/(app)/quality/traceability/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useTransition } from "react";
import { Package, Search, GitBranch, Truck, Factory, FlaskConical, ArrowLeftRight, AlertTriangle, User as UserIcon, FileText, CheckCircle, XCircle } from "lucide-react";
import type { Lot, Item, OnHandView, TraceEvent as TraceEventType, StockMove, ProductionOrder } from "@/domain/ssot";
import { getLotTraceability, type TraceData } from "./actions";
import { toast } from "sonner";
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { ITEM_CATEGORY_META } from "@/domain/ssot";

// MOCK DATA
const MOCK_ITEMS: Item[] = [
    { id: 'item_fg_turm_blanco', sku: 'FG-TURM-BL', name: 'Turmeon Blanco', category: 'fg', uom: 'uds', active: true },
    { id: 'item_rm_vino_blanco', sku: 'RM-VINO-BL', name: 'Vino Blanco Base', category: 'raw', uom: 'L', active: true },
    { id: 'item_rm_alcohol', sku: 'RM-ALCOHOL', name: 'Alcohol Vinico', category: 'raw', uom: 'L', active: true },
    { id: 'item_rm_aromas', sku: 'RM-AROMAS', name: 'Aromas Naturales', category: 'raw', uom: 'L', active: true },
    { id: 'item_rm_azucar', sku: 'RM-AZUCAR', name: 'Azúcar', category: 'raw', uom: 'kg', active: true },
    { id: 'item_fg_turm_velvet', sku: 'FG-TURM-VL', name: 'Turmeon Blue Velvet', category: 'fg', uom: 'uds', active: true },
    { id: 'item_fg_turm_white', sku: 'FG-TURM-WH', name: 'Turmeon White', category: 'fg', uom: 'uds', active: true },
    { id: 'item_fg_turm_classic', sku: 'FG-TURM-CL', name: 'Turmeon Clásico', category: 'fg', uom: 'uds', active: true },
];
const MOCK_LOTS: Lot[] = [
    { id: 'TB-2509-01', lotNumber: 'TB-2509-01', itemId: 'item_fg_turm_blanco', qcStatus: 'PASSED', createdAt: '2025-08-22T14:00:00Z', quantity: 1000 },
    { id: 'OPEN-2408-01', lotNumber: 'OPEN-2408-01', itemId: 'item_rm_vino_blanco', qcStatus: 'PASSED', createdAt: '2025-08-15T00:00:00Z', quantity: 20000 },
    { id: 'VINO-TB-2509-01', lotNumber: 'VINO-TB-2509-01', itemId: 'item_rm_vino_blanco', qcStatus: 'PASSED', createdAt: '2025-08-22T09:00:00Z', quantity: 950 },
];
const MOCK_ON_HAND: OnHandView[] = [
    { id: 'oh_tb', itemId: 'item_fg_turm_blanco', lotNumber: 'TB-2509-01', locationId: 'FG/MAIN', qty: 800, uom: 'uds', qcStatus: 'PASSED', category: 'fg', createdAt: '2025-08-22T14:00:00Z', updatedAt: '2025-08-22T14:00:00Z' },
];
const MOCK_ORDERS: ProductionOrder[] = [
    { id: 'PO-250822-0001', orderNumber: 'PO-250822-0001', outputItemId: 'item_fg_turm_blanco', targetQuantity: 1000, status: 'DONE', createdAt: '2025-08-22T08:00:00Z', name: 'Producción Turmeon Blanco' },
];
const MOCK_PARTIES = [
    {id: 'supplier_1', name: 'Proveedor Vinos La Mancha'}
];

const MOCK_TRACE_DATA: Record<string, TraceData> = {
    'TB-2509-01': {
        lot: MOCK_LOTS[0],
        onHandSummary: [MOCK_ON_HAND[0]],
        productionInfo: { orderId: 'PO-250822-0001', orderName: 'Producción Turmeon Blanco', responsible: 'Nacho', incidentCount: 0, protocols: [] },
        events: [
            { id: 'ev4', at: '2025-08-26T10:00:00Z', kind: 'SHIP', title: 'Venta a Cliente', details: 'Vendido a Bar Pepe en pedido ORD-01', data: { customerName: 'Bar Pepe', orderNumber: 'ORD-01' } },
            { id: 'ev3', at: '2025-08-22T15:00:00Z', kind: 'QC_TEST', title: 'Análisis: Grado Alcohólico', details: 'Resultado: 15.1 %vol', data: { parameterId: 'Grado Alcohólico', value: '15.1 %vol', inSpec: true } },
            { id: 'ev2', at: '2025-08-22T14:00:00Z', kind: 'PRODUCTION_IN', title: 'Salida de Producción', details: 'Producido en la orden PO-250822-0001', data: { orderId: 'PO-250822-0001', orderName: 'Producción Turmeon Blanco' } },
            { id: 'ev1', at: '2025-08-22T09:00:00Z', kind: 'GENEALOGY_PARENT', title: 'Producido a partir de Lote: OPEN-2408-01', details: 'Cantidad usada: 950 L' },
        ] as TraceEventType[],
    },
    'OPEN-2408-01': {
        lot: MOCK_LOTS[1],
        onHandSummary: [],
        receiptInfo: { supplierPartyId: 'supplier_1', deliveryNote: 'ALB-2025-XYZ', receivedBy: 'Almacén' },
        events: [
            { id: 'ev-p2', at: '2025-08-22T09:00:00Z', kind: 'PRODUCTION_OUT', title: 'Consumo en Producción', details: 'Usado en la orden PO-250822-0001' },
            { id: 'ev-p1', at: '2025-08-15T10:00:00Z', kind: 'RECEIPT', title: 'Recepción de Mercancía', details: 'Recibido de Proveedor Vinos La Mancha con albarán ALB-2025-XYZ' },
        ] as TraceEventType[],
    }
}


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
    if (!data) return null;

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

function TraceEventCard({ event }: { event: TraceEventType }) {
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
                
                {(event.kind === 'PRODUCTION_OUT' || event.kind === 'PRODUCTION_IN') && <ProductionEventDetails data={event.data} />}
                {event.kind === 'QC_TEST' && <QcTestEventDetails data={event.data} />}
            </div>
        </div>
    );
}

function LotSummaryCard({ traceData }: { traceData: TraceData }) {
    const { lot, receiptInfo, productionInfo, saleInfo, onHandSummary } = traceData;
    
    if (!lot) return null;

    const item = MOCK_ITEMS.find(i => i.id === lot.itemId);
    const categoryName = item?.category ? (ITEM_CATEGORY_META[item.category]?.label || item.category) : 'N/A';
    const locations = (onHandSummary || []).filter(oh => oh.qty > 0).map(oh => `${oh.locationId} (${oh.qty} ${oh.uom})`).join(', ');
    const supplierName = MOCK_PARTIES.find(p => p.id === receiptInfo?.supplierPartyId)?.name;

    return (
        <div className="mb-6 p-4 bg-zinc-50 rounded-xl border">
            <h3 className="text-base font-semibold mb-3">Dossier del Lote</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-zinc-500">Estado de Calidad</p><p className="font-medium">{lot.qcStatus}</p></div>
                <div><p className="text-xs text-zinc-500">Categoría</p><p className="font-medium">{categoryName}</p></div>
                <div><p className="text-xs text-zinc-500">Stock Actual</p><p className="font-medium">{locations || 'Sin stock'}</p></div>
                {receiptInfo && <div><p className="text-xs text-zinc-500">Origen</p><p className="font-medium">{supplierName || receiptInfo.supplierPartyId}</p></div>}
                {productionInfo && <div><p className="text-xs text-zinc-500">Orden de Prod.</p><Link href={`/production/execution?orderId=${productionInfo.orderId}`} className="font-medium text-blue-600 hover:underline">{productionInfo.orderName}</Link></div>}
                {saleInfo && <div><p className="text-xs text-zinc-500">Destino</p><p className="font-medium">{saleInfo.customerName}</p></div>}
            </div>
        </div>
    );
}

export default function TraceabilityPage() {
    const [itemId, setItemId] = useState<string>('');
    const [lotNumber, setLotNumber] = useState<string>('');
    const [traceData, setTraceData] = useState<TraceData | null>(null);
    const [isTracing, startTraceTransition] = useTransition();

    const items = MOCK_ITEMS;
    const lots = MOCK_LOTS;

    const lotsForItem = useMemo(() => {
        if (!itemId) return [];
        return lots.filter(lot => lot.itemId === itemId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [itemId, lots]);

    useEffect(() => {
        if (items.length > 0 && !itemId) setItemId(items[0].id);
    }, [items, itemId]);

    useEffect(() => {
        if (lotsForItem.length > 0 && !lotNumber) setLotNumber(lotsForItem[0].lotNumber);
        else if (lotsForItem.length === 0) setLotNumber('');
    }, [lotsForItem, lotNumber]);
    
    useEffect(() => {
        if (lotNumber) {
            startTraceTransition(() => {
                const data = MOCK_TRACE_DATA[lotNumber];
                if (data) {
                    setTraceData(data);
                } else {
                    toast.error(`No se encontraron datos de trazabilidad para el lote ${lotNumber}.`);
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
                {traceData?.lot ? (
                    <div>
                        <h2 className="text-lg font-bold">Trazabilidad del Lote: {traceData.lot.lotNumber}</h2>
                        <LotSummaryCard traceData={traceData} />
                        <div className="mt-4">
                            {isTracing ? (
                                <p className="text-zinc-500 text-center py-8">Buscando historial...</p>
                            ) : traceData.events.length > 0 ? (
                                <div className="border-t">
                                    {traceData.events.map(event => <TraceEventCard key={event.id} event={event} />)}
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
