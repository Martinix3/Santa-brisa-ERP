// src/features/influencers/ssot-bridge.ts
import { MemoryAdapter } from '@/domain/ssot.helpers';
import type { Creator, InfluencerCollab } from '@/domain/ssot';

// En un futuro, aquí se podría inicializar un adaptador de Firestore.
// Por ahora, usamos el de memoria que ya tiene datos mock.
const adapter = new MemoryAdapter();

export async function listCreators(): Promise<Creator[]> {
  const data = await adapter.getCreators();
  return data as Creator[];
}

export async function listCollabs(): Promise<InfluencerCollab[]> {
  const data = await adapter.getInfluencerCollabs();
  return data as InfluencerCollab[];
}
