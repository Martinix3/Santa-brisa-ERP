// src/app/(app)/warehouse/goods-receipt/page.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBButton, DataTableSB } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { Plus, Truck } from 'lucide-react';
import type { GoodsReceipt, Party } from '@/domain/ssot';
import { QuickGoodsReceiptDialog } from '@/features/warehouse/components/QuickGoodsReceiptDialog';

export default function GoodsReceiptPage() {
    const { data } = useData();
    const [showForm, setShowForm] = useState(false);
    
    const receipts = useMemo(() => {
        if (!data?.goodsReceipts) return [];
        return [...data.goodsReceipts].sort((a,b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    }, [data?.goodsReceipts]);

    const handleSaveSuccess = (info: { receiptId: string; receiptNumber: string }) => {
        setShowForm(false);
        // Data will be revalidated by the action, so we don't need to update state here.
    };

    const cols: Col<GoodsReceipt>[] = [
        { key: 'receiptNumber', header: 'Nº Recepción', render: r => <span className="font-mono text-xs">{r.receiptNumber}</span> },
        { key: 'supplier', header: 'Proveedor', render: r => <span>{data?.parties.find(p => p.id === r.supplierPartyId)?.name || 'N/A'}</span> },
        { key: 'deliveryNote', header: 'Albarán Proveedor', render: r => <span>{r.deliveryNote}</span> },
        { key: 'receivedAt', header: 'Fecha', render: r => <span>{new Date(r.receivedAt).toLocaleDateString('es-ES')}</span> },
        { key: 'lines', header: 'Líneas', className: "text-right", render: r => <span>{r.lines.length}</span> },
        { key: 'status', header: 'Estado', render: r => <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span> },
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800 flex items-center gap-3"><Truck /> Historial de Recepciones</h1>
                <SBButton onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva Recepción
                </SBButton>
            </div>
            
            <DataTableSB rows={receipts} cols={cols as any[]} />

            <QuickGoodsReceiptDialog
                open={showForm}
                onOpenChange={setShowForm}
                onSuccess={handleSaveSuccess}
            />
        </div>
    );
}
