// /features/agenda/components/FooterKPIs.tsx
"use client";
import React from 'react';
export function FooterKPIs({ overdue, todayOpen, posToday }:{overdue:number; todayOpen:number; posToday:number}) {
  return (
    <div className="border-t bg-white px-4 py-2 text-sm flex items-center justify-between">
      <div className="text-[hsl(var(--sb-neutral-600))]">Vencidas</div><div className="font-semibold">{overdue}</div>
      <div className="text-[hsl(var(--sb-neutral-600))]">Para hoy</div><div className="font-semibold">{todayOpen}</div>
      <div className="text-[hsl(var(--sb-neutral-600))]">POS hoy</div><div className="font-semibold">{posToday}</div>
    </div>
  );
}
