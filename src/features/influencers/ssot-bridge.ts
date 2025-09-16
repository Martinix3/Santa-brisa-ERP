// src/features/influencers/ssot-bridge.ts
import { MemoryAdapter } from '@/domain/ssot.helpers';
import type { Creator, InfluencerCollab } from '@/domain/influencers';

// En un futuro, aquí se podría inicializar un adaptador de Firestore.
// Por ahora, usamos el de memoria que ya tiene datos mock.
const adapter = new MemoryAdapter();

export async function listCreators(): Promise<Creator[]> {
  return adapter.getCreators();
}

export async function listCollabs(): Promise<InfluencerCollab[]> {
  return adapter.getInfluencerCollabs();
}
