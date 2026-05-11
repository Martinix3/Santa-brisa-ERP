/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/SkuAccordionRow.tsx
'use client';
import React, { useState } from 'react';
import type { OnHandView, Item, QcStatus } from '@/domain/ssot';
import { ChevronDown, DollarSign } from 'lucide-react';
import { stockStatusBadgeClass, stockStatusLabel, type SkuStockSummary } from "@/lib/inventory";
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { useRouter } from 'next/navigation';
import type { StockMove } from '@/domain/ssot';

export function QcStatusPill({ status }: { status: QcStatus }) {
    const styles: Record<QcStatus, string> = {
        PENDING: "bg-yellow-100 text-yellow-800",
        IN_PROGRESS: "bg-blue-100 text-blue-800",
        PASSED: "bg-green-100 text-green-800",
        FAILED: "bg-red-100 text-red-800",
        CONDITIONAL: "bg-orange-100 text-orange-800",
        HOLD: "bg-purple-100 text-purple-800",
        WAIVED: "bg-gray-100 text-gray-800",
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

type LotEntry = OnHandView & {
  lotNumber?: string;
  lotCode?: string;
  friendlyLotCode?: string;
  uomMismatch?: boolean;
  itemUom?: string | null;
};

export function SkuAccordionRow({
  summary,
  item,
  lots,
  onLotSelect,
  stockMoves = [],
}: {
  summary: SkuStockSummary;
  item?: Item;
  lots: LotEntry[];
  onLotSelect: (lotCode: string) => void;
  stockMoves?: StockMove[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPricing, setShowPricing] = useState(false);
    const router = useRouter();
    const totalReserved = summary.totalReserved ?? 0;
    const totalValue = summary.totalValue ?? 0;

    // Filter receipts for this SKU
    const recentReceipts = React.useMemo(() => {
      return stockMoves
        .filter(m => m.sku === summary.sku && m.reason === 'receipt' && m.unitCost)
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 10);
    }, [stockMoves, summary.sku]);

    return (
      <>
        <div className="border-b last:border-b-0">
          <div
            className="grid grid-cols-[2fr_repeat(6,1fr)] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-3 flex-1">
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <div className="flex-1">
                    <p className="font-bold text-sm text-zinc-800">{item?.name || 'Nombre Desconocido'}</p>
                    <p className="font-mono text-xs text-zinc-500">{item?.sku || summary.sku}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      UoM maestro: {item?.uom || 'N/D'}
                    </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPricing(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                  title="Gestionar precios"
                >
                  <DollarSign size={14} />
                  Precios
              </button>
            </div>
            <div className="text-sm font-semibold text-right">{summary.totalPhysical.toLocaleString('es-ES')}</div>
            <div className="text-sm font-semibold text-right">{summary.totalReleasedFree.toLocaleString('es-ES')}</div>
            <div className="text-sm font-semibold text-right">{totalReserved.toLocaleString('es-ES')}</div>
            <div className="text-sm font-semibold text-right">{summary.totalOnHold.toLocaleString('es-ES')}</div>
            <div className="text-sm font-semibold text-right">
              {totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <div><span className={stockStatusBadgeClass(summary.status)}>{stockStatusLabel(summary.status)}</span></div>
          </div>
          {isOpen && (
            <div className="bg-zinc-50/70 p-3 pl-12">
              <div className="space-y-2">
                  {lots.length > 0 ? lots.map((lot) => (
                      <button
                        key={`${lot.id}-${lot.lotCode || lot.lotNumber}`}
                        onClick={() => {
                          const code = lot.lotCode || lot.lotNumber;
                          if (code) onLotSelect(code);
                        }}
                        className="w-full text-left grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-center p-2 bg-white rounded-md border border-zinc-200 hover:border-blue-300"
                      >
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {lot.friendlyLotCode || lot.lotCode || lot.lotNumber}
                            <span className="block text-[10px] text-muted-foreground">{lot.lotCode || lot.lotNumber}</span>
                          </span>
                          <span className="text-sm font-medium">
                            {(() => {
                              // Manejar buckets SSOT V2 y legacy
                              let qtyDisplay: number;
                              if (typeof lot.qty === 'object' && lot.qty !== null) {
                                const buckets = lot.qty as any;
                                qtyDisplay = (buckets.RELEASED || 0) + (buckets.HOLD || 0) + (buckets.REJECTED || 0);
                              } else {
                                qtyDisplay = Number(lot.qty) || 0;
                              }
                              return qtyDisplay.toLocaleString('es-ES', { maximumFractionDigits: 2 });
                            })()} {lot.uom}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {lot.locationId || 'SIN UBICACIÓN'}
                            {lot.uomMismatch && (
                              <span className="block text-[10px] font-semibold text-amber-600">
                                UoM lote {lot.uom} · maestro {lot.itemUom || 'N/D'}
                              </span>
                            )}
                          </span>
                          <QcStatusPill status={lot.qcStatus} />
                      </button>
                  )) : <p className="text-xs text-zinc-500 text-center py-2">Sin lotes para este producto.</p>}
              </div>
            </div>
          )}
        </div>
        
        {/* Item Detail Drawer */}
        {item && (
          <ItemDetailDrawer
            item={item}
            recentReceipts={recentReceipts}
            open={showPricing}
            onClose={() => setShowPricing(false)}
            onSuccess={() => {
              setShowPricing(false);
              router.refresh();
            }}
          />
        )}
      </>
    );
}
