// src/features/sales/pipeline/components/PipelineColumn.tsx
import React from 'react';
import { AccountCard } from './AccountCard';
import type { PipelineAccount } from '../pipeline.service';

const STAGE_CONFIG = {
  POTENCIAL: { title: "Potencial", color: "border-blue-500" },
  SEGUIMIENTO: { title: "Seguimiento", color: "border-yellow-500" },
  ACTIVA: { title: "Activa", color: "border-green-500" },
  FALLIDA: { title: "Fallida", color: "border-red-500" },
};

interface PipelineColumnProps {
  stage: keyof typeof STAGE_CONFIG;
  accounts: PipelineAccount[];
  onProgramAction: (accountId: string) => void;
}

export function PipelineColumn({ stage, accounts, onProgramAction }: PipelineColumnProps) {
  const config = STAGE_CONFIG[stage];

  return (
    <div className={`flex flex-col bg-secondary rounded-lg border-t-4 ${config.color}`}>
      <header className="p-3">
        <h3 className="font-semibold text-sm flex items-center">
          {config.title}
          <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{accounts.length}</span>
        </h3>
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {accounts.length > 0 ? (
          accounts.map(account => (
            <AccountCard key={account.id} account={account} onProgram={onProgramAction} />
          ))
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Vacío
          </div>
        )}
      </div>
    </div>
  );
}
