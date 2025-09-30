// src/app/(app)/marketing/online/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useData } from "@/lib/dataprovider";
import type { OnlineCampaign } from "@/domain/ssot";
import { SBButton, SBCard } from "@/components/ui/ui-primitives";
import { Plus } from "lucide-react";
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { PaidKpiCards } from '@/features/marketing/components/PaidKpiCards';
import { CampaignRow } from '@/features/marketing/components/CampaignRow';
import { NewCampaignDialog } from '@/features/marketing/components/NewCampaignDialog';
import { buildPaidInsights } from '@/features/marketing/services/insights.service';

/* =========================
   Página principal
========================= */
export default function OnlineCampaignsPage() {
  const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
  const router = useRouter();
  const [openCreate, setOpenCreate] = useState(false);
  const [closing, setClosing] = useState<OnlineCampaign | null>(null);

  const campaigns = useMemo(()=> santaData?.onlineCampaigns || [], [santaData]);

  async function persist(next: OnlineCampaign[]) {
    setData(prev => prev ? ({ ...prev, onlineCampaigns: next }) : prev);
    if (isPersistenceEnabled) await saveCollection("onlineCampaigns", next);
  }

  async function handleCreate(input: Omit<OnlineCampaign, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    if (!santaData) return;
    const now = new Date().toISOString();
    const doc: OnlineCampaign = {
      id: `online_${Date.now()}`,
      status: "planned",
      spend: 0,
      metrics: { impressions: 0, clicks: 0, revenue: 0 },
      createdAt: now,
      updatedAt: now,
      ...input,
    } as OnlineCampaign;
    await persist([ ...campaigns, doc ]);
  }

  async function handleUpdate(updated: OnlineCampaign) {
    const next = campaigns.map((c: OnlineCampaign) => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : c);
    await persist(next);
  }

  const handleSuccess = (result: {entityId: string, payload: any}) => {
    const { entityId, payload } = result;
    const next = campaigns.map((c: OnlineCampaign) => {
        if (c.id !== entityId) return c;
        const ctr = payload.impressions! > 0 ? payload.clicks! / payload.impressions! : 0;
        const cpc = payload.clicks! > 0 ? payload.spend! / payload.clicks! : 0;
        const cpm = payload.impressions! > 0 ? payload.spend! / (payload.impressions! / 1000) : 0;

        return {
            ...c,
            status: "closed",
            spend: payload.spend,
            metrics: {
            ...c.metrics,
            impressions: payload.impressions,
            clicks: payload.clicks,
            revenue: payload.spend! * payload.roas!,
            roas: payload.roas,
            ctr, cpc, cpm,
            updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        } as OnlineCampaign;
    });
    persist(next);
    toast.success('Resultados de la campaña guardados.');
    router.refresh();
    setClosing(null);
  };

  const handleError = (msg: string) => {
    toast.error(`Error: ${msg}`);
  };

  const insights = useMemo(()=> buildPaidInsights(campaigns, 300), [campaigns]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-zinc-800">Paid Media — Campañas Online</h1>
          <SBButton onClick={()=>setOpenCreate(true)}><Plus size={16} className="sb-icon mr-2" /> Nueva campaña</SBButton>
        </div>

        <PaidKpiCards campaigns={campaigns} />

        <SBCard title="Leaderboard (prioridad de acción)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="p-2">Campaña</th>
                  <th className="p-2">Canal</th>
                  <th className="p-2 text-right">ROAS</th>
                  <th className="p-2 text-right">CPC</th>
                  <th className="p-2 text-right">CPM</th>
                  <th className="p-2 text-right">CTR</th>
                  <th className="p-2 text-right">Pedidos</th>
                  <th className="p-2 text-right">Score</th>
                  <th className="p-2">Etiqueta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {insights.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="p-2 font-medium">{row.title}</td>
                    <td className="p-2">{row.channel}</td>
                    <td className="p-2 text-right">{row._stats.roas ? `${row._stats.roas.toFixed(2)}x` : "—"}</td>
                    <td className="p-2 text-right">{row._stats.cpc ? `${row._stats.cpc.toFixed(2)} €` : "—"}</td>
                    <td className="p-2 text-right">{row._stats.cpm ? `${row._stats.cpm.toFixed(2)} €` : "—"}</td>
                    <td className="p-2 text-right">{row._stats.ctr !== undefined ? `${(row._stats.ctr*100).toFixed(2)}%` : "—"}</td>
                    <td className="p-2 text-right">{row.metrics?.orders || "—"}</td>
                    <td className="p-2 text-right">{row._score.toFixed(2)}</td>
                    <td className="p-2">
                      <span className={
                        row._label==='WIN'   ? 'px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700' :
                        row._label==='SCALE' ? 'px-2 py-1 text-xs rounded bg-blue-100 text-blue-700' :
                        row._label==='FIX'   ? 'px-2 py-1 text-xs rounded bg-amber-100 text-amber-700' :
                                               'px-2 py-1 text-xs rounded bg-rose-100 text-rose-700'
                      }>{row._label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SBCard>

        <SBCard title="Resultados de Campañas Online">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="p-3">Campaña</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Presupuesto</th>
                  <th className="p-3 text-right">Gasto</th>
                  <th className="p-3 text-right">Impresiones</th>
                  <th className="p-3 text-right">Clicks</th>
                  <th className="p-3 text-right">ROAS</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {campaigns.map((c: OnlineCampaign) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    onUpdate={handleUpdate}
                    onCloseRequest={(cc)=>setClosing(cc)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SBCard>
      </div>

      <NewCampaignDialog open={openCreate} onClose={()=>setOpenCreate(false)} onSuccess={handleCreate} />
      {closing && (
        <MarketingTaskCompletionDialog
          entity={closing}
          open={!!closing}
          onClose={() => setClosing(null)}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </>
  );
}
