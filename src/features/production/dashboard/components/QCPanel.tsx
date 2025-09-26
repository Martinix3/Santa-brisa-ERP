// src/features/production/dashboard/components/QCPanel.tsx
"use client";
import React from "react";
import type { OnHandView } from "@/domain/ssot";

export function QCPanel({ lots: onHand }: { lots: OnHandView[] }) {
  const hold = (onHand || []).filter(l => l.locationId?.includes('QA'));
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500 mb-3">Lotes terminados en HOLD</div>
      {!hold.length ? (
        <div className="text-sm text-zinc-600 text-center p-4">Nada en espera de QC</div>
      ) : (
        <ul className="space-y-2">
          {hold.slice(0, 10).map(l => (
            <li key={l.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 py-2">
              <div>
                <div className="font-medium font-mono text-xs">{l.lotNumber || l.id}</div>
                <div className="text-xs text-zinc-500">{l.itemId} · {new Date(l.updatedAt).toLocaleString()}</div>
              </div>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">HOLD</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
