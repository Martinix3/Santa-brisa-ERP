// src/features/personal/components/TaskList.tsx
"use client";
import React from 'react';
import type { Interaction, Account } from '@/domain/ssot.v7';
import { TaskItem } from './TaskItem';

interface Props {
  tasks: Interaction[];
  accounts: Account[];
  onComplete: (taskId: string) => void;
  onReschedule: (task: Interaction) => void;
}

export function TaskList({ tasks, accounts, onComplete, onReschedule }: Props) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay tareas para mostrar en este período.</p>;
  }
  
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          accountName={accountMap.get(task.accountId || '')}
          onComplete={onComplete}
          onReschedule={onReschedule}
        />
      ))}
    </div>
  );
}
