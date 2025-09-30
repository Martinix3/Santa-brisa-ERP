// src/features/agenda/mappers.ts
import type { Interaction, Account } from '@/domain/ssot';
import { sbAsISO } from './helpers';
import type { Task } from './TaskBoard';

export function mapInteractionsToTasks(
  interactions: Interaction[] | undefined,
  accounts: Account[] | undefined
): Task[] {
  if (!interactions || !accounts) return [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const plannedISO = sbAsISO(i.plannedFor!);
      if (!plannedISO) return null;
      return {
        id: i.id,
        title: i.note || `${i.kind}`,
        type: i.dept || "VENTAS",
        status: i.status || 'open',
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location || accountMap.get(i.accountId || ''),
        linkedEntity: i.linkedEntity,
      } as Task;
    })
    .filter(Boolean) as Task[];
}
