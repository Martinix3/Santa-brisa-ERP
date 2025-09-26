// src/features/production/dashboard/components/EfficiencyWidget.tsx
"use client";
import React from "react";
import { BarBasic, LineBasic } from "../charts";
import { SB_COLORS } from "@/domain/ssot";

export function EfficiencyWidget({ laborSeries, costPerUnitSeries }: { laborSeries: { date: string; hours: number }[]; costPerUnitSeries: { date: string; cpu: number }[] }) {
  return (
    <div className="p-4 grid md:grid-cols-2 gap-3">
      <div>
        <div className="text-sm font-medium text-zinc-700 mb-1">Horas efectivas</div>
        <div className="h-64">
          <BarBasic data={laborSeries.map(d=>({ date:d.date, value:d.hours }))} xKey="date" yKey="value" unit="h" color={SB_COLORS.primary.aqua}/>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-700 mb-1">Coste por unidad</div>
        <div className="h-64">
          <LineBasic data={costPerUnitSeries.map(d=>({ date:d.date, value:d.cpu }))} xKey="date" yKey="value" unit="€" color={SB_COLORS.primary.copper}/>
        </div>
      </div>
    </div>
  );
}
