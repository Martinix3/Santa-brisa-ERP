
// src/features/influencers/dialogs/CloseCollabDialog.tsx
"use client";
import React, { useEffect, useState } from "react";

export function CloseCollabDialog({
  open, onClose, onSubmit, components
}: {
  open: boolean; onClose: () => void;
  onSubmit: (k:{ cashPaid:number; productCost:number; shippingCost:number; impressions:number; clicks:number; revenue:number; engagements?:number; orders?:number }) => void;
  components: any;
}) {
  const { Input, Header, SBButton } = components;
  const [v,setV] = useState({ cashPaid:"", productCost:"", shippingCost:"", impressions:"", clicks:"", revenue:"", engagements:"", orders:"" });
  const [t,setT] = useState<Record<string, boolean>>({ cashPaid:false, productCost:false, shippingCost:false, impressions:false, clicks:false, revenue:false });
  useEffect(()=>{ if(open){ setV({ cashPaid:"", productCost:"", shippingCost:"", impressions:"", clicks:"", revenue:"", engagements:"", orders:"" }); setT({ cashPaid:false, productCost:false, shippingCost:false, impressions:false, clicks:false, revenue:false }); }},[open]);

  const req:(keyof typeof v)[] = ["cashPaid","productCost","shippingCost","impressions","clicks","revenue"];
  const parse=(s:string)=> s===""?NaN:Number(s);
  const ok=(s:string)=> Number.isFinite(parse(s)) && parse(s)>=0;
  const valid = req.every(k => ok((v as any)[k]));

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden" onClick={(e)=>e.stopPropagation()}>
        <Header title="Registrar Resultados — Cierre Collab" color="#D7713E" />
        <form className="p-4 space-y-3" onSubmit={(e)=>{e.preventDefault(); if(!valid){ setT(p=>req.reduce((a,k)=>({...a,[k]:true}),p as any)); return; } onSubmit({
          cashPaid:Number(v.cashPaid), productCost:Number(v.productCost), shippingCost:Number(v.shippingCost),
          impressions:Number(v.impressions), clicks:Number(v.clicks), revenue:Number(v.revenue),
          engagements: v.engagements===""?undefined:Number(v.engagements),
          orders: v.orders===""?undefined:Number(v.orders),
        }); onClose();}}>
          <div className="grid grid-cols-2 gap-3">
            {(["cashPaid","productCost","shippingCost","impressions","clicks","revenue","engagements","orders"] as const).map((k)=>{
              const label = {cashPaid:"Pago cash (€)",productCost:"Coste producto (€)",shippingCost:"Coste envío (€)",impressions:"Impresiones",clicks:"Clicks",revenue:"Ingresos atribuidos (€)",engagements:"Engagements (opt)",orders:"Pedidos (opt)"}[k];
              const required = ["cashPaid","productCost","shippingCost","impressions","clicks","revenue"].includes(k);
              const error = required && t[k] && !ok((v as any)[k]) ? "Requerido (≥ 0)" : "";
              return (
                <label key={k} className="grid gap-1.5">
                  <span className="text-sm text-zinc-700">{label}{required?" *":""}</span>
                  <Input type="number" value={(v as any)[k]} onBlur={()=>setT(pr=>({...pr,[k]:true}))} onChange={(e:any)=>setV(s=>({...s,[k]:e.target.value}))} className={error?'border-rose-400':''}/>
                  {error && <span className="text-xs text-rose-600">{error}</span>}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit" disabled={!valid}>Guardar y Cerrar</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}
