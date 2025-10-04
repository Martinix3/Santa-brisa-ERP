// src/server/actions/bom.actions.ts
'use server';

import { ok, type ActionResult } from '@/lib/result';

export async function upsertBOM(input: any): Promise<ActionResult<{ id: string }>> {
  // TODO: implementar persistencia real
  const id = input?.id ?? `bom_${Math.random().toString(36).slice(2,8)}`;
  return ok({ id });
}

export async function archiveBOM(input: { bomId: string }): Promise<ActionResult<{ archived: boolean }>> {
  // TODO: implementar archivado real
  return ok({ archived: true });
}

export async function upsertMinimalProduct(input: any): Promise<ActionResult<{ itemId: string }>> {
  // TODO: implementar creación/actualización real de un producto mínimo
  const itemId = input?.itemId ?? `item_${Math.random().toString(36).slice(2,8)}`;
  return ok({ itemId });
}
