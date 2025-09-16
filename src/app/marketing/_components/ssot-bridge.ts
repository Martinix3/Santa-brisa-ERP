

import { MemoryAdapter } from '@/domain/ssot.helpers';
import type { EventMarketing, Activation, OnlineCampaign } from '@/domain/ssot';

// =============================================================
//  SSOT Bridge for Marketing Module
//  - Uses MemoryAdapter which contains all mock data.
//  - Exposes simple async functions to fetch data.
// =============================================================

const adapter = new MemoryAdapter();

export async function listEvents(): Promise<EventMarketing[]> {
  return adapter.getMktEvents();
}

export async function listActivations(): Promise<Activation[]> {
  const fullData = await adapter.getFullDump();
  return fullData.activations || [];
}

export async function listOnlineCampaigns(): Promise<OnlineCampaign[]> {
  return adapter.getOnlineCampaigns();
}
