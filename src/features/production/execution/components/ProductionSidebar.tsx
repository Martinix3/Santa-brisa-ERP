// src/features/production/execution/components/ProductionSidebar.tsx
"use client";

import React from "react";
import { ChevronDown, Factory } from 'lucide-react';
import type { ProductionOrder, ProductionStatus, BillOfMaterial as RecipeBom } from '@/domain/ssot';

const mapStatusTone = (s?: ProductionStatus): "emerald" | "amber" | "rose" | "zinc" | "sky" => {
  if (s === "DONE") return "emerald";
  if (s === "CANCELLED") return "zinc";
  if (s === "PAUSED" || s === "QC_HOLD") return "rose";
  if (s === "IN_PROGRESS") return "sky";
  return "amber";
};

function Badge({ children, tone = "zinc" }: {
  children: React.ReactNode; tone?: "zinc" | "sky" | "amber" | "rose" | "emerald";
}) {
  const toneClasses = {
    zinc: "bg-zinc-100 text-zinc-800",
    sky: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    emerald: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${toneClasses[tone]}`}>{children}</span>;
}

function Collapsible({ title, count, defaultOpen = true, children }: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border rounded-xl bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-3 text-sm font-semibold">
        <span className="flex items-center gap-2">{title}</span>
        <span className="flex items-center gap-2">
          {typeof count === "number" && (
            <span className="font-mono text-xs px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded-full">{count}</span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

export function ProductionSidebar({ recipes, orders, onSelectBom, onSelectOrder }: {
  recipes: RecipeBom[];
  orders: ProductionOrder[];
  onSelectBom: (bom: RecipeBom) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}) {
  const { activeOrders, closedOrders } = React.useMemo(() => {
    const active = orders.filter(o => o.status !== "DONE" && o.status !== "CANCELLED");
    const closed = orders.filter(o => o.status === "DONE" || o.status === "CANCELLED");
    return { activeOrders: active, closedOrders: closed };
  }, [orders]);

  return (
    <div className="flex flex-col space-y-4">
      <Collapsible title="Planificar nueva orden" count={recipes.length} defaultOpen>
        <ul className="divide-y">
          {recipes.map(b => (
            <li key={b.id}>
              <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={() => onSelectBom(b)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.name}</span>
                  <Badge tone="sky">BOM</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  <Factory className="inline h-3 w-3 mr-1" />
                  {b.stage === "ENVASADO" ? "Envasado" : "Producción"}
                </p>
              </button>
            </li>
          ))}
          {recipes.length === 0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay recetas.</li>}
        </ul>
      </Collapsible>
      <Collapsible title="Órdenes activas" count={activeOrders.length} defaultOpen>
        <ul className="divide-y">
          {activeOrders.map(o => (
            <li key={o.id}>
              <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={() => onSelectOrder(o)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {o.orderNumber ?? `Orden ${o.id.slice(-4)}`}
                  </span>
                  <Badge tone={mapStatusTone(o.status)}>{o.status}</Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {(recipes.find(b => b.id === (o as any).bomId)?.stage === "ENVASADO" ? "Envasado" : "Producción")} · {o.scheduledFor ? new Date(o.scheduledFor).toLocaleDateString('es-ES') : "-"}
                </p>
              </button>
            </li>
          ))}
          {activeOrders.length === 0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay órdenes activas.</li>}
        </ul>
      </Collapsible>
      <Collapsible title="Histórico de órdenes" count={closedOrders.length} defaultOpen={false}>
        <ul className="divide-y">
          {closedOrders.map(o => (
            <li key={o.id}>
              <button className="w-full px-3 py-2 hover:bg-zinc-50 text-left" onClick={() => onSelectOrder(o)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {o.orderNumber ?? `Orden ${o.id.slice(-4)}`}
                  </span>
                  <Badge tone={mapStatusTone(o.status)}>{o.status}</Badge>
                </div>
              </button>
            </li>
          ))}
          {closedOrders.length === 0 && <li className="px-3 py-4 text-sm text-zinc-500">No hay órdenes completadas.</li>}
        </ul>
      </Collapsible>
    </div>
  );
}
