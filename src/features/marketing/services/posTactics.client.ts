// src/features/marketing/services/posTactics.client.ts
'use client';
import { upsertPosTactic as serverUpsert, closePosTactic as serverClose } from '@/server/actions/pos-tactics.service';
import type { UpsertPosTacticInput } from '@/server/actions/pos-tactics.service';

// Este wrapper del lado del cliente se asegura de que las server actions
// se importen y llamen correctamente desde los componentes de cliente.

export async function upsertPosTactic(input: UpsertPosTacticInput, createdById: string) {
  // En un entorno de producción, 'createdById' se obtendría de la sesión de autenticación.
  // La llamada a serverUpsert es una server action.
  return serverUpsert({ ...input, createdById }); // 1 solo arg
}

export async function closePosTactic(tacticId: string, opts?: { windowDays?: number }) {
  return serverClose({ tacticId, ...opts }); // 1 solo arg
}
