'use client';

import { useData } from '@/lib/dataprovider';
import { useState, useEffect } from 'react';
import type { Account, TaskNew } from '@/domain/ssot';
import { ACCOUNT_STAGE_META } from '@/domain/ssot';
import { AccountCard } from '@/features/sales/pipeline/components/AccountCard';
import { AccountDrawer } from '@/features/sales/pipeline/components/AccountDrawer';

export default function VentasAccountsPage() {
  const { currentUser, data } = useData();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFlow, setFilterFlow] = useState<'ALL' | 'DIRECT' | 'PLACEMENT'>('ALL');
  const [filterOnlyTargets, setFilterOnlyTargets] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Simulamos cuentas y tareas desde data
  const allAccounts = (data?.accounts || []).filter(
    (acc: Account) => ['POTENCIAL', 'ACTIVA', 'SEGUIMIENTO', 'FALLIDA'].includes(acc.stage)
  );

  // Aplicar filtros
  const accounts = allAccounts.filter(acc => {
    // Búsqueda por nombre
    if (searchTerm && !acc.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro por flujo
    if (filterFlow !== 'ALL' && acc.flow !== filterFlow) {
      return false;
    }
    
    // Filtro solo objetivos
    if (filterOnlyTargets && !acc.isTarget) {
      return false;
    }
    
    return true;
  }).slice(0, 50);

  const tasks = (data?.tasks || []).filter(
    (task: TaskNew) => task.status === 'BACKLOG' || task.status === 'IN_PROGRESS'
  ).slice(0, 50);

  const users = data?.users || [];

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  if (!currentUser) {
    return <div className="p-6">Cargando...</div>;
  }

  // Agrupar cuentas por stage
  const accountsByStage = accounts.reduce((acc, account) => {
    if (!acc[account.stage]) acc[account.stage] = [];
    acc[account.stage].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Contar tareas por cuenta
  const tasksByAccount = tasks.reduce((acc, task) => {
    if (!task.accountId) return acc;
    if (!acc[task.accountId]) acc[task.accountId] = 0;
    acc[task.accountId]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header con filtros integrados */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline de Ventas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {accounts.length} cuentas · {allAccounts.length} total
            </p>
          </div>
        </div>

        {/* Filtros integrados en header */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Búsqueda */}
          <input
            type="search"
            placeholder="Buscar cuenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm bg-background/50"
          />

          {/* Filtro por flujo */}
          <select
            value={filterFlow}
            onChange={(e) => setFilterFlow(e.target.value as 'ALL' | 'DIRECT' | 'PLACEMENT')}
            className="px-3 py-2 border rounded-lg text-sm bg-background/50"
          >
            <option value="ALL">Todos los flujos</option>
            <option value="DIRECT">Venta Directa</option>
            <option value="PLACEMENT">Colocación</option>
          </select>

          {/* Toggle solo objetivos */}
          <button
            onClick={() => setFilterOnlyTargets(!filterOnlyTargets)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
              filterOnlyTargets
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-secondary/50 hover:bg-secondary'
            }`}
          >
            ⭐ Solo objetivos
          </button>

          {/* Limpiar filtros */}
          {(searchTerm || filterFlow !== 'ALL' || filterOnlyTargets) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterFlow('ALL');
                setFilterOnlyTargets(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'] as const).map((stage) => {
          const count = accountsByStage[stage]?.length || 0;
          const meta = ACCOUNT_STAGE_META[stage];
          return (
            <div key={stage} className="sb-card-glass-light p-4">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground mt-1">{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* Kanban por Stages (4 columnas con FALLIDA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'] as const).map((stage) => {
            const stageAccounts = accountsByStage[stage] || [];
            const meta = ACCOUNT_STAGE_META[stage];
            
            return (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">{meta.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    {stageAccounts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageAccounts.length === 0 ? (
                    <div className="sb-card">
                      <div className="sb-card__content text-center py-8 text-muted-foreground text-sm">
                        No hay cuentas en esta etapa
                      </div>
                    </div>
                  ) : (
                    stageAccounts.map((account) => {
                      const taskCount = tasksByAccount[account.id] || 0;
                      const ownerName = users.find(u => u.id === account.ownerId)?.name || 'Sin asignar';
                      
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          currentUserId={currentUser.id}
                          ownerName={ownerName}
                          taskCount={taskCount}
                          onClick={() => setSelectedAccount(account)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      {/* Info */}
      <div className="sb-card-glass-light p-5">
        <h3 className="text-sm font-semibold mb-2">✨ Sistema Unificado de Tareas</h3>
        <p className="text-sm text-muted-foreground">
          Este pipeline ahora usa <code className="px-1 py-0.5 rounded bg-secondary">TaskNew</code> unificado. 
          Las tareas creadas aquí se sincronizan automáticamente con Proyectos, Calendario y Dashboard.
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>✅ Pipeline migrado</span>
          <span>✅ TaskNew SSOT</span>
          <span>✅ Schemas Zod</span>
          <span>✅ Filtros funcionales</span>
          <span>✅ Drawer de detalle</span>
          <span>⏳ DnD pendiente (Fase 4)</span>
        </div>
      </div>

      {/* Account Drawer */}
      <AccountDrawer
        account={selectedAccount}
        tasks={tasks}
        onClose={() => setSelectedAccount(null)}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
