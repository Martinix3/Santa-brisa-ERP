// src/features/sales/pipeline/components/PipelineBoard.tsx
"use client";
import React, { useState } from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { PipelineHeader } from './PipelineHeader';
import { PipelineColumn } from './PipelineColumn';
import { PipelineSkeleton } from './skeletons';
import { QuickLogDialog } from '@/features/quicklog/QuickLogDialog';
import { toast } from 'sonner';

export function PipelineBoard() {
  const { accounts, isLoading, error, filters, setFilters } = usePipeline();
  const [quickLogAccountId, setQuickLogAccountId] = useState<string | null>(null);

  if (error) {
    toast.error(error);
  }

  const stages: ("POTENCIAL" | "SEGUIMIENTO" | "ACTIVA" | "FALLIDA")[] = ["POTENCIAL", "SEGUIMIENTO", "ACTIVA", "FALLIDA"];

  return (
    <div className="h-full flex flex-col">
      <PipelineHeader filters={filters} onFiltersChange={setFilters} />
      
      {isLoading ? (
        <PipelineSkeleton />
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="grid grid-cols-4 gap-4 min-w-[1200px] h-full">
            {stages.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                accounts={accounts.filter(a => a.stagePreview === stage)}
                onProgramAction={setQuickLogAccountId}
              />
            ))}
          </div>
        </div>
      )}

      {quickLogAccountId && (
        <QuickLogDialog
          open={!!quickLogAccountId}
          onOpenChange={(isOpen) => !isOpen && setQuickLogAccountId(null)}
          accountId={quickLogAccountId}
          defaultTab="INTERACCION"
        />
      )}
    </div>
  );
}
