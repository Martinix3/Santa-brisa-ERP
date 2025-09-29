
"use client";
import React from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { Interaction } from '@/domain/ssot';

export function SalesOutcomeDialog({
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
        title={`Resultado de: ${task?.note || 'Tarea de Venta'}`}
        description="Aquí registrarás el resultado comercial (pedido, seguimiento, etc.)."
        primaryAction={{ label: 'Cerrar (temporalmente)', onClick: () => onOpenChange(false)}}
      >
        <div className="p-4 text-center text-zinc-500">
          <p>Este diálogo se usará para cerrar una tarea de venta.</p>
          <p className="font-semibold mt-2">Work in Progress</p>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
