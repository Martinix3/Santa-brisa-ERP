// src/app/(app)/production/dashboard/page.tsx
"use client";
import React, { useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { DEPT_META } from "@/domain/ssot";
import { computeKpis } from "@/features/production/dashboard/kpis";
import { KpiCards } from "@/features/production/dashboard/components/KpiCards";
import { OrdersTimeline } from "@/features/production/dashboard/components/OrdersTimeline";
import { ShortagesPanel } from "@/features/production/dashboard/components/ShortagesPanel";
import { InventorySnapshot } from "@/features/production/dashboard/components/InventorySnapshot";
import { QCPanel } from "@/features/production/dashboard/components/QCPanel";
import { BottlingProgress } from "@/features/production/dashboard/components/BottlingProgress";
import { EfficiencyWidget } from "@/features/production/dashboard/components/EfficiencyWidget";
import { Plus } from 'lucide-react';
import { SBCard } from "@/components/ui/ui-primitives";
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";


export default function ProductionDashboardPage() {
  const { data } = useData();
  const { config } = useSystemConfig();
  
  // Obtener colores del departamento PRODUCCION desde SSOT
  const produccionTheme = config?.theme.departments.PRODUCCION || DEPT_META.PRODUCCION;
  const { billOfMaterials: recipes, items, onHand, productionOrders: orders } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !onHand || !items) return null;
      return computeKpis({ orders: orders as any, recipes: recipes as any, onHand: onHand as any, items });
  }, [orders, recipes, onHand, items]);

  if (!data || !kpis) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: produccionTheme.color }}>
          Dashboard de Producción
        </h1>
        <div>Cargando datos de producción...</div>
      </div>
    );
  }

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
       
       {/* Botón de acción flotante */}
       <button 
         className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
         style={{ 
           backgroundColor: produccionTheme.color,
           color: produccionTheme.textColor
         }}
         onMouseEnter={(e) => {
           e.currentTarget.style.opacity = '0.9';
         }}
         onMouseLeave={(e) => {
           e.currentTarget.style.opacity = '1';
         }}
       >
            <Plus size={24} />
       </button>
    </div>
  );
}
