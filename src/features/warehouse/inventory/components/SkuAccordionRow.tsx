// src/features/warehouse/inventory/components/SkuAccordionRow.tsx
'use client';
import React, { useState } from 'react';
import type { OnHandView, Item, QcStatus } from '@/domain/ssot';
import { ChevronDown, Package } from 'lucide-react';
import { stockStatusBadgeClass, stockStatusLabel, type SkuStockSummary } from "@/lib/inventory";

export function QcStatusPill({ status }: { status: QcStatus }) {
    const styles: Record<QcStatus, string> = {
        PENDING: "bg-yellow-100 text-yellow-800",
        PASSED: "bg-green-100 text-green-800",
        FAILED: "bg-red-100 text-red-800",
        WAIVED: "bg-blue-100 text-blue-800",
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

export function SkuAccordionRow({ sku: summary, items, onLotSelect }: {
    sku: SkuStockSummary;
    items: Item[];
    onLotSelect: (lotNumber: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const item = items.find(i => i.id === summary.itemId);

    return (
      <div className="border-b last:border-b-0">
        <div
          className="grid grid-cols-[2fr_repeat(5,1fr)] items-center gap-4 px-4 py-2 cursor-pointer hover:bg-zinc-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
              <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              <div>
                  <p className="font-bold text-sm text-zinc-800">{item?.name || 'Nombre Desconocido'}</p>
                  <p className="font-mono text-xs text-zinc-500">{item?.sku || summary.itemId}</p>
              </div>
          </div>
          <div className="text-sm font-semibold text-right">{summary.totalPhysical}</div>
          <div className="text-sm font-semibold text-right">{summary.totalReleasedFree}</div>
          <div className="text-sm font-semibold text-right">{summary.lotsCount > 1 ? `${summary.lotsCount - summary.totalReleasedFree}`: '0' }</div>
          <div className="text-sm font-semibold text-right">{summary.totalOnHold}</div>
          <div><span className={stockStatusBadgeClass(summary.status)}>{stockStatusLabel(summary.status)}</span></div>
        </div>
        {isOpen && (
          <div className="bg-zinc-50/70 p-3 pl-12">
            <div className="space-y-2">
                {(summary.lots || []).length > 0 ? summary.lots.map((lot: any) => (
                    <button key={lot.id} onClick={() => onLotSelect(lot.lotNumber)} className="w-full text-left grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center p-2 bg-white rounded-md border hover:border-blue-400">
                        <span className="font-mono text-xs">{lot.lotNumber}</span>
                        <span className="text-sm font-medium">{lot.qty} {lot.uom}</span>
                        <span className="text-xs text-zinc-600">{lot.locationId}</span>
                        <QcStatusPill status={lot.qcStatus} />
                    </button>
                )) : <p className="text-xs text-zinc-500 text-center py-2">Sin lotes para este producto.</p>}
            </div>
          </div>
        )}
      </div>
    );
  }
