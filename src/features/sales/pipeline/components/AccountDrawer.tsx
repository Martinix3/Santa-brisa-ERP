'use client';

import { useState } from 'react';
import type { Account, TaskNew } from '@/domain/ssot';
import { ACCOUNT_STAGE_META } from '@/domain/ssot';
import { X, Target, Phone, Package, Calendar } from 'lucide-react';
import { createInteractionTask, createOrderPrepTask, toggleAccountObjective } from '../pipeline.actions.v2';

interface AccountDrawerProps {
  account: Account | null;
  tasks: TaskNew[];
  onClose: () => void;
  currentUserId: string;
}

export function AccountDrawer({ account, tasks, onClose, currentUserId }: AccountDrawerProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'tareas' | 'pedidos'>('resumen');

  if (!account) return null;

  const stageMeta = ACCOUNT_STAGE_META[account.stage];
  const accountTasks = tasks.filter(t => t.accountId === account.id);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-background z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{account.name}</h2>
              {account.isTarget && (
                <Target size={20} className="text-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                {stageMeta.label}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                {account.segment}
              </span>
              {account.flow && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  {account.flow === 'DIRECT' ? 'Venta Directa' : 'Colocación'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'resumen'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('tareas')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
              activeTab === 'tareas'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary'
            }`}
          >
            Tareas
            {accountTasks.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-background text-foreground">
                {accountTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'pedidos'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary'
            }`}
          >
            Pedidos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Información General</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Segmento:</span>
                    <span className="font-medium">{account.segment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flujo:</span>
                    <span className="font-medium">
                      {account.flow === 'DIRECT' ? 'Venta Directa' : account.flow === 'PLACEMENT' ? 'Colocación' : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etapa:</span>
                    <span className="font-medium">{stageMeta.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objetivo:</span>
                    <span className="font-medium">{account.isTarget ? '⭐ Sí' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Métricas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="sb-card">
                    <div className="sb-card__content">
                      <div className="text-sm text-muted-foreground">Tareas Activas</div>
                      <div className="text-2xl font-bold mt-1">{accountTasks.length}</div>
                    </div>
                  </div>
                  <div className="sb-card">
                    <div className="sb-card__content">
                      <div className="text-sm text-muted-foreground">Pedidos (último mes)</div>
                      <div className="text-2xl font-bold mt-1">-</div>
                    </div>
                  </div>
                </div>
              </div>

              {account.notes && (
                <div>
                  <h3 className="font-semibold mb-3">Notas</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {account.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tareas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Tareas de esta cuenta</h3>
                <button
                  onClick={async () => {
                    await createInteractionTask({
                      accountId: account.id,
                      userId: currentUserId,
                      title: `Seguimiento ${account.name}`,
                    });
                  }}
                  className="sb-btn sb-btn--sm"
                >
                  + Nueva tarea
                </button>
              </div>

              {accountTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay tareas para esta cuenta</p>
                  <p className="text-sm mt-1">Crea una tarea para hacer seguimiento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountTasks.map((task) => (
                    <div key={task.id} className="sb-card">
                      <div className="sb-card__content">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            {task.desc && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.desc}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.status === 'DONE' 
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {task.status}
                              </span>
                              {task.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  task.priority === 'URGENT' || task.priority === 'HIGH'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.dueAt && (
                                <span className="text-xs text-muted-foreground">
                                  📅 {new Date(task.dueAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pedidos' && (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p>Historial de pedidos</p>
              <p className="text-sm mt-1">Próximamente</p>
            </div>
          )}
        </div>

        {/* Footer con Quick Actions */}
        <div className="flex items-center gap-3 p-6 border-t bg-muted/50">
          <button
            onClick={async () => {
              await createInteractionTask({
                accountId: account.id,
                userId: currentUserId,
                title: `Llamada a ${account.name}`,
              });
            }}
            className="flex-1 sb-btn"
          >
            <Phone size={16} />
            Llamar
          </button>
          <button
            onClick={async () => {
              await createOrderPrepTask({
                accountId: account.id,
                userId: currentUserId,
                title: `Preparar pedido ${account.name}`,
              });
            }}
            className="flex-1 sb-btn"
          >
            <Package size={16} />
            Pedido
          </button>
          <button
            onClick={async () => {
              await toggleAccountObjective({
                accountId: account.id,
                on: !account.isTarget,
                userId: currentUserId,
              });
            }}
            className={`flex-1 sb-btn ${account.isTarget ? 'sb-btn--warning' : ''}`}
          >
            <Target size={16} />
            {account.isTarget ? 'Quitar objetivo' : 'Marcar objetivo'}
          </button>
        </div>
      </div>
    </>
  );
}
