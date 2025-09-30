// src/features/production/execution/components/StockCheckPanel.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
// REFACTOR: Se eliminó la importación de SBButton porque no se utilizaba.
import type { Uom, Item, ProductionOrder, BillOfMaterial as RecipeBom, OnHandView } from '@/domain/ssot';

// REFACTOR: Se añade un tipo para las líneas del BOM para evitar el uso de `any`.
type BomLine = {
  itemId: string;
  qty: number;
  uom?: Uom;
  role?: string;
};

type TheoreticalLine = { itemId: string; itemName: string; qty: number; uom: Uom };

function computeTheoretical(bom: RecipeBom, qty: number, itemsMap: Map<string, Item>): TheoreticalLine[] {
  // REFACTOR: Se usa el tipo `BomLine` en lugar de `any` para mayor seguridad.
  const lines = (bom.items || []).filter((l: BomLine) => (l.role ?? "FORMULA") !== "COST_ONLY");
  
  return lines.map((l: BomLine) => ({
    itemId: l.itemId,
    itemName: itemsMap.get(l.itemId)?.name ?? l.itemId,
    qty: +(Number(l.qty || 0) * Number(qty || 0)).toFixed(3),
    uom: (l.uom || "uds") as Uom,
  }));
}

const toTime = (s?: string) => {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? t : 0;
};

export function StockCheckPanel({ bom, qty, items, onHand, onReadyChange, shortagesOut, requiredLotsOut }: {
  bom: RecipeBom; qty: number; items: Item[]; onHand: OnHandView[];
  onReadyChange: (ok: boolean) => void;
  shortagesOut: (s: Array<{ itemId: string; itemName: string; missing: number; uom: Uom }>) => void;
  requiredLotsOut: (r: Array<{ itemId: string; lotNumber: string; qty: number; uom: string; locationId: string }>) => void;
}) {
  const itemsMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const theory = useMemo(() => computeTheoretical(bom, qty, itemsMap), [bom, qty, itemsMap]);

  // REFACTOR: Se añade `proposedMap` para pre-calcular los totales y optimizar el render.
  const { shortages, picks, proposedMap } = useMemo(() => {
    const byItem = new Map<string, OnHandView[]>();
    for (const r of onHand) {
      if (!byItem.has(r.itemId)) byItem.set(r.itemId, []);
      byItem.get(r.itemId)!.push(r);
    }

    // REFACTOR: Se eliminó el bucle de ordenación redundante que estaba aquí.
    // La ordenación se hace de forma más segura y eficiente justo antes de usar los lotes.
    
    const shortages: Array<{ itemId: string; itemName: string; missing: number; uom: Uom }> = [];
    const picks: Array<{ itemId: string; lotNumber: string; qty: number; uom: Uom; locationId: string }> = [];
    
    for (const t of theory) {
      let remain = t.qty;
      const lots = (byItem.get(t.itemId) ?? [])
          .filter(l => (l.qcStatus === 'PASSED' || l.qcStatus === 'WAIVED') && l.qty > 0)
          .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));

      for (const r of lots) {
        if (remain <= 0) break;
        const take = Math.min(Number(r.qty) || 0, remain);
        if (take > 0 && r.lotNumber) {
          picks.push({ itemId: t.itemId, lotNumber: r.lotNumber, qty: +take.toFixed(3), uom: t.uom, locationId: r.locationId });
          remain -= take;
        }
      }
      
      if (remain > 1e-6) { // Usar un épsilon para comparación de flotantes es una buena práctica.
        shortages.push({ itemId: t.itemId, itemName: itemsMap.get(t.itemId)?.name ?? t.itemId, missing: +remain.toFixed(3), uom: t.uom });
      }
    }

    // REFACTOR: Se pre-calculan las cantidades propuestas para no hacerlo en el render.
    const proposedMap = new Map<string, number>();
    for (const pick of picks) {
      const currentQty = proposedMap.get(pick.itemId) ?? 0;
      proposedMap.set(pick.itemId, currentQty + pick.qty);
    }

    return { shortages, picks, proposedMap };
  }, [theory, onHand, itemsMap]);

  useEffect(() => {
    onReadyChange(shortages.length === 0);
    shortagesOut(shortages);
    // REFACTOR: Se eliminó el `as any`. El tipo de `picks` es compatible con lo que espera la función.
    requiredLotsOut(picks);
  }, [shortages, picks, onReadyChange, shortagesOut, requiredLotsOut]);

  return (
    <div className="border rounded-lg p-3 bg-zinc-50">
      <h4 className="text-sm font-semibold mb-3">Disponibilidad y lotes de insumo</h4>
      {shortages.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
          <b>Faltantes:</b> {shortages.map(s => `${s.itemName}: ${s.missing} ${s.uom}`).join(" · ")}
        </div>
      )}
      <div className="text-xs">
        <div className="grid grid-cols-[1fr,90px,90px] font-semibold mb-1">
          <span>Material</span><span className="text-right">Req.</span><span className="text-right">Propuesto</span>
        </div>
        {theory.map((line) => {
          // REFACTOR: Se obtiene el valor pre-calculado del mapa. Mucho más eficiente.
          const proposed = proposedMap.get(line.itemId) ?? 0;
          
          return (
            <div key={line.itemId} className="grid grid-cols-[1fr,90px,90px] items-start py-0.5">
              <span>{line.itemName}</span>
              <span className="text-right font-mono">{line.qty} {line.uom}</span>
              <span className={`text-right font-mono ${proposed >= line.qty ? 'text-emerald-700' : 'text-rose-700'}`}>
                {+proposed.toFixed(3)} {line.uom}
              </span>
              <div className="col-span-3 text-[11px] text-zinc-600 mt-0.5">
                {picks.filter(p => p.itemId === line.itemId).map(p => (
                  <span key={`${p.itemId}-${p.lotNumber}`} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded border bg-white">
                    {p.lotNumber} · {p.qty} {p.uom}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}