// src/features/production/dashboard/components/OrdersTimeline.tsx
"use client";
import React from "react";
import type { ProductionOrder, ProductionStatus } from "@/domain/ssot";

const badge = (s:ProductionOrder['status'])=> ({
  PLANNED: 'bg-amber-100 text-amber-800',
  RELEASED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
  PAUSED: 'bg-gray-100 text-gray-600',
  QC_HOLD: 'bg-purple-100 text-purple-800',
}[s] || 'bg-zinc-100 text-zinc-600');

export function OrdersTimeline({ orders }:{ orders: ProductionOrder[] }){
  const sorted = [...(orders || [])].sort((a,b)=> new Date(a.scheduledFor||a.createdAt).getTime() - new Date(b.scheduledFor||b.createdAt).getTime());
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500 mb-3">Órdenes recientes</div>
      <ul className="space-y-2">
        {sorted.slice(0,12).map(o => (
          <li key={o.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 py-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{o.orderNumber || o.id} · {o.outputItemId}</div>
              <div className="text-xs text-zinc-500">{o.scheduledFor ? new Date(o.scheduledFor).toLocaleString() : new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge(o.status)}`}>{o.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
