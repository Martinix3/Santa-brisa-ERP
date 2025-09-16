// domain/ssot.marketing.ts - Canónico de Marketing

export type MktStatus = 'planned' | 'active' | 'closed' | 'cancelled';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'POPUP' | 'OTRO';
export type Channel = 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other';

export interface EventMarketing {
  id: string;
  title: string;
  kind: EventKind;
  status: MktStatus;
  startAt: string;
  endAt?: string;
  city?: string;
  venue?: string;
  goal?: { sampling: number; leads: number; salesBoxes: number; };
  spend?: number;
  plv?: Array<{ sku: string; qty: number; }>;
}

export interface Activation {
  id: string;
  name: string;
  startDate: string;
  status: MktStatus;
  spend: number;
  attributedSellOut: number;
  attributedReach: number;
}

export interface OnlineCampaign {
  id: string;
  title: string;
  channel: Channel;
  status: MktStatus;
  startAt: string;
  endAt?: string;
  budget: number;
  spend: number;
  metrics?: {
    impressions: number;
    clicks: number;
    ctr?: number;
    conversions?: number;
    cpa?: number;
    roas?: number;
  };
  assets?: any[];
  utm?: Record<string, string>;
}
