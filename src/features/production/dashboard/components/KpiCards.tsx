
// src/features/production/dashboard/components/KpiCards.tsx
"use client";
import React from "react";
import { Factory, AlertCircle, Hourglass, CheckCircle, XCircle, Droplets, Package, BarChart } from 'lucide-react';
import { SB_COLORS } from '@/domain/ssot';
import { KPI } from '@/components/ui/ui-primitives';

export function KpiCards({ kpis }: { kpis: any }) {
  if (!kpis) return null;
  const c = kpis.counters;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI icon={Factory} label="Órdenes Activas (WIP)" value={c.wip} color={SB_COLORS.primary.teal} />
        <KPI icon={AlertCircle} label="Órdenes Retrasadas" value={kpis.overdueOrders} color={SB_COLORS.primary.copper} />
        <KPI icon={Hourglass} label="Lotes Pendientes QC" value={kpis.pendingQCLots} color={SB_COLORS.primary.sun} />
        <KPI icon={CheckCircle} label="Órdenes Completadas (30d)" value={kpis.doneLast30} color={SB_COLORS.state.success} />
        
        <KPI icon={Package} label="Botellas Producidas (30d)" value={kpis.totalBottles30.toLocaleString('es-ES')} color={SB_COLORS.primary.aqua} />
        <KPI icon={BarChart} label="Rendimiento Medio (30d)" value={`${kpis.avgYield30.toFixed(1)}`} unit="%" color="#8b5cf6" />
        <KPI icon={Droplets} label="Coste/Botella Medio (30d)" value={`${kpis.avgCostBottle30.toFixed(3)}`} unit="€" color="#db2777" />
        <KPI icon={XCircle} label="Órdenes Canceladas" value={c.cancelled} color={SB_COLORS.state.danger} />
    </div>
  );
}
