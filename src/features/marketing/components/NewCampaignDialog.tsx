// src/features/marketing/components/NewCampaignDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import type { OnlineCampaign } from '@/domain/ssot';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';

type NewCampaignData = Omit<OnlineCampaign, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

export function NewCampaignDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: NewCampaignData) => void;
}) {
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<OnlineCampaign["channel"]>("IG");
  const [budget, setBudget] = useState<number | "">("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [owner, setOwner] = useState("");
  const [utm, setUtm] = useState("");
  const [coupon, setCoupon] = useState("");
  const [landing, setLanding] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(""); setChannel("IG"); setBudget(""); setStartAt(""); setEndAt("");
      setOwner(""); setUtm(""); setCoupon(""); setLanding("");
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startAt) return;
    onSuccess({
      title,
      channel,
      startAt,
      endAt: endAt || undefined,
      budget: budget === "" ? undefined : Number(budget),
      ownerUserId: owner || undefined,
      tracking: {
        utmCampaign: utm || undefined,
        couponCode: coupon || undefined,
        landingUrl: landing || undefined,
      },
    } as NewCampaignData);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Nueva Campaña Online</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={title} onChange={(e:any)=>setTitle(e.target.value)} placeholder="Título de la campaña" required />
          <div className="grid grid-cols-2 gap-3">
            <Select value={channel} onChange={(e:any)=>setChannel(e.target.value)}>
              <option value="IG">Instagram</option><option value="FB">Facebook</option>
              <option value="TikTok">TikTok</option><option value="Google">Google</option>
              <option value="YouTube">YouTube</option><option value="Email">Email</option><option value="Other">Otro</option>
            </Select>
            <Input type="number" placeholder="Presupuesto (€)" value={budget} onChange={(e:any)=>setBudget(e.target.value===""?"":Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={startAt} onChange={(e:any)=>setStartAt(e.target.value)} required />
            <Input type="date" value={endAt} onChange={(e:any)=>setEndAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={owner} onChange={(e:any)=>setOwner(e.target.value)} placeholder="Owner (opcional)" />
            <Input value={utm} onChange={(e:any)=>setUtm(e.target.value)} placeholder="utm_campaign (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={coupon} onChange={(e:any)=>setCoupon(e.target.value)} placeholder="Cupón (opcional)" />
            <Input value={landing} onChange={(e:any)=>setLanding(e.target.value)} placeholder="Landing URL (opcional)" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit">Crear</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}
