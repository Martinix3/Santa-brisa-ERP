// src/server/actions/agenda.actions.ts
'use server';

import { ok, type ActionResult } from '@/lib/result';

export async function createInteraction(input: any): Promise<ActionResult<{ interactionId: string }>> {
  // TODO: implementar guardado real de interacciones
  const interactionId = `ia_${Math.random().toString(36).slice(2,8)}`;
  return ok({ interactionId });
}
