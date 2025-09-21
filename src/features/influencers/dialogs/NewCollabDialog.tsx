
// src/features/influencers/dialogs/NewCollabDialog.tsx
"use client";
import React, { useEffect, useState } from "react";
import type { Platform, Tier } from "@/domain/ssot";

export function NewCollabDialog({
  open, onClose, onSave, components
}: {
  open: boolean; onClose: () => void;
  onSave: (input:{
    creatorName:string; platform: Platform;
    tier?: Tier; goLiveAt:string; ownerUserId?:string; couponCode?:string; utmCampaign?:string;
  }) => void;
  components: any;
}) {
  const { Input, Select, Header, SBButton } = components;
  const [creatorName,setCreator]=useState(""); const [platform,setPlatform]=useState<Platform>("Instagram");
  const [tier,setTier]=useState<Tier>("micro"); const [goLiveAt,setGoLiveAt]=useState("");
  const [owner,setOwner]=useState(""); const [coupon,setCoupon]=useState(""); const [utm,setUtm]=useState("");

  useEffect(()=>{ if(open){ setCreator(""); setPlatform("Instagram"); setTier("micro"); setGoLiveAt(""); setOwner(""); setCoupon(""); setUtm(""); }},[open]);

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden" onClick={(e)=>e.stopPropagation()}>
        <Header title="Nueva Colaboración" color="#F7D15F" />
        <form className="p-4 space-y-3" onSubmit={(e)=>{e.preventDefault(); if(!creatorName||!goLiveAt) return; onSave({creatorName,platform,tier,goLiveAt,ownerUserId:owner||undefined,couponCode:coupon||undefined,utmCampaign:utm||undefined}); onClose();}}>
          <Input value={creatorName} onChange={(e:any)=>setCreator(e.target.value)} placeholder="@creador / nombre" required />
          <div className="grid grid-cols-2 gap-3">
            <Select value={platform} onChange={(e:any)=>setPlatform(e.target.value)}>
              <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitch</option><option>Blog</option><option>Otro</option>
            </Select>
            <Select value={tier} onChange={(e:any)=>setTier(e.target.value)}>
              <option value="nano">Nano (&lt;10k)</option>
              <option value="micro">Micro (10-100k)</option>
              <option value="mid">Mid (100-500k)</option>
              <option value="macro">Macro (&gt;500k)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={goLiveAt} onChange={(e:any)=>setGoLiveAt(e.target.value)} required />
            <Input value={owner} onChange={(e:any)=>setOwner(e.target.value)} placeholder="Owner (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={coupon} onChange={(e:any)=>setCoupon(e.target.value)} placeholder="Cupón (opcional)" />
            <Input value={utm} onChange={(e:any)=>setUtm(e.target.value)} placeholder="utm_campaign (opcional)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
            <SBButton type="submit">Crear</SBButton>
          </div>
        </form>
      </div>
    </div>
  );
}
