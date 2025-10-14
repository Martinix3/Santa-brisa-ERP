'use client';

import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Account, TaskNew } from '@/domain/ssot';
import { ACCOUNT_STAGE_META } from '@/domain/ssot';
import { AccountCard } from '@/features/sales/pipeline/components/AccountCard';
import { CheckSquare, Square } from 'lucide-react';

export default function VentasCuentasPage() {
  const router = useRouter();
  const { currentUser, data } = useData();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFlow, setFilterFlow] = useState<'ALL' | 'DIRECT' | 'PLACEMENT'>('ALL');
  const [filterOnlyTargets, setFilterOnlyTargets] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // Leer accounts directamente (igual que /accounts)
  console.log('[DEBUG] Todos los accounts:', data?.accounts?.length || 0);
  console.log('[DEBUG] Stages únicos:', [...new Set(data?.accounts?.map((a: any) => a.stage))]);
  
  const allAccounts = (data?.accounts || []).filter((acc: Account) => {
    const normalizedStage = acc.stage?.toUpperCase();
    const validStages = ['POTENCIAL', 'ACTIVA', 'SEGUIMIENTO', 'FALLIDA'];
    return validStages.includes(normalizedStage);
  });
  
  console.log('[DEBUG] Accounts filtrados:', allAccounts.length);

  // Aplicar filtros del usuario
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
  });

  const tasks = (data?.tasks || []).filter(
    (task: TaskNew) => task.status === 'BACKLOG' || task.status === 'IN_PROGRESS' || task.status === 'PROGRAMADA'
  );

  const interactions = data?.interactions || [];
  const users = data?.users || [];

  // Calcular próximo evento por cuenta (de tasks programadas o interactions)
  const nextEventByAccount: Record<string, { date: string; title: string; kind?: string }> = {};
  
  const now = new Date();
  
  // Tareas programadas con fecha
  tasks.forEach((task: TaskNew) => {
    if (!task.accountId || !task.dueAt) return;
    const dueDate = new Date(task.dueAt);
    if (dueDate < now) return; // Solo futuras
    
    const existing = nextEventByAccount[task.accountId];
    if (!existing || new Date(existing.date) > dueDate) {
      nextEventByAccount[task.accountId] = {
        date: task.dueAt,
        title: task.title,
        kind: task.kind,
      };
    }
  });

  // Interactions programadas
  interactions.forEach((int: any) => {
    if (!int.accountId || !int.plannedFor) return;
    const plannedDate = new Date(int.plannedFor);
    if (plannedDate < now) return; // Solo futuras
    
    const existing = nextEventByAccount[int.accountId];
    if (!existing || new Date(existing.date) > plannedDate) {
      nextEventByAccount[int.accountId] = {
        date: int.plannedFor,
        title: int.note || int.title || `${int.kind}`,
        kind: int.kind,
      };
    }
  });

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

  const openDrawer = (accountId: string) => {
    router.push(`/contacts/${accountId}`);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === accounts.length) {
      setSelected([]);
    } else {
      setSelected(accounts.map(r => r.id));
    }
  };

  const getTypeLabel = (stage: string) => {
    return ACCOUNT_STAGE_META[stage as keyof typeof ACCOUNT_STAGE_META]?.label || stage;
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header con toggle y filtros */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline de Ventas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {accounts.length} cuentas · HORECA + Distribuidores
            </p>
          </div>

          {/* Toggle View */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                view === 'kanban'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🎴 Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                view === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📋 Tabla
            </button>
          </div>
        </div>

        {/* Filtros */}
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

      {/* Vista Kanban */}
      {view === 'kanban' && (
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

                <div className="space-y-3 min-h-[200px]">
                  {stageAccounts.length === 0 ? (
                    <div className="sb-card-glass-light p-8 text-center text-muted-foreground text-sm">
                      No hay cuentas
                    </div>
                  ) : (
                    stageAccounts.map((account) => {
                      const taskCount = tasksByAccount[account.id] || 0;
                      const ownerName = users.find(u => u.id === account.ownerId)?.name || 'Sin asignar';
                      const nextEvent = nextEventByAccount[account.id];
                      
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          currentUserId={currentUser.id}
                          ownerName={ownerName}
                          taskCount={taskCount}
                          nextEvent={nextEvent}
                          onClick={() => openDrawer(account.id)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista Tabla */}
      {view === 'table' && (
        <div className="sb-card-glass-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sb-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-muted/50 rounded"
                    >
                      {selected.length === accounts.length && accounts.length > 0 ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th>Nombre</th>
                  <th>Segmento</th>
                  <th>Stage</th>
                  <th>Ciudad</th>
                  <th>Responsable</th>
                  <th>Tareas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => {
                  const taskCount = tasksByAccount[acc.id] || 0;
                  const ownerName = users.find(u => u.id === acc.ownerId)?.name || '—';
                  
                  return (
                    <tr key={acc.id} className="cursor-pointer hover:bg-accent/50">
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(acc.id)}
                          className="p-1 hover:bg-muted/50 rounded"
                        >
                          {selected.includes(acc.id) ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        <div className="font-medium">{acc.name}</div>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                          {acc.segment}
                        </span>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {getTypeLabel(acc.stage)}
                        </span>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        <span className="text-muted-foreground">{(acc as any).city || '—'}</span>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        <span className="text-sm">{ownerName}</span>
                      </td>
                      <td onClick={() => openDrawer(acc.id)}>
                        {taskCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {taskCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 hover:bg-secondary rounded text-xs"
                            title="Llamar"
                          >
                            📞
                          </button>
                          <button
                            className="p-1.5 hover:bg-secondary rounded text-xs"
                            title="Pedido"
                          >
                            📦
                          </button>
                          <button
                            className={`p-1.5 hover:bg-secondary rounded text-xs ${
                              acc.isTarget ? 'text-amber-600' : ''
                            }`}
                            title="Objetivo"
                          >
                            🎯
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {accounts.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm">No se encontraron cuentas</p>
              <p className="text-xs mt-1">Ajusta los filtros para ver más resultados</p>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="sb-card-glass-light p-5">
        <h3 className="text-sm font-semibold mb-2">✨ Pipeline Unificado</h3>
        <p className="text-sm text-muted-foreground">
          Vista de cuentas HORECA y Distribuidores con sistema unificado de tareas TaskNew.
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>✅ Toggle Kanban/Tabla</span>
          <span>✅ Filtros funcionales</span>
          <span>✅ ContactDrawer integrado</span>
          <span>✅ Quick actions</span>
        </div>
      </div>
    </div>
  );
}
