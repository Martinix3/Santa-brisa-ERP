import type { Account, User } from '@/domain/ssot';
import { Target, Phone, Package } from 'lucide-react';
import { createInteractionTask, createOrderPrepTask, toggleAccountObjective } from '../pipeline.actions.v2';

interface AccountCardProps {
  account: Account;
  currentUserId: string;
  ownerName: string;
  taskCount: number;
  nextEvent?: {
    date: string;
    title: string;
    kind?: string;
  };
  onClick?: () => void;
}

export function AccountCard({ account, currentUserId, ownerName, taskCount, nextEvent, onClick }: AccountCardProps) {
  return (
    <div 
      className="dept-VENTAS rounded-xl backdrop-blur-sm p-3 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
      style={{
        backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
        borderColor: `rgb(var(--dept-border) / 0.4)`,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm font-medium mb-1"
            style={{ color: `rgb(var(--dept-text))` }}
          >
            {account.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {ownerName}
          </div>
        </div>
        {account.isTarget && (
          <Target size={14} className="shrink-0" style={{ color: `rgb(var(--dept-text) / 0.7)` }} />
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span 
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
            color: `rgb(var(--dept-badge-text))`,
          }}
        >
          {account.segment}
        </span>
        {taskCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-medium">
            {taskCount}
          </span>
        )}
      </div>

      {/* Próximo Evento/Cita */}
      {nextEvent && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-amber-50/50 border border-amber-200/50">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-amber-900 truncate">
              {nextEvent.title}
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">
              {new Date(nextEvent.date).toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            await createInteractionTask({
              accountId: account.id,
              userId: currentUserId,
              title: `Llamada a ${account.name}`,
            });
          }}
          className="p-1.5 rounded border border-border/40 bg-background/60 hover:bg-background hover:scale-110 transition-all"
          title="Crear tarea de llamada"
        >
          <Phone size={14} />
        </button>

        <button 
          onClick={async (e) => {
            e.stopPropagation();
            await createOrderPrepTask({
              accountId: account.id,
              userId: currentUserId,
              title: `Preparar pedido ${account.name}`,
            });
          }}
          className="p-1.5 rounded border border-border/40 bg-background/60 hover:bg-background hover:scale-110 transition-all"
          title="Crear tarea de pedido"
        >
          <Package size={14} />
        </button>

        <button 
          onClick={async (e) => {
            e.stopPropagation();
            await toggleAccountObjective({
              accountId: account.id,
              on: !account.isTarget,
              userId: currentUserId,
            });
          }}
          className={`p-1.5 rounded border border-border/40 hover:scale-110 transition-all ${
            account.isTarget 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-background/60 hover:bg-background'
          }`}
          title={account.isTarget ? "Quitar objetivo" : "Marcar como objetivo"}
        >
          <Target size={14} />
        </button>
      </div>
    </div>
  );
}
