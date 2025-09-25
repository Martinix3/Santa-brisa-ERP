
// src/features/influencers/components/CollabTable.tsx
"use client";
import React, { useState, useEffect } from "react";
import type { InfluencerCollab, SB_THEME } from "@/domain/ssot";
import { fmtEur, fmtNum } from "../utils/format";
import { StatusPill } from "./StatusPill";
import { Edit, Save, X } from "lucide-react";

export function CollabRow({ c, onUpdate, onCloseRequest }:{
  c: InfluencerCollab; onUpdate:(u:InfluencerCollab)=>void; onCloseRequest:(c:InfluencerCollab)=>void;
}) {
  const [edit,setEdit]=useState(false);
  const [draft,setDraft]=useState<InfluencerCollab>(c);
  useEffect(()=>setDraft(c),[c]);
  const spend=(draft.costs?.cashPaid||0)+(draft.costs?.productCost||0)+(draft.costs?.shippingCost||0);
  const roas=spend>0 ? (draft.tracking?.revenue||0)/spend : 0;

  const Input=(p:any)=><input {...p} className={"h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm "+(p.className||"")} />;

  if(edit){
    return (
      <tr className="bg-yellow-50/40">
        <td className="px-2 py-2"><Input value={draft.creatorName} onChange={(e:any)=>setDraft(d=>({...d,creatorName:e.target.value}))} /></td>
        <td className="px-2 py-2"><Input value={draft.platform} onChange={(e:any)=>setDraft(d=>({...d,platform:e.target.value}))} /></td>
        <td className="px-2 py-2"><Input value={draft.tier as any} onChange={(e:any)=>setDraft(d=>({...d,tier:e.target.value}))} /></td>
        <td className="px-2 py-2"><StatusPill status={draft.status}/></td>
        <td className="px-2 py-2 text-right">{fmtEur(spend)}</td>
        <td className="px-2 py-2 text-right">{fmtEur(draft.tracking?.revenue)}</td>
        <td className="px-2 py-2 text-right">{fmtNum(draft.metrics?.impressions)}</td>
        <td className="px-2 py-2 text-right">{fmtNum(draft.metrics?.engagements)}</td>
        <td className="px-2 py-2 text-right font-semibold">{roas?`${roas.toFixed(2)}x`:'—'}</td>
        <td className="px-2 py-2">
          <div className="flex justify-end gap-1">
            <button className="sb-btn-primary px-2 py-1 rounded bg-zinc-900 text-white text-xs" onClick={()=>{onUpdate({...draft,updatedAt:new Date().toISOString()} as InfluencerCollab); setEdit(false);}}><Save size={14} className="sb-icon"/></button>
            <button className="sb-btn-primary px-2 py-1 rounded border text-xs" onClick={()=>{setDraft(c); setEdit(false);}}><X size={14}/></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-50/40">
      <td className="p-3 font-medium">{c.creatorName}</td>
      <td className="p-3">{c.platform}</td>
      <td className="p-3">{(c.tier as any)||"—"}</td>
      <td className="p-3"><StatusPill status={c.status}/></td>
      <td className="p-3 text-right">{fmtEur((c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0))}</td>
      <td className="p-3 text-right">{fmtEur(c.tracking?.revenue)}</td>
      <td className="p-3 text-right">{fmtNum(c.metrics?.impressions)}</td>
      <td className="p-3 text-right">{fmtNum(c.metrics?.engagements)}</td>
      <td className="p-3 text-right font-semibold">{((c.tracking?.revenue||0)>0 && ((c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0))>0) ? `${(((c.tracking!.revenue!))/(((c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0)))).toFixed(2)}x` : "—"}</td>
      <td className="p-3">
        <div className="flex justify-end gap-1">
          {c.status!=="COMPLETED" && <button className="sb-btn-primary px-2 py-1 rounded border text-xs" onClick={()=>onCloseRequest(c)}>Resultados</button>}
          <button className="sb-btn-primary px-2 py-1 rounded bg-transparent text-xs" onClick={()=>setEdit(true)}><Edit size={14} className="sb-icon"/></button>
        </div>
      </td>
    </tr>
  );
}

export function CollabTable({
  rows, onUpdate, onCloseRequest,
}:{
  rows: InfluencerCollab[]; onUpdate:(u:InfluencerCollab)=>void; onCloseRequest:(c:InfluencerCollab)=>void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left bg-zinc-50">
          <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="p-3">Influencer</th><th className="p-3">Plataforma</th><th className="p-3">Tier</th><th className="p-3">Estado</th>
            <th className="p-3 text-right">Spend</th><th className="p-3 text-right">Revenue</th>
            <th className="p-3 text-right">Impresiones</th><th className="p-3 text-right">Engagements</th><th className="p-3 text-right">ROAS</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map(c => <CollabRow key={c.id} c={c} onUpdate={onUpdate} onCloseRequest={onCloseRequest} />)}
        </tbody>
      </table>
    </div>
  );
}
