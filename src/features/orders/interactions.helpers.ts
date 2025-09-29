// src/features/orders/interactions.helpers.ts
import type { Interaction } from "@/domain/ssot";

export function getInteractionsForOrder(interactions: Interaction[] | undefined, orderId: string) {
  if (!interactions) return [];
  return interactions
    .filter(i => i?.linkedEntity?.type === 'ORDER' && i?.linkedEntity?.id === orderId)
    .sort((a,b) => {
      const aa = (a.updatedAt || a.plannedFor || a.createdAt || '') as string;
      const bb = (b.updatedAt || b.plannedFor || b.createdAt || '') as string;
      return aa.localeCompare(bb) * -1; // desc
    });
}

export function getLastAndNextInteractionDates(interactions: Interaction[]) {
  if (!interactions.length) return { last: null, next: null };
  const done = interactions.filter(i => i.status === 'done')
    .map(i => i.updatedAt || i.plannedFor || i.createdAt).filter(Boolean) as string[];
  const future = interactions.filter(i => i.status !== 'done' && i.plannedFor)
    .map(i => i.plannedFor as string);

  const last = done.sort().at(-1) || null;
  const next = future.sort().at(0) || null;
  return { last, next };
}
