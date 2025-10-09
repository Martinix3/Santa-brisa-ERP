// src/features/warehouse/inventory/components/LotRows.tsx
'use client';
import React from 'react';
import { QcStatusPill } from './SkuAccordionRow';

type LotRowData = {
    id: string;
    lotNumber: string;
    name: string;
    sku: string;
    free: number;
    uom: string;
    locationId: string;
    qcStatus: any;
    expiryAt: string | null;
};

export function LotRows({ lots, onLotSelect }: { lots: LotRowData[]; onLotSelect: (lotNumber: string) => void; }) {
    if (lots.length === 0) {
        return <div className="py-10 text-center text-sm text-zinc-500">No hay lotes que cumplan los filtros.</div>;
    }
    return (
        <div className="divide-y">
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-2 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                <span>Lote</span>
                <span>Producto</span>
                <span className="text-right">Stock Libre</span>
                <span>Ubicación</span>
                <span>Estado Calidad</span>
            </div>
            {lots.map(lot => (
                <div 
                    key={lot.id} 
                    className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 hover:bg-zinc-50/50 cursor-pointer"
                    onClick={() => onLotSelect(lot.lotNumber)}
                >
                    <span className="font-mono text-xs">{lot.lotNumber}</span>
                    <div>
                        <p className="font-medium text-sm">{lot.name}</p>
                        {lot.expiryAt && <p className="text-xs text-zinc-500">Cad: {new Date(lot.expiryAt).toLocaleDateString('es-ES')}</p>}
                    </div>
                    <span className="text-right font-medium">{lot.free} <span className="text-zinc-500 text-xs">{lot.uom}</span></span>
                    <span className="text-sm">{lot.locationId}</span>
                    <QcStatusPill status={lot.qcStatus} />
                </div>
            ))}
        </div>
    );
}
