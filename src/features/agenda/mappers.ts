
// src/features/agenda/mappers.ts
import type { Interaction, Account, Department, TaskKind } from '@/domain/ssot.v7';
import { sbAsISO } from './helpers';
import type { Task } from './TaskBoard';

export function mapInteractionsToTasks(
  interactions: Interaction[] | undefined,
  accounts: Account[] | undefined
): Task[] {
  if (!interactions) return [];
  const accountMap = new Map((accounts || []).map((a) => [a.id, a.name]));

  return interactions
    .map((i) => {
      if (!i) return null;
      const plannedISO = i.plannedFor ? sbAsISO(i.plannedFor) : undefined;
      const task: Task = {
        ...i,
        title: i.note || `${i.kind}`,
        plannedFor: plannedISO,
        originalInteraction: i,
        location: i.location || accountMap.get(i.accountId || ''),
      };
      return task;
    })
    .filter(Boolean) as Task[];
}
