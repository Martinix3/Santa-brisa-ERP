// src/features/production/execution/components/StockCheckPanel.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { SBButton } from '@/components/ui/ui-primitives';
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom, OnHand } from '@/domain/ssot';
import { SectionCard } from '../../components/ui';
import { cn } from '@/lib/utils';

type TheoreticalLine = { sku: string; itemName: string; qty: number; uom: Uom };

function computeTheoretical(bom: RecipeBom, qty: number, itemsMap: Map<string, Item>): TheoreticalLine[] {
  const lines = (bom.items || []).filter((l: any) => (l.role ?? "FORMULA") !== "COST_ONLY");
  return lines.map((l: any) => {
    const sku = l.sku || l.itemId; // v7 compatibility
    return {
      sku,
      itemName: itemsMap.get(sku)?.name ?? sku,
      qty: +(Number(l.qty || 0) * Number(qty || 0)).toFixed(3),
      uom: (l.uom || "uds") as Uom,
    };
  });
}

const toTime = (s?: string) => {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? t : 0;
};

export function StockCheckPanel({ bom, qty, items, onHand, onReadyChange, shortagesOut, requiredLotsOut }: {
  bom: RecipeBom; qty: number; items: Item[]; onHand: OnHand[];
  onReadyChange: (ok: boolean) => void;
  shortagesOut: (s: Array<{ sku: string; itemName: string; missing: number; uom: Uom }>) => void;
  requiredLotsOut: (r: Array<{ sku: string; lotNumber: string; qty: number; uom: string; locationId: string }>) => void;
}) {
  const itemsMap = useMemo(() => new Map(items.map((i) => [i.sku || i.id, i])), [items]);
  const theory = useMemo(() => computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);

  const { shortages, picks } = useMemo(() => {
    const byItem = new Map<string, OnHand[]>();
    for (const r of onHand) {
      const sku = r.sku;
      if (!byItem.has(sku)) byItem.set(sku, []);
      byItem.get(sku)!.push(r);
    }
    for (const rows of byItem.values()) {
      rows.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
    }
    
    const shortages: Array<{ sku: string; itemName: string; missing: number; uom: Uom }> = [];
    const picks: Array<{ sku: string; lotNumber: string; qty: number; uom: Uom; locationId: string }> = [];
    
    for (const t of theory) {
      let remain = t.qty;
      const lots = (byItem.get(t.sku) ?? [])
          .filter(l => (l.qcStatus === 'PASSED' || l.qcStatus === 'WAIVED') && l.qty > 0)
          .sort((a, b) => toTime(a.createdAt || '') - toTime(b.createdAt || ''));

      for (const r of lots) {
        if (remain <= 0) break;
        const take = Math.min(Number(r.qty) || 0, remain);
        // En v7, lotNumbers es un Record, extraemos el primer lote
        const lotNumber = r.lotNumbers ? Object.keys(r.lotNumbers)[0] : '';
        if (take > 0 && lotNumber) {
          picks.push({ sku: t.sku, lotNumber, qty: +take.toFixed(3), uom: t.uom, locationId: r.warehouseId || '' });
          remain -= take;
        }
      }
      
      const available = lots.reduce((acc, lot) => acc + (lot.qty || 0), 0);
      if (remain > 1e-6) {
        shortages.push({ sku: t.sku, itemName: itemsMap.get(t.sku)?.name ?? t.sku, missing: +remain.toFixed(3), uom: t.uom });
      }
    }
    return { shortages, picks };
  }, [theory, onHand, itemsMap]);

  useEffect(() => {
    onReadyChange(shortages.length === 0);
    shortagesOut(shortages);
    requiredLotsOut(picks as any);
  }, [shortages, picks, onReadyChange, shortagesOut, requiredLotsOut]);

  return (
    <SectionCard title="Disponibilidad y lotes de insumo">
      {shortages.length > 0 && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive-foreground p-2 text-xs text-destructive">
          <b className="font-semibold">Faltantes:</b> {shortages.map(s => `${s.itemName}: ${s.missing} ${s.uom}`).join(" · ")}
        </div>
      )}
      <div className="text-xs">
        <div className="grid grid-cols-[1fr,90px,90px] font-semibold mb-1 text-muted-foreground">
          <span>Material</span><span className="text-right">Req.</span><span className="text-right">Propuesto</span>
        </div>
        {theory.map((line) => {
          const proposed = picks.filter(p => p.sku === line.sku).reduce((s, p) => s + p.qty, 0);
          return (
            <div key={line.sku} className="grid grid-cols-[1fr,90px,90px] items-start py-0.5">
              <span>{line.itemName}</span>
              <span className="text-right font-mono">{line.qty} {line.uom}</span>
              <span className={cn('text-right font-mono', proposed >= line.qty ? 'text-success' : 'text-destructive')}>
                {+proposed.toFixed(3)} {line.uom}
              </span>
              <div className="col-span-3 text-[11px] text-muted-foreground mt-0.5">
                {picks.filter(p => p.sku === line.sku).map(p => (
                  <span key={`${p.sku}-${p.lotNumber}`} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded border bg-background">
                    {p.lotNumber} · {p.qty} {p.uom}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
