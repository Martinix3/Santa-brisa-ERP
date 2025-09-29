
// src/features/orders/components/QuickPlacementOrderCard.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import { placeOrder } from "@/app/(app)/orders/actions";
import { toast } from "sonner";

export function QuickPlacementOrderCard({ accountId }:{ accountId:string }) {
  const { data, currentUser } = useData();
  const router = useRouter();
  const [lines, setLines] = useState<{ sku:string; qty:number; unitPriceReported?:number }[]>([]);
  const skuOptions = useMemo(() => (data?.items || []).map(i => ({ value: i.sku, label: i.name })), [data?.items]);

  const add = ()=> setLines(s=>[...s,{sku:"",qty:1}]);

  const save = async ()=>{
    try {
      if (!lines.length) { toast.error("Añade al menos una línea"); return; }
      const created = await placeOrder({ accountId, lines, createdById: currentUser?.id! });
      toast.success("Pedido colocado"); router.push(`/orders/${created.id}`);
    } catch(e:any){ toast.error(e.message||"Error"); }
  };

  return (
    <div className="border rounded-xl p-4 bg-white">
      <h3 className="font-semibold mb-3">Pedido rápido (colocación)</h3>
      <div className="space-y-2">
        {lines.map((l,idx)=>(
          <div key={idx} className="flex gap-2">
            <select className="border rounded px-2 py-1 flex-1" value={l.sku}
              onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,sku:e.target.value}:x))}>
              <option value="">SKU</option>
              {skuOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="number" min={1} className="border rounded px-2 py-1 w-24" value={l.qty}
              onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,qty:Math.max(1, Number(e.target.value)||1)}:x))} />
            <input type="number" step="0.01" placeholder="€ opcional" className="border rounded px-2 py-1 w-28"
              value={l.unitPriceReported ?? ""} onChange={e=>setLines(s=>s.map((x,i)=>i===idx?{...x,unitPriceReported:Number(e.target.value)||undefined}:x))} />
            <button className="text-xs border rounded px-2" onClick={()=>setLines(s=>s.filter((_,i)=>i!==idx))}>Quitar</button>
          </div>
        ))}
        <div className="flex justify-between">
          <button className="text-xs border rounded px-3 py-1" onClick={add}>Añadir línea</button>
          <button className="border rounded px-3 py-1 bg-black text-white" onClick={save}>Colocar</button>
        </div>
      </div>
    </div>
  );
}
