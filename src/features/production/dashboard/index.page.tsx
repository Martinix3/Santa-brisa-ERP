// src/features/production/dashboard/index.page.tsx
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
import { Plus } from 'lucide-react';
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";
import { SB_THEME, type ProductionOrder, type BillOfMaterial, type Item, type OnHand, Uom } from "@/domain/ssot";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SBCard className="h-24"><div className="sb-skeleton h-full w-full"></div></SBCard>
        <SBCard className="h-24"><div className="sb-skeleton h-full w-full"></div></SBCard>
        <SBCard className="h-24"><div className="sb-skeleton h-full w-full"></div></SBCard>
        <SBCard className="h-24"><div className="sb-skeleton h-full w-full"></div></SBCard>
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SBCard className="h-64"><div className="sb-skeleton h-full w-full"></div></SBCard>
          <SBCard className="h-48"><div className="sb-skeleton h-full w-full"></div></SBCard>
        </div>
        <div className="space-y-6">
          <SBCard className="h-40"><div className="sb-skeleton h-full w-full"></div></SBCard>
          <SBCard className="h-40"><div className="sb-skeleton h-full w-full"></div></SBCard>
        </div>
      </div>
    </div>
  );
}

export default function ProductionDashboardPage() {
  const { data } = useData();
  const { billOfMaterials: recipes, items, onHand, productionOrders: orders } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !onHand || !items) return null;
      return computeKpis({ orders: orders as any, recipes: recipes as any, onHand: onHand as any, items });
  }, [orders, recipes, onHand, items]);

  if (!data || !kpis) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <KpiCards kpis={kpis} />

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SBCard title="Avance de Producción vs. Planificado (Últimos 30 días)">
            <BottlingProgress data={kpis.progressSeries} />
          </SBCard>
          <OrdersTimeline orders={orders || []} />
        </div>
        <div className="space-y-6">
          <ShortagesPanel shortages={kpis.currentShortages} items={items || []} />
          <InventorySnapshot critical={kpis.criticalInventory} items={items || []}/>
          <QCPanel lots={onHand || []} />
          <UpcomingTasks department="PRODUCCION" />
        </div>
      </div>
      
       <SBCard title="Análisis de Eficiencia (Últimos 30 días)">
         <EfficiencyWidget laborSeries={kpis.laborSeries} costPerUnitSeries={kpis.costPerUnitSeries} />
       </SBCard>
       
       <SBButton 
         variant="primary"
         className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 p-0"
         aria-label="Añadir nueva orden"
       >
            <Plus size={24} />
       </SBButton>
    </div>
  );
}
