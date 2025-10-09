// src/features/warehouse/inventory/components/LotDetailPanel.tsx
'use client';
import React from 'react';
import type { Item, StockMove } from '@/domain/ssot.v7';
import { SBCard } from '@/components/ui/ui-primitives';
import { QcStatusPill } from './SkuAccordionRow';
import { ArrowLeftRight, PackagePlus, PackageMinus, X } from 'lucide-react';

const MOVE_ICONS: Record<string, React.ElementType> = {
  receipt: PackagePlus,
  production_in: PackagePlus,
  production_out: PackageMinus,
  sale: PackageMinus,
  ship: PackageMinus,
  transfer: ArrowLeftRight,
};

export function LotDetailPanel({ lotDetails, items, onClose }: {
    lotDetails: { lot: any, moves: StockMove[] };
    items: Item[];
    onClose: () => void;
}) {
    const { lot, moves } = lotDetails;
    const item = items.find(i => i.id === lot.itemId);

    return (
        <SBCard
            title={
                <div className="flex justify-between items-center">
                    <span className="font-mono text-base">{lot.lotNumber}</span>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100"><X size={16}/></button>
                </div>
            }
            noPadding
        >
            <div className="p-4 border-b">
                <p className="font-semibold text-zinc-800">{item?.name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <QcStatusPill status={lot.qcStatus} />
                    <span className="px-2 py-1 bg-zinc-100 rounded-full font-medium">{lot.locationId}</span>
                    {lot.expiryAt && <span className="px-2 py-1 bg-zinc-100 rounded-full font-medium">Cad: {new Date(lot.expiryAt).toLocaleDateString('es-ES')}</span>}
                </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2">Historial de Movimientos</h4>
                <div className="space-y-3">
                    {moves.map(move => {
                        const Icon = MOVE_ICONS[move.reason] || PackagePlus;
                        const isOut = move.qty < 0;
                        return (
                            <div key={move.id} className="flex items-start gap-3 text-xs">
                                <div className={`p-1.5 rounded-full mt-0.5 ${isOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    <Icon size={12} />
                                </div>
                                <div>
                                    <p className="font-medium text-zinc-800 capitalize">{move.reason}</p>
                                    <p className="text-zinc-600">
                                        <span className={`font-semibold ${isOut ? 'text-red-700' : 'text-green-700'}`}>{move.qty}</span> {move.uom}
                                        <span className="text-zinc-400"> · {new Date(move.occurredAt).toLocaleDateString('es-ES')}</span>
                                    </p>
                                    {(move.fromLocationId || move.toLocationId) &&
                                        <p className="text-zinc-500">{move.fromLocationId || 'Origen'} → {move.toLocationId || 'Destino'}</p>
                                    }
                                </div>
                            </div>
                        )
                    })}
                    {moves.length === 0 && <p className="text-xs text-center text-zinc-500 py-4">Sin movimientos.</p>}
                </div>
            </div>
        </SBCard>
    );
}
