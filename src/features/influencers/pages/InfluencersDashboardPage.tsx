
// src/features/influencers/pages/InfluencersDashboardPage.tsx
"use client";
import React, { useMemo, useState } from "react";
import { useCollabsService } from "../services/collabs.service";
import { CollabKpiCards } from "../components/CollabKpiCards";
import { CollabTable } from "../components/CollabTable";
import { buildCollabInsights } from "../insights/buildCollabInsights";
import { NewCollabDialog } from "../dialogs/NewCollabDialog";
import { CloseCollabDialog } from "../dialogs/CloseCollabDialog";
import type { InfluencerCollab } from "@/domain/ssot";

export default function InfluencersDashboardPage({ components }:{ components:any }) {
  const { SBButton, SBCard } = components;
  const { collabs, createCollab, updateCollab, closeCollab } = useCollabsService();
  const [openNew,setOpenNew]=useState(false);
  const [closing,setClosing]=useState<InfluencerCollab | null>(null);
  const [editing, setEditing] = useState<InfluencerCollab | null>(null);

  const insights = useMemo(()=> buildCollabInsights(collabs, 200), [collabs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-zinc-800">Influencer Marketing — Colaboraciones</h1>
        <SBButton onClick={()=>setOpenNew(true)}>Nueva colaboración</SBButton>
      </div>

      <CollabKpiCards collabs={collabs} />

      <SBCard title="Leaderboard (prioridad de acción)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="p-2">Creador</th><th className="p-2">Plataforma</th>
                <th className="p-2 text-right">ROAS</th><th className="p-2 text-right">CPC</th>
                <th className="p-2 text-right">CPM</th><th className="p-2 text-right">CPE</th>
                <th className="p-2 text-right">CTR</th><th className="p-2 text-right">Pedidos</th>
                <th className="p-2 text-right">Score</th><th className="p-2">Etiqueta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {insights.map(r=>(
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="p-2 font-medium">{r.creatorName}</td>
                  <td className="p-2">{r.platform}</td>
                  <td className="p-2 text-right">{r._stats.roas ? `${r._stats.roas.toFixed(2)}x` : "—"}</td>
                  <td className="p-2 text-right">{r._stats.cpc ? r._stats.cpc.toFixed(2)+" €" : "—"}</td>
                  <td className="p-2 text-right">{r._stats.cpm ? r._stats.cpm.toFixed(2)+" €" : "—"}</td>
                  <td className="p-2 text-right">{r._stats.cpe ? r._stats.cpe.toFixed(2)+" €" : "—"}</td>
                  <td className="p-2 text-right">{r._stats.ctr ? (r._stats.ctr*100).toFixed(2)+"%" : "—"}</td>
                  <td className="p-2 text-right">{r.metrics?.orders ?? "—"}</td>
                  <td className="p-2 text-right">{r._score.toFixed(2)}</td>
                  <td className="p-2">
                    <span className={
                      r._label==='WIN'   ? 'px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700' :
                      r._label==='SCALE' ? 'px-2 py-1 text-xs rounded bg-blue-100 text-blue-700' :
                      r._label==='FIX'   ? 'px-2 py-1 text-xs rounded bg-amber-100 text-amber-700' :
                                           'px-2 py-1 text-xs rounded bg-rose-100 text-rose-700'
                    }>{r._label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SBCard>

      <SBCard title="Listado de Colaboraciones">
        <CollabTable
          rows={collabs}
          onUpdate={updateCollab}
          onCloseRequest={(c)=>setClosing(c)}
        />
      </SBCard>

      <NewCollabDialog open={openNew} onClose={()=>setOpenNew(false)} onSave={createCollab} components={components} />
      <CloseCollabDialog open={!!closing} onClose={()=>setClosing(null)} onSubmit={(k)=>closing && closeCollab(closing, k)} components={components} />
    </div>
  );
}
