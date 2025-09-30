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
import { SBCard } from "@/components/ui/ui-primitives";
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";
import { SB_THEME, type ProductionOrder, type BillOfMaterial, type Item, type OnHandView, Uom } from "@/domain/ssot";


// MOCK DATA FOR DEMO
const MOCK_ITEMS: Item[] = [
  { id: 'item_sb_750', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'fg', uom: 'uds', active: true, stdCost: 8.5 },
  { id: 'item_agave', sku: 'RM-AGAVE-01', name: 'Agave Crudo', category: 'raw', uom: 'kg', active: true, stdCost: 2.1 },
  { id: 'item_botella', sku: 'PKG-BOTELLA-STD', name: 'Botella Vidrio 750ml', category: 'pack', uom: 'uds', active: true, stdCost: 0.8 },
];

const MOCK_RECIPES: BillOfMaterial[] = [
    { id: 'bom_sb_750', outputItemId: 'item_sb_750', name: 'Receta Santa Brisa', batchSize: 100, baseUnit: 'L', items: [
        { itemId: 'item_agave', qty: 20, uom: 'kg' },
        { itemId: 'item_botella', qty: 133, uom: 'uds' }
    ]}
];

const MOCK_ON_HAND: OnHandView[] = [
  { id: 'oh_1', itemId: 'item_sb_750', lotNumber: 'L240801-A', locationId: 'FG/MAIN', qty: 120, reservedQty: 20, uom: 'uds', qcStatus: 'PASSED', category: 'fg', expiryAt: '2026-08-01T00:00:00Z', createdAt: '2024-08-01T00:00:00Z', updatedAt: '2024-08-10T00:00:00Z' },
  { id: 'oh_3', itemId: 'item_sb_750', lotNumber: 'L240815-A', locationId: 'QC/AREA', qty: 200, reservedQty: 0, uom: 'uds', qcStatus: 'PENDING', category: 'fg', createdAt: '2024-08-15T00:00:00Z', updatedAt: '2024-08-15T00:00:00Z' },
  { id: 'oh_4', itemId: 'item_agave', lotNumber: 'RM-AG-240805', locationId: 'RM/MAIN', qty: 50, reservedQty: 0, uom: 'kg', qcStatus: 'PASSED', category: 'raw', createdAt: '2024-08-05T00:00:00Z', updatedAt: '2024-08-05T00:00:00Z' },
];

const MOCK_ORDERS: ProductionOrder[] = [
    { id: 'po_1', baseUnit: 'L' as Uom, orderNumber: 'PO-2024-001', bomId: 'bom_sb_750', outputItemId: 'item_sb_750', targetQuantity: 100, status: 'PLANNED', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), shortages: [{itemId: 'item_agave', required: 20, available: 5, missing: 15, uom: 'kg'}] },
    { id: 'po_2', baseUnit: 'L' as Uom, orderNumber: 'PO-2024-002', bomId: 'bom_sb_750', outputItemId: 'item_sb_750', targetQuantity: 200, status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'po_3', baseUnit: 'L' as Uom, orderNumber: 'PO-2024-003', bomId: 'bom_sb_750', outputItemId: 'item_sb_750', targetQuantity: 150, status: 'DONE', createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), execution: { finishedAt: new Date(Date.now() - 8 * 86400000).toISOString(), goodUnits: 148, durationHours: 6 }, costing: { actual: { perUnit: 8.6, yieldLossPct: 1.3 } } },
];


export default function ProductionDashboardPage() {
  const { data } = { data: {
      billOfMaterials: MOCK_RECIPES,
      items: MOCK_ITEMS,
      onHand: MOCK_ON_HAND,
      productionOrders: MOCK_ORDERS,
  }};
  const { billOfMaterials: recipes, items, onHand, productionOrders: orders } = data || {};
  
  const kpis = useMemo(()=> {
      if (!orders || !recipes || !onHand || !items) return null;
      return computeKpis({ orders: orders as any, recipes: recipes as any, onHand: onHand as any, items });
  }, [orders, recipes, onHand, items]);

  if (!data || !kpis) return <div className="p-6">Cargando dashboard…</div>;

  return (
    <div className="space-y-6">
      <KpiCards kpis={kpis} />

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SBCard title="Avance de Producción vs. Planificado (Últimos 30 días)">
            <BottlingProgress data={kpis.progressSeries} />
          </SBCard>
          <OrdersTimeline orders={orders as ProductionOrder[]} />
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
       
       {/* Botón de acción flotante, sin acción por ahora */}
       <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center z-40 hover:bg-zinc-800 transition-colors">
            <Plus size={24} />
       </button>
    </div>
  );
}
