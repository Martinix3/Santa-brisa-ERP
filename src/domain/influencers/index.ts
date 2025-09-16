
// domain/influencers/index.ts - Tipos de Influencers
export type Platform = "Instagram"|"TikTok"|"YouTube"|"Twitch"|"Blog"|"Otro";
export type Tier = "nano"|"micro"|"mid"|"macro";

export interface Creator {
  id: string;
  name: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  audience?: number;
  country?: string; city?: string;
  email?: string; phone?: string;
  shippingAddress?: string;
  tags?: string[];
  createdAt: string; updatedAt: string;
}

export type InfStatus =
  | "PROSPECT" | "OUTREACH" | "NEGOTIATING" | "AGREED"
  | "LIVE" | "COMPLETED" | "PAUSED" | "DECLINED";

export type Deliverable =
  | "post" | "story" | "reel" | "short" | "video_long" | "stream" | "blogpost";

export type CompType = "gift" | "flat" | "cpa" | "cpc" | "revshare";

export interface InfluencerCollab {
  id: string;
  creatorId?: string;
  creatorName: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  status: InfStatus;
  ownerUserId?: string;
  couponCode?: string;
  utmCampaign?: string;
  landingUrl?: string;
  deliverables: { kind: Deliverable; qty: number; dueAt?: string }[];
  compensation: { type: CompType; amount?: number; currency?: "EUR"; notes?: string; };
  costs?: { productCost?: number; shippingCost?: number; cashPaid?: number; otherCost?: number };
  tracking?: {
    clicks?: number; orders?: number; revenue?: number;
    impressions?: number; views?: number;
    likes?: number; comments?: number; saves?: number; shares?: number;
    updatedAt?: string;
  };
  dates?: { outreachAt?: string; agreedAt?: string; goLiveAt?: string; deadlineAt?: string; completedAt?: string; };
  sampleOrderId?: string;
  eventIds?: string[];
  notes?: string;
  createdAt: string; updatedAt: string;
}
