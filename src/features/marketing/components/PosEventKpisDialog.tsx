
"use client";
import React from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { Interaction } from '@/domain/ssot';

export function PosEventKpisDialog({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task: Interaction | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={`Resultados de: ${task?.note || 'Acción de Marketing'}`}
        description="Aquí registrarás los KPIs del evento o acción POS."
        primaryAction={{ label: 'Cerrar (temporalmente)', onClick: () => onOpenChange(false)}}
      >
        <div className="p-4 text-center text-zinc-500">
          <p>Este diálogo se usará para cerrar una tarea de marketing (evento/POS).</p>
          <p className="font-semibold mt-2">Work in Progress</p>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
