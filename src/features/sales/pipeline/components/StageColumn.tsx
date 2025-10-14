'use client';

import { AccountCard } from './AccountCard';
import type { PipelineAccountView } from '../pipeline.types';
import type { Stage } from '@/domain/ssot';
import { formatCurrency } from '@/lib/formatters';

interface StageColumnProps {
  stage: Stage;
  accounts: PipelineAccountView[];
  onAccountClick: (account: PipelineAccountView) => void;
  onQuickAction: (accountId: string, type: 'interaction' | 'order' | 'pos' | 'objective') => void;
}

const STAGE_LABELS: Record<Stage, string> = {
  POTENCIAL: 'Potencial',
  SEGUIMIENTO: 'Seguimiento',
  ACTIVA: 'Activa',
  FALLIDA: 'Fallida',
  CERRADA: 'Cerrada',
  BAJA: 'Baja',
};

const STAGE_COLORS: Record<Stage, string> = {
  POTENCIAL: 'text-blue-600',
  SEGUIMIENTO: 'text-amber-600',
  ACTIVA: 'text-green-600',
  FALLIDA: 'text-gray-500',
  CERRADA: 'text-purple-600',
  BAJA: 'text-red-600',
};

export function StageColumn({ stage, accounts, onAccountClick, onQuickAction }: StageColumnProps) {
  const totalRevenue = accounts.reduce((sum, acc) => sum + acc.totalRevenue30d, 0);
  const avgPriority = accounts.length > 0
    ? accounts.reduce((sum, acc) => sum + acc.priorityScore, 0) / accounts.length
    : 0;

  return (
    <div className="pipeline-stage">
      {/* Header */}
      <div className="pipeline-stage__header">
        <div className="pipeline-stage__title">
          <span className={STAGE_COLORS[stage]}>
            {STAGE_LABELS[stage]}
          </span>
          <span className="text-muted-foreground text-sm font-normal">
            {accounts.length}
          </span>
        </div>
        <div className="pipeline-stage__stats">
          <span>{formatCurrency(totalRevenue)}</span>
          <span>·</span>
          <span>Prio: {avgPriority.toFixed(0)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="pipeline-stage__body">
        {accounts.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Sin cuentas
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => onAccountClick(account)}
              onQuickAction={(type) => onQuickAction(account.id, type)}
            />
          ))
        )}
      </div>
    </div>
  );
}
