// src/features/production/execution/components/ProductionSidebar.tsx
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { ProductionOrder, BillOfMaterial as RecipeBom } from '@/domain/ssot';
import { Plus, Check, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
    PLANNED: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
};

export function ProductionSidebar({ recipes, orders, onSelectBom, onSelectOrder }: {
  recipes: RecipeBom[];
  orders: ProductionOrder[];
  onSelectBom: (bom: RecipeBom) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}) {
  const activeOrders = orders.filter(o => o.status !== 'DONE' && o.status !== 'CANCELLED');
  const pastOrders = orders.filter(o => o.status === 'DONE' || o.status === 'CANCELLED');

  return (
    <div className="space-y-4">
      <SBCard title={<div className="flex items-center gap-2"><Plus size={16}/><span>Planificar nueva orden</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {recipes.map(bom => (
            <button key={bom.id} onClick={() => onSelectBom(bom)} className="w-full text-left p-2 rounded-lg hover:bg-zinc-100">
              <p className="font-medium text-sm">{bom.name}</p>
              <p className="text-xs text-zinc-500">{bom.outputItemId}</p>
            </button>
          ))}
        </div>
      </SBCard>

      <SBCard title={<div className="flex items-center gap-2"><Clock size={16}/><span>Órdenes activas</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {activeOrders.map(order => (
            <button key={order.id} onClick={() => onSelectOrder(order)} className="w-full text-left p-2 rounded-lg hover:bg-zinc-100">
              <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{order.orderNumber || order.id}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-zinc-100'}`}>{order.status}</span>
              </div>
              <p className="text-xs text-zinc-500">{order.outputItemId}</p>
            </button>
          ))}
        </div>
      </SBCard>

      <SBCard title={<div className="flex items-center gap-2"><Check size={16}/><span>Histórico</span></div>}>
        <div className="p-2 max-h-60 overflow-y-auto">
          {pastOrders.map(order => (
            <button key={order.id} onClick={() => onSelectOrder(order)} className="w-full text-left p-2 rounded-lg hover:bg-zinc-100">
              <p className="font-medium text-sm">{order.orderNumber || order.id}</p>
              <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </SBCard>
    </div>
  );
}
