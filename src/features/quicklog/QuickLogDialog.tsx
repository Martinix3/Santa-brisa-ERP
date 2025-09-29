// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import { createInteraction } from "@/app/(app)/agenda/actions";
import { placeOrder } from "@/app/(app)/orders/actions";
import { isSales } from "@/lib/authz";
import { toast } from "sonner";

export function QuickLogDialog({ open, onOpenChange }:{
  open: boolean; onOpenChange: (v:boolean)=>void;
}) {
  const { data, currentUser } = useData();
  const router = useRouter();

  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState("VISITA");
  const [note, setNote] = useState("");
  const [plannedFor, setPlannedFor] = useState<string>("");
  const [addOrder, setAddOrder] = useState(false);
  const [lines, setLines] = useState<{sku:string;qty:number;unitPriceReported?:number}[]>([]);
  const canUse = isSales(currentUser?.role) || currentUser?.role==="admin";

  const accountOptions = useMemo(() =>
    (data?.accounts || []).map(a => ({ value:a.id, label:a.name })), [data?.accounts]);
  const skuOptions = useMemo(() =>
    (data?.items || []).map(i => ({ value:i.sku, label:i.name })), [data?.items]);

  const addLine = ()=> setLines(s => [...s, { sku:"", qty:1 }]);
  const removeLine = (idx:number)=> setLines(s => s.filter((_,i)=>i!==idx));

  const save = async ()=>{
    try {
      if (!canUse) return;
      if (!accountId) { toast.error("Selecciona una cuenta"); return; }

      // 1) Interacción
      await createInteraction({
        accountId, dept:"VENTAS", kind, note,
        plannedFor: plannedFor || undefined,
        createdById: currentUser?.id!,
      });

      // 2) Pedido (opcional)
      if (addOrder) {
        if (!lines.length) { toast.error("Añade al menos una línea"); return; }
        const created = await placeOrder({
          accountId, lines, createdById: currentUser?.id!,
        });
        toast.success("Pedido colocado");
        router.push(`/orders/${created.id}`);
      } else {
        toast.success("Interacción registrada");
      }

      onOpenChange(false);
      // reset
      setLines([]); setAddOrder(false); setNote(""); setPlannedFor("");
    } catch (e:any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">QuickLog Comercial</h3>
          <button className="text-sm text-zinc-500" onClick={()=>onOpenChange(false)}>Cerrar</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-600">Cuenta</label>
            <select className="w-full border rounded px-2 py-1"
              value={accountId} onChange={e=>setAccountId(e.target.value)}>
              <option value="">Selecciona cuenta</option>
              {accountOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-600">Tipo</label>
              <select className="w-full border rounded px-2 py-1" value={kind} onChange={e=>setKind(e.target.value)}>
                <option>VISITA</option>
                <option>LLAMADA</option>
                <option>EMAIL</option>
                <option>OTRO</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Fecha/hora (opcional)</label>
              <input type="datetime-local" className="w-full border rounded px-2 py-1"
                value={plannedFor} onChange={e=>setPlannedFor(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-600">Nota</label>
            <textarea className="w-full border rounded px-2 py-1" rows={3}
              value={note} onChange={e=>setNote(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input id="addOrder" type="checkbox" checked={addOrder} onChange={e=>setAddOrder(e.target.checked)} />
            <label htmlFor="addOrder" className="text-sm">Añadir pedido de colocación</label>
          </div>

          {addOrder && (
            <div className="space-y-2 border rounded-lg p-3">
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
                  <button className="text-xs border rounded px-2" onClick={()=>removeLine(idx)}>Quitar</button>
                </div>
              ))}
              <button className="text-xs border rounded px-3 py-1" onClick={addLine}>Añadir línea</button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="border rounded px-3 py-1" onClick={()=>onOpenChange(false)}>Cancelar</button>
          <button className="border rounded px-3 py-1 bg-black text-white" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
