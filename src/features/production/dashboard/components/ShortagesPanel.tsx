"use client";
import React from "react";
import type { Item } from "@/domain/ssot";

export function ShortagesPanel({ shortages, items }:{ shortages: any[]; items: Item[] }){
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500 mb-3">Faltantes en órdenes planificadas</div>
      {!shortages?.length ? (
        <div className="text-sm text-zinc-600 text-center p-4">Sin faltantes pendientes 🎉</div>
      ) : (
        <ul className="space-y-2">
          {shortages.slice(0,12).map((s,i)=>{
            const item = items.find(m=>m.id===s.itemId);
            return (
              <li key={i} className="flex items-center justify-between gap-2 border-b last:border-b-0 py-2">
                <div className="text-sm">
                  <span className="font-medium">{item?.name || s.itemId}</span>
                  <span className="text-zinc-500"> · Req {s.required.toFixed(2)} / Disp {s.available.toFixed(2)} {s.uom}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">FALTA {(s.required - s.available).toFixed(2)} {s.uom}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
