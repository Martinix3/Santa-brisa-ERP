// src/app/(app)/production/dashboard/page.tsx
"use client";
import React, { useMemo } from "react";
import { useBridge } from "@/features/production/ssot-bridge";
import { computeKpis } from "@/features/production/dashboard/kpis";
import { KpiCards } from "@/features/production/dashboard/components/KpiCards";
import { OrdersTimeline } from "@/features/production/dashboard/components/OrdersTimeline";
import { ShortagesPanel } from "@/features/production/dashboard/components/ShortagesPanel";
import { InventorySnapshot } from "@/features/production/dashboard/components/InventorySnapshot";
import { QCPanel } from "@/features/production/dashboard/components/QCPanel";
import { BottlingProgress } from "@/features/production/dashboard/components/BottlingProgress";
import { EfficiencyWidget } from "@/features/production/dashboard/components/EfficiencyWidget";
import { useData } from "@/lib/dataprovider";

export default function ProductionDashboardPage() {
  const { data } = useData();
  const { billOfMaterials: recipes, materials, inventory, productionOrders: orders, lots } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !inventory || !lots || !materials) return null;
      return computeKpis({ orders: orders as any, recipes: recipes as any, inventory: inventory as any, lots: lots as any, materials });
  }, [orders, recipes, inventory, lots, materials]);

  if (!data || !kpis) return <div className="p-6">Cargando dashboard…</div>;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard de Producción</h1>
        <p className="text-sm text-zinc-500">Plan ↔ ejecución, mermas, costes y calidad</p>
      </header>

      <KpiCards kpis={kpis} />

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <BottlingProgress data={kpis.progressSeries} />
          <OrdersTimeline orders={orders as any} />
        </div>
        <div className="space-y-6">
          <ShortagesPanel shortages={kpis.currentShortages} materials={materials} />
          <InventorySnapshot critical={kpis.criticalInventory} materials={materials} />
          <QCPanel lots={lots as any} />
        </div>
      </div>

      <EfficiencyWidget laborSeries={kpis.laborSeries} costPerBottleSeries={kpis.costPerBottleSeries} />
    </div>
  );
}
