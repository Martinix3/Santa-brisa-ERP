// src/features/marketing/components/CampaignRow.tsx
"use client";

import React, { useState, useEffect } from 'react';
import type { OnlineCampaign } from '@/domain/ssot.v7';
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { Edit, Save, X } from 'lucide-react';

const fmtEur = (n?: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n?: number) => new Intl.NumberFormat("es-ES").format(n || 0);

function StatusPill({ status }: { status: OnlineCampaign["status"] }) {
  const styles: Record<OnlineCampaign["status"], string> = {
    planned: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800 animate-pulse",
    closed: "bg-zinc-100 text-zinc-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

export function CampaignRow({
  campaign, onUpdate, onCloseRequest,
}: {
  campaign: OnlineCampaign;
  onUpdate: (updated: OnlineCampaign) => void;
  onCloseRequest: (c: OnlineCampaign) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<OnlineCampaign>(campaign);
  useEffect(()=>setEdited(campaign), [campaign]);

  const roas = (edited.spend||0)>0 ? (edited.metrics?.revenue||0)/(edited.spend||0) : 0;

  if (isEditing) {
    return (
      <tr className="bg-yellow-50/40">
        <td className="px-2 py-2"><Input value={edited.title} onChange={(e:any)=>setEdited(p=>({ ...p, title:e.target.value }))} /></td>
        <td className="px-2 py-2">
          <Select value={edited.channel} onChange={(e:any)=>setEdited(p=>({ ...p, channel:e.target.value }))}>
            <option value="IG">Instagram</option><option value="FB">Facebook</option><option value="TikTok">TikTok</option>
            <option value="Google">Google</option><option value="YouTube">YouTube</option><option value="Email">Email</option><option value="Other">Otro</option>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Select value={edited.status} onChange={(e:any)=>setEdited(p=>({ ...p, status:e.target.value }))}>
            <option value="planned">planned</option><option value="active">active</option><option value="closed">closed</option><option value="cancelled">cancelled</option>
          </Select>
        </td>
        <td className="px-2 py-2 text-right"><Input type="number" value={edited.budget ?? ""} onChange={(e:any)=>setEdited(p=>({ ...p, budget: e.target.value==="" ? 0 : Number(e.target.value) }))} /></td>
        <td className="px-2 py-2 text-right"><Input type="number" value={edited.spend ?? 0} onChange={(e:any)=>setEdited(p=>({ ...p, spend: Number(e.target.value||0) }))} /></td>
        <td className="px-2 py-2 text-right">{fmtNum(edited.metrics?.impressions)}</td>
        <td className="px-2 py-2 text-right">{fmtNum(edited.metrics?.clicks)}</td>
        <td className="px-2 py-2 text-right font-semibold">{roas ? `${roas.toFixed(2)}x` : "—"}</td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1 justify-end">
            <SBButton size="sm" onClick={() => { onUpdate(edited); setIsEditing(false); }}><Save size={14} className="sb-icon" /></SBButton>
            <SBButton size="sm" variant="secondary" onClick={() => { setEdited(campaign); setIsEditing(false); }}><X size={14} /></SBButton>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-50/40">
      <td className="p-3 font-medium">{campaign.title}</td>
      <td className="p-3">{campaign.channel}</td>
      <td className="p-3"><StatusPill status={campaign.status} /></td>
      <td className="p-3 text-right">{fmtEur(campaign.budget)}</td>
      <td className="p-3 text-right">{fmtEur(campaign.spend)}</td>
      <td className="p-3 text-right">{fmtNum(campaign.metrics?.impressions)}</td>
      <td className="p-3 text-right">{fmtNum(campaign.metrics?.clicks)}</td>
      <td className="p-3 text-right font-semibold">
        {(campaign.spend||0)>0 && (campaign.metrics?.revenue||0)>0 ? `${(((campaign.metrics!.revenue!))/(campaign.spend!)).toFixed(2)}x` : "—"}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1 justify-end">
          {campaign.status !== "closed" && (
            <SBButton size="sm" variant="secondary" onClick={()=>onCloseRequest(campaign)}>Resultados</SBButton>
          )}
          <SBButton size="sm" variant="ghost" onClick={()=>setIsEditing(true)}><Edit size={14} className="sb-icon" /></SBButton>
        </div>
      </td>
    </tr>
  );
}
