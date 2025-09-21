
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
import { SBCard } from "@/components/ui/ui-primitives";
import { Plus } from 'lucide-react';

export default function ProductionDashboardPage(){
  const { data } = useData();
  const { billOfMaterials: recipes, materials, inventory, productionOrders: orders, lots } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !inventory || !lots || !materials) return null;
      return computeKpis({ orders, recipes, inventory, lots, materials });
  }, [orders, recipes, inventory, lots, materials]);

  if (!data || !kpis) return <div className="p-6">Cargando dashboard…</div>;

  return (
    <div className="p-6 space-y-6 bg-zinc-50 flex-grow">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard de Producción</h1>
        <p className="text-sm text-zinc-500">Plan ↔ ejecución, mermas, costes y calidad</p>
      </header>

      <KpiCards kpis={kpis} />

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SBCard title="Avance de Producción vs. Planificado (Últimos 30 días)">
            <BottlingProgress data={kpis.progressSeries} />
          </SBCard>
          <OrdersTimeline orders={orders || []} />
        </div>
        <div className="space-y-6">
          <ShortagesPanel shortages={kpis.currentShortages} materials={materials || []} />
          <InventorySnapshot critical={kpis.criticalInventory} materials={materials || []}/>
          <QCPanel lots={lots || []} />
        </div>
      </div>
      
       <SBCard title="Análisis de Eficiencia (Últimos 30 días)">
         <EfficiencyWidget laborSeries={kpis.laborSeries} costPerBottleSeries={kpis.costPerBottleSeries} />
       </SBCard>
       
       <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center z-40 hover:bg-zinc-800 transition-colors">
            <Plus size={24}/>
       </button>
    </div>
  );
}
