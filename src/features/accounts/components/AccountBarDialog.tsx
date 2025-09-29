
// src/features/accounts/components/AccountBarDialog.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import { createInteraction } from "@/app/(app)/agenda/actions";
import { placeOrder } from "@/app/(app)/orders/actions";
import { toast } from "sonner";

export function AccountBarDialog({ open, onOpenChange, accountId }:{
  open:boolean; onOpenChange:(v:boolean)=>void; accountId:string;
}) {
  const { data, currentUser } = useData();
  const router = useRouter();
  const account = useMemo(()=> data?.accounts?.find(a=>a.id===accountId), [data?.accounts, accountId]);

  const [tab, setTab] = useState<"VISITA"|"PEDIDO">("VISITA");
  // Visita
  const [kind, setKind] = useState("VISITA");
  const [note, setNote] = useState("");
  const [plannedFor, setPlannedFor] = useState<string>("");

  // Pedido
  const [lines, setLines] = useState<{sku:string;qty:number;unitPriceReported?:number}[]>([]);
  const skuOptions = useMemo(() =>
    (data?.items || []).map(i => ({ value:i.sku, label:i.name })), [data?.items]);

  const addLine = ()=> setLines(s=>[...s,{sku:"",qty:1}]);

  const saveVisita = async ()=>{
    try {
      await createInteraction({
        accountId, dept:"VENTAS", kind, note,
        plannedFor: plannedFor || undefined,
        createdById: currentUser?.id!,
      });
      toast.success("Visita registrada"); onOpenChange(false);
    } catch(e:any){ toast.error(e.message||"Error"); }
  };

  const savePedido = async ()=>{
    try {
      if (!lines.length) { toast.error("Añade al menos una línea"); return; }
      const created = await placeOrder({ accountId, lines, createdById: currentUser?.id! });
      toast.success("Pedido colocado"); onOpenChange(false);
      router.push(`/orders/${created.id}`);
    } catch(e:any){ toast.error(e.message||"Error"); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{account?.name || "Cuenta"}</h3>
          <button className="text-sm text-zinc-500" onClick={()=>onOpenChange(false)}>Cerrar</button>
        </div>

        <div className="mb-3 flex gap-2">
          <button className={`text-sm px-3 py-1 rounded border ${tab==="VISITA"?"bg-zinc-900 text-white":""}`} onClick={()=>setTab("VISITA")}>Visita</button>
          <button className={`text-sm px-3 py-1 rounded border ${tab==="PEDIDO"?"bg-zinc-900 text-white":""}`} onClick={()=>setTab("PEDIDO")}>Colocar pedido</button>
        </div>

        {tab==="VISITA" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-600">Tipo</label>
                <select className="w-full border rounded px-2 py-1" value={kind} onChange={e=>setKind(e.target.value)}>
                  <option>VISITA</option><option>LLAMADA</option><option>EMAIL</option><option>OTRO</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-600">Fecha/hora</label>
                <input type="datetime-local" className="w-full border rounded px-2 py-1"
                  value={plannedFor} onChange={e=>setPlannedFor(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Nota</label>
              <textarea className="w-full border rounded px-2 py-1" rows={3} value={note} onChange={e=>setNote(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <button className="border rounded px-3 py-1 bg-black text-white" onClick={saveVisita}>Guardar</button>
            </div>
          </div>
        )}

        {tab==="PEDIDO" && (
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
              <button className="text-xs border rounded px-3 py-1" onClick={()=>setLines(s=>[...s,{sku:"",qty:1}])}>Añadir línea</button>
              <button className="border rounded px-3 py-1 bg-black text-white" onClick={savePedido}>Colocar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
