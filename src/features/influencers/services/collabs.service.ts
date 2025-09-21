
// src/features/influencers/services/collabs.service.ts
import type { InfluencerCollab, Platform, Tier } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";

export function useCollabsService() {
  const { data, setData, isPersistenceEnabled, saveCollection } = useData();
  const collabs = (data as any)?.influencerCollabs as InfluencerCollab[] || [];

  async function persist(next: InfluencerCollab[]) {
    setData(prev => prev ? ({ ...prev, influencerCollabs: next }) : prev);
    if (isPersistenceEnabled) await saveCollection("influencerCollabs", next);
  }

  async function createCollab(input: {
    creatorName: string;
    platform: Platform;
    tier?: Tier;
    goLiveAt: string;
    ownerUserId?: string;
    couponCode?: string;
    utmCampaign?: string;
  }) {
    const now = new Date().toISOString();
    const doc: InfluencerCollab = {
      id: `inf_${Date.now()}`,
      creatorId: `creator_${Date.now()}`,
      supplierPartyId: `party_${Date.now()}`,
      creatorName: input.creatorName,
      platform: input.platform,
      tier: input.tier || 'micro',
      status: "AGREED",
      dates: { goLiveAt: input.goLiveAt },
      ownerUserId: input.ownerUserId,
      tracking: { revenue: 0, couponCode: input.couponCode, utmCampaign: input.utmCampaign },
      costs: { cashPaid: 0, productCost: 0, shippingCost: 0 },
      metrics: { impressions: 0, clicks: 0, engagements: 0 },
      createdAt: now, updatedAt: now,
      deliverables: [],
      compensation: { type: 'gift' }
    } as InfluencerCollab;
    await persist([...collabs, doc]);
  }

  async function updateCollab(updated: InfluencerCollab) {
    const next = collabs.map(c => c.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : c);
    await persist(next);
  }

  async function closeCollab(collab: InfluencerCollab, k: {
    cashPaid:number; productCost:number; shippingCost:number;
    impressions:number; clicks:number; revenue:number;
    engagements?:number; orders?:number;
  }) {
    const req: (keyof typeof k)[] = ["cashPaid","productCost","shippingCost","impressions","clicks","revenue"];
    if (req.some(key => k[key]===undefined || Number.isNaN(Number(k[key])) || Number(k[key])<0)) {
      throw new Error("KPIs incompletos (>=0): coste cash, producto, envío, impresiones, clicks, revenue.");
    }
    const next = collabs.map(x => {
      if (x.id !== collab.id) return x;
      const spend = k.cashPaid + k.productCost + k.shippingCost;
      const cpm = k.impressions>0 ? spend/(k.impressions/1000) : 0;
      const cpc = k.clicks>0 ? spend/k.clicks : 0;
      const cpe = (k.engagements||0)>0 ? spend/(k.engagements!) : undefined;
      const roas = spend>0 ? k.revenue/spend : 0;
      const cac  = k.orders && k.orders>0 ? spend/k.orders : undefined;
      return {
        ...x,
        status: "COMPLETED",
        costs: { cashPaid:k.cashPaid, productCost:k.productCost, shippingCost:k.shippingCost },
        metrics: {
          ...(x.metrics||{}),
          impressions:k.impressions, clicks:k.clicks, engagements:k.engagements ?? x.metrics?.engagements ?? 0,
          orders:k.orders ?? x.metrics?.orders,
          ctr: k.impressions>0 ? k.clicks/k.impressions : undefined,
          cpm, cpc, cpe, cac
        },
        tracking: { ...(x.tracking||{}), revenue: k.revenue },
        updatedAt: new Date().toISOString(),
      } as InfluencerCollab;
    });
    await persist(next);
  }

  return { collabs, createCollab, updateCollab, closeCollab };
}
