// src/app/(app)/production/dashboard/page.tsx
"use client";
import React, { useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { computeKpis } from "@/features/production/dashboard/kpis";
import { KpiCards } from "@/features/production/dashboard/components/KpiCards";
import { OrdersTimeline } from "@/features/production/dashboard/components/OrdersTimeline";
import { ShortagesPanel } from "@/features/production/dashboard/components/ShortagesPanel";
import { InventorySnapshot } from "@/features/production/dashboard/components/InventorySnapshot";
import { QCPanel } from "@/features/production/dashboard/components/QCPanel";
import { BottlingProgress } from "@/features/production/dashboard/components/BottlingProgress";
import { EfficiencyWidget } from "@/features/production/dashboard/components/EfficiencyWidget";
import { Plus } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";

export default function ProductionDashboardPage() {
  const { data } = useData();
  const { billOfMaterials: recipes, materials, inventory, productionOrders: orders, lots } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !inventory || !lots || !materials) return null;
      return computeKpis({ orders: orders as any, recipes: recipes as any, inventory: inventory as any, lots: lots as any, materials });
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
          <OrdersTimeline orders={orders as any} />
        </div>
        <div className="space-y-6">
          <ShortagesPanel shortages={kpis.currentShortages} materials={materials as any} />
          <InventorySnapshot critical={kpis.criticalInventory} materials={materials as any} />
          <QCPanel lots={lots as any} />
        </div>
      </div>
      
       <SBCard title="Análisis de Eficiencia (Últimos 30 días)">
         <EfficiencyWidget laborSeries={kpis.laborSeries} costPerBottleSeries={kpis.costPerBottleSeries} />
       </SBCard>
       
       {/* Botón de acción flotante, sin acción por ahora */}
       <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center z-40 hover:bg-zinc-800 transition-colors">
            <Plus size={24}/>
       </button>
    </div>
  );
}
