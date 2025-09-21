"use client";
import React, { useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { computeKpis } from "./kpis";
import { KpiCards } from "./components/KpiCards";
import { OrdersTimeline } from "./components/OrdersTimeline";
import { ShortagesPanel } from "./components/ShortagesPanel";
import { InventorySnapshot } from "./components/InventorySnapshot";
import { QCPanel } from "./components/QCPanel";
import { BottlingProgress } from "./components/BottlingProgress";
import { EfficiencyWidget } from "./components/EfficiencyWidget";

export default function ProductionDashboardPage(){
  const { data } = useData();
  const { billOfMaterials: recipes, materials, inventory, productionOrders: orders, lots } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !inventory || !lots || !materials) return null;
      return computeKpis({ orders, recipes, inventory, lots, materials });
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
          <OrdersTimeline orders={orders} />
        </div>
        <div className="space-y-6">
          <ShortagesPanel shortages={kpis.currentShortages} materials={materials} />
          <InventorySnapshot critical={kpis.criticalInventory} materials={materials} />
          <QCPanel lots={lots} />
        </div>
      </div>

      <EfficiencyWidget laborSeries={kpis.laborSeries} costPerBottleSeries={kpis.costPerBottleSeries} />
    </div>
  );
}
