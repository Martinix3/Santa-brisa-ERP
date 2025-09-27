
// src/features/production/dashboard/components/OrdersTimeline.tsx
"use client";
import React from "react";
import type { ProductionOrder, ProductionStatus } from "@/domain/ssot";

const badge = (s: ProductionStatus) => ({
  PLANNED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  QC_HOLD: 'bg-purple-100 text-purple-800',
  CLOSED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
  PACKAGING: 'bg-cyan-100 text-cyan-800',
}[s] || 'bg-zinc-100 text-zinc-600');

export function OrdersTimeline({ orders }:{ orders: ProductionOrder[] }){
  const sorted = [...(orders || [])].sort((a,b)=> new Date(b.scheduledFor||b.createdAt).getTime() - new Date(a.scheduledFor||a.createdAt).getTime());
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge(o.status)}`}>{o.status.toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
