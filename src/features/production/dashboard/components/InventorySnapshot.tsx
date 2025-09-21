"use client";
import React from "react";
import type { Material } from "@/domain/ssot";

export function InventorySnapshot({ critical, materials }:{ critical: { sku: string; qty: number }[], materials: Material[] }){
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500 mb-3">Inventario crítico (RM/PKG)</div>
      {!critical?.length ? (
        <div className="text-sm text-zinc-600 p-4 text-center">Stock saludable</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr><th className="font-normal">Material</th><th className="text-right font-normal">Stock</th></tr>
          </thead>
          <tbody>
            {critical.map(it=> (
              <tr key={it.sku} className="border-t">
                <td className="py-1">{materials.find(m => m.sku === it.sku)?.name || it.sku}</td>
                <td className="py-1 text-right font-medium">{it.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
