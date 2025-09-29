// src/features/marketing/components/PosEventKpisDialog.tsx
"use client";
import React from 'react';
import type { Interaction } from '@/domain/ssot';
import { PosCompleteDialog } from '@/features/pos/PosCompleteDialog';


export function PosEventKpisDialog({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task: Interaction | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isPosTactic = task?.linkedEntity?.type === 'POS_TACTIC';
  const tacticId = isPosTactic ? task.linkedEntity.id : null;

  if (!tacticId) {
    // Si no es una táctica POS, podrías mostrar un error o un diálogo genérico
    // pero por ahora simplemente no lo renderizamos para evitar errores.
    return null;
  }

  return (
    <PosCompleteDialog
      open={open}
      onOpenChange={onOpenChange}
      tacticId={tacticId}
    />
  );
}
