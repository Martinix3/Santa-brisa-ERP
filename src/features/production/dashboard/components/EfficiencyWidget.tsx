"use client";
import React from "react";
import { BarBasic, LineBasic } from "../charts";

export function EfficiencyWidget({ laborSeries, costPerBottleSeries }:{ laborSeries: {date:string; hours:number}[]; costPerBottleSeries: {date:string; cpb:number}[] }){
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500 mb-3">Eficiencia (últimos 30 días)</div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Horas efectivas</div>
          <BarBasic data={laborSeries.map(d=>({ date:d.date, value:d.hours }))} xKey="date" yKey="value" unit="h" />
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Coste por botella</div>
          <LineBasic data={costPerBottleSeries.map(d=>({ date:d.date, value:d.cpb }))} xKey="date" yKey="value" unit="€" />
        </div>
      </div>
    </div>
  );
}
