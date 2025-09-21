"use client";
import React from "react";
import { AreaBasic } from "../charts";

export function BottlingProgress({ data }:{ data: { date: string; planned: number; real: number }[] }){
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-500">Botellas plan vs real (30 días)</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Planificadas (botellas)</div>
          <AreaBasic data={data.map(d=>({ date:d.date, value:d.planned }))} xKey="date" yKey="value" unit="uds" />
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Reales (botellas)</div>
          <AreaBasic data={data.map(d=>({ date:d.date, value:d.real }))} xKey="date" yKey="value" unit="uds" />
        </div>
      </div>
    </div>
  );
}
