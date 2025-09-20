
// src/features/agenda/ssot-bridge.ts
import { MemoryAdapter } from '@/domain/ssot.helpers';
import type { Interaction, SantaData } from '@/domain/ssot';

const adapter = new MemoryAdapter();

// Initialize with some data if needed, or it will be empty
// In a real scenario, this would connect to Firestore or an API
export async function getFullData(): Promise<SantaData> {
    return adapter.getFullDump();
}

export async function listInteractions(): Promise<Interaction[]> {
  const data = await adapter.getFullDump();
  return data.interactions || [];
}

export async function addOrUpdateInteraction(interaction: Omit<Interaction, 'id' | 'createdAt'> & { id?: string }): Promise<Interaction> {
    console.log("Mock save interaction", interaction);
    return {
        id: interaction.id || `int_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'open',
        ...interaction,
    } as Interaction;
}

export async function deleteInteraction(id: string): Promise<void> {
    console.log("Mock delete interaction", id);
    // In-memory adapter does not persist changes between reloads, so this is a no-op for now.
}
