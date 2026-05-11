/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/components/LotRows.tsx
'use client';
import React from 'react';
import type { QcStatus } from '@/domain/ssot';
import { QcStatusPill } from './SkuAccordionRow';

type LotRowData = {
  id: string;
  lotCode: string;
  lotNumber?: string;
  friendlyLotCode: string;
  name: string;
  sku: string;
  qty: number;
  free: number;
  uom: string;
  itemUom: string | null;
  locationId: string;
  qcStatus: QcStatus;
  expiryAt: string | null;
  value: number;
  uomMismatch: boolean;
  externalLot?: string;
};

export function LotRows({
  lots,
  onLotSelect,
}: {
  lots: LotRowData[];
  onLotSelect: (lotCode: string) => void;
}) {
  if (lots.length === 0) {
    return <div className="py-10 text-center text-sm text-zinc-500">No hay lotes que cumplan los filtros.</div>;
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <div className="divide-y">
      <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-2 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
        <span>Lote</span>
        <span>Producto</span>
        <span className="text-right">Stock libre</span>
        <span className="text-right">Valor (€)</span>
        <span>Ubicación</span>
        <span>Estado</span>
      </div>

      {lots.map(lot => (
        <button
          key={lot.lotCode || lot.id}
          onClick={() => onLotSelect(lot.lotCode)}
          className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 text-left hover:bg-zinc-50/70 transition-colors"
        >
          <span className="font-mono text-xs font-semibold text-foreground">
            {lot.lotCode}
            {lot.externalLot && lot.externalLot !== lot.lotCode && (
              <span className="block text-[10px] text-muted-foreground">Ext: {lot.externalLot}</span>
            )}
          </span>

          <div className="space-y-1">
            <p className="font-medium text-sm text-foreground">{lot.name}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{lot.sku}</p>
            {lot.uomMismatch && (
              <span className="inline-flex items-center gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                Incidencia UoM · lote {lot.uom} vs maestro {lot.itemUom || 'N/D'}
              </span>
            )}
            {lot.expiryAt && (
              <p className="text-[11px] text-muted-foreground">
                Caduca: {new Date(lot.expiryAt).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>

          <span className="text-right text-sm font-semibold text-foreground">
            {lot.free.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
            <span className="ml-1 text-xs text-muted-foreground">{lot.uom}</span>
          </span>

          <span className="text-right text-sm font-semibold text-foreground">
            {formatCurrency(lot.value)}
          </span>

          <span className="text-sm text-muted-foreground">{lot.locationId}</span>

          <QcStatusPill status={lot.qcStatus} />
        </button>
      ))}
    </div>
  );
}
