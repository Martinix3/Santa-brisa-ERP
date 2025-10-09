// src/features/production/execution/components/ProductionSidebar.tsx
"use client";
import React from 'react';
import { SBCard, Badge } from '@/components/ui/ui-primitives';
import type { ProductionOrder, BillOfMaterial as RecipeBom, ProductionStatus } from '@/domain/ssot.v7';
import { Plus, Check, Clock } from "lucide-react";
import { useData } from '@/lib/dataprovider';

// Mapeo de estados de producción a las variantes semánticas del componente Badge.
const statusVariantMap: Record<ProductionStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
    PLANNED: 'secondary',
    IN_PROGRESS: 'default',
    PAUSED: 'secondary',
    DONE: 'success',
    CANCELLED: 'destructive',
    RELEASED: 'success',
    QC_HOLD: 'secondary',
};

// Definición de la interfaz para las props del componente.
interface ProductionSidebarProps {
  recipes: RecipeBom[];
  orders: ProductionOrder[];
  onSelectBom: (bom: RecipeBom) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}

export function ProductionSidebar({ recipes, orders, onSelectBom, onSelectOrder }: ProductionSidebarProps): React.ReactElement {
  const { data } = useData();
  const items = data?.items || [];
  
  const activeOrders = orders.filter((o: ProductionOrder) => o.status !== 'DONE' && o.status !== 'CANCELLED');
  const pastOrders = orders.filter((o: ProductionOrder) => o.status === 'DONE' || o.status === 'CANCELLED');

  return (
    <div className="space-y-4">
      <SBCard title={<div className="flex items-center gap-2"><Plus size={16}/><span>Planificar nueva orden</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {recipes.map(bom => {
            const outputItem = items.find((i: any) => i.id === bom.outputItemId);
            return (
              <button key={bom.id} onClick={() => onSelectBom(bom)} className="w-full text-left p-2 rounded-lg hover:bg-secondary">
                <p className="font-semibold text-sm">{outputItem?.name || bom.outputItemId}</p>
                <p className="text-xs text-muted-foreground">{bom.name}</p>
              </button>
            );
          })}
        </div>
      </SBCard>

      <SBCard title={<div className="flex items-center gap-2"><Clock size={16}/><span>Órdenes activas</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {activeOrders.map(order => {
            const outputItem = items.find((i: any) => i.id === order.outputItemId);
            return (
              <button key={order.id} onClick={() => onSelectOrder(order)} className="w-full text-left p-2 rounded-lg hover:bg-secondary">
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{outputItem?.name || order.outputItemId}</p>
                    <Badge variant={statusVariantMap[order.status] || 'secondary'}>{order.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{order.orderNumber || order.id}</p>
              </button>
            );
          })}
        </div>
      </SBCard>

      <SBCard title={<div className="flex items-center gap-2"><Check size={16}/><span>Histórico</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {pastOrders.map(order => (
            <button key={order.id} onClick={() => onSelectOrder(order)} className="w-full text-left p-2 rounded-lg hover:bg-secondary">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">{order.orderNumber || order.id}</p>
                <Badge variant={statusVariantMap[order.status] || 'secondary'}>{order.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </SBCard>
    </div>
  );
}
