// src/features/production/execution/components/RealConsumptionPanel.tsx
"use client";
import React, { useMemo } from 'react';
import { SBCard, Input } from '@/components/ui/ui-primitives';
import type { Uom } from '@/domain/ssot';
import { SectionCard } from '../../components/ui';

type RealConsumptionLine = { itemId: string; itemName: string; lotNumber: string; theoreticalQty: number; realQty: number; uom: Uom; fromLocationId: string };

export function RealConsumptionPanel({ activeForm, setFormValue, orderIsLocked }: {
  activeForm: { realConsumption: RealConsumptionLine[] };
  setFormValue: (field: string, value: any) => void;
  orderIsLocked: boolean;
}) {
  const { theoreticalTotal, realTotal, deviation } = useMemo(() => {
    const theoreticalTotal = (activeForm.realConsumption || []).reduce((sum, line) => sum + line.theoreticalQty, 0);
    const realTotal = (activeForm.realConsumption || []).reduce((sum, line) => sum + line.realQty, 0);
    const deviation = realTotal - theoreticalTotal;
    return { theoreticalTotal, realTotal, deviation };
  }, [activeForm.realConsumption]);

  return (
    <SectionCard title="Consumo Real y Mermas" count={activeForm.realConsumption?.length}>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 text-xs font-semibold text-zinc-600 px-2">
          <span>Material (Lote)</span>
          <span className="text-right">Teórico</span>
          <span className="text-right">Real</span>
          <span className="text-right">UoM</span>
        </div>
        
        {(activeForm.realConsumption || []).map((line, i) => (
          <div key={`${line.itemId}-${line.lotNumber}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 items-center">
            <div>
              <p className="text-sm font-medium">{line.itemName}</p>
              <p className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded-full inline-block">{line.lotNumber}</p>
            </div>
            <Input type="number" readOnly value={line.theoreticalQty} className="text-right bg-zinc-100" />
            <Input
              type="number"
              value={line.realQty}
              onChange={(e) => {
                const newConsumption = [...activeForm.realConsumption];
                newConsumption[i].realQty = Number(e.target.value) || 0;
                setFormValue('realConsumption', newConsumption);
              }}
              className="text-right"
              disabled={orderIsLocked}
            />
            <span className="text-xs text-zinc-500 text-right pr-2">{line.uom}</span>
          </div>
        ))}

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 text-sm font-bold border-t pt-2 mt-2 px-2">
          <span>TOTALES</span>
          <span className="text-right">{theoreticalTotal.toFixed(3)}</span>
          <span className="text-right">{realTotal.toFixed(3)}</span>
          <span />
        </div>
        <div className="text-right text-xs font-semibold pr-2">
            MERMA / DESVIACIÓN: 
            <span className={`ml-2 ${deviation < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {deviation.toFixed(3)}
            </span>
        </div>

        {activeForm.realConsumption.length === 0 && <p className="text-xs text-zinc-500 text-center py-2">Usa la propuesta para rellenar el consumo inicial.</p>}
    </SectionCard>
  );
}
