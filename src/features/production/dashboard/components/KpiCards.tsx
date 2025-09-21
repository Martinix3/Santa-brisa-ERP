"use client";
import React from "react";

export function KpiCards({ kpis }:{ kpis: any }){
  const c = kpis.counters;
  const items = [
    { label: 'Programadas', value: c.planned, tone: 'amber' },
    { label: 'Liberadas', value: c.released, tone: 'blue' },
    { label: 'En proceso', value: c.wip, tone: 'blue' },
    { label: 'Canceladas', value: c.cancelled, tone: 'slate' },
    { label: 'Completadas', value: c.done, tone: 'green' },
    { label: 'Botellas (30d)', value: kpis.totalBottles30.toLocaleString('es-ES'), tone: 'teal' },
    { label: 'Coste/botella (30d)', value: `${kpis.avgCostBottle30.toFixed(3)} €`, tone: 'teal' },
    { label: 'Rendimiento (30d)', value: `${kpis.avgYield30.toFixed(1)}%`, tone: 'teal' },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it,i)=> (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">{it.label}</div>
          <div className="text-2xl font-semibold mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
