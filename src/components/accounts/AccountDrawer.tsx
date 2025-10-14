"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Building2, TrendingUp, Sparkles } from "lucide-react";
import { AccountKPIs } from "./AccountKPIs";
import { AccountTimeline } from "./AccountTimeline";
import { AccountOrdersTab } from "./AccountOrdersTab";
import { AccountTasksTab } from "./AccountTasksTab";
import { 
  getAccountKPIs, 
  getAccountTimeline, 
  getAccountOrders,
  getAccountTasks,
  type AccountKPIs as AccountKPIsType,
  type TimelineEvent
} from "@/server/actions/accounts";
import type { Account, Order, TaskNew } from "@/domain/ssot";

interface AccountDrawerProps {
  account: Account;
  onClose: () => void;
}

type TabId = 'overview' | 'orders' | 'tasks' | 'timeline';

export function AccountDrawer({ account, onClose }: AccountDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [kpis, setKpis] = useState<AccountKPIsType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<TaskNew[]>([]);
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAccountData();
  }, [account.id]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [kpisRes, timelineRes, ordersRes, tasksRes] = await Promise.all([
        getAccountKPIs(account.id),
        getAccountTimeline(account.id, { limit: 20 }),
        getAccountOrders(account.id),
        getAccountTasks(account.id)
      ]);

      if (!kpisRes.success) throw new Error(kpisRes.error || 'Error loading KPIs');
      if (!timelineRes.success) throw new Error(timelineRes.error || 'Error loading timeline');
      if (!ordersRes.success) throw new Error(ordersRes.error || 'Error loading orders');
      if (!tasksRes.success) throw new Error(tasksRes.error || 'Error loading tasks');

      setKpis(kpisRes.data!);
      setTimeline(timelineRes.data || []);
      setTimelineHasMore(timelineRes.hasMore || false);
      setOrders(ordersRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading account data');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTimeline = async () => {
    if (timelineLoading || !timelineHasMore) return;

    try {
      setTimelineLoading(true);
      const res = await getAccountTimeline(account.id, {
        limit: 20,
        offset: timeline.length
      });

      if (res.success && res.data) {
        setTimeline([...timeline, ...res.data]);
        setTimelineHasMore(res.hasMore || false);
      }
    } catch (err) {
      console.error('Error loading more timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      ACTIVA: 'bg-green-500/20 text-green-700 border-green-500/30',
      POTENCIAL: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      SEGUIMIENTO: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
      FALLIDA: 'bg-red-500/20 text-red-700 border-red-500/30',
      CERRADA: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
      BAJA: 'bg-gray-500/20 text-gray-700 border-gray-500/30'
    };
    return colors[stage] || 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  };

  const getFlowBadge = (flow: string, distributorId?: string) => {
    if (flow === 'DIRECT' || !distributorId) {
      return (
        <span className="sb-badge sb-badge--primary">
          🏪 Venta Directa
        </span>
      );
    }
    return (
      <span className="sb-badge sb-badge--warning">
        📦 Colocación
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-4xl h-full bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border/50 bg-secondary/30 backdrop-blur-sm">
          <div className="flex items-start justify-between p-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Building2 size={24} className="text-primary flex-shrink-0" />
                <h2 className="text-2xl font-bold truncate">{account.name}</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Stage Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStageColor(account.stage)}`}>
                  {account.stage}
                </span>

                {/* Flow Badge */}
                {getFlowBadge(account.flow, account.distributorPartyId)}

                {/* Segment */}
                <span className="sb-badge sb-badge--default">
                  {account.segment}
                </span>
              </div>

              {/* Distributor Info (if PLACEMENT) */}
              {account.flow === 'PLACEMENT' && account.distributorPartyId && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-xs font-semibold text-orange-700 mb-1">
                    📦 Cuenta gestionada vía distribuidor
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Distribuidor ID: {account.distributorPartyId}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="sb-btn sb-btn--ghost ml-4"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🛒 Pedidos ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              ✅ Tareas ({tasks.filter(t => t.status !== 'DONE').length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📅 Timeline
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={48} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="sb-card-glass-light p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={loadAccountData}
                className="sb-btn sb-btn--primary"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'overview' && kpis && (
                <>
                  {/* KPIs */}
                  <AccountKPIs data={kpis} />

                  {/* Health Insights */}
                  {kpis.health.recommendations.length > 0 && (
                    <div className="sb-card-glass-light p-4 border-l-4 border-l-orange-500">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Recomendaciones
                      </h3>
                      <ul className="space-y-1">
                        {kpis.health.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span>•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI Insights Placeholder */}
                  <div className="sb-card-glass-light p-6 border border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Sparkles size={24} className="text-primary flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-2">🤖 Santa Brain Insights</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Análisis inteligente basado en {kpis.signals.length} señales detectadas
                        </p>
                        <div className="space-y-2">
                          {kpis.signals.slice(0, 3).map((signal, idx) => (
                            <div key={idx} className="text-xs p-2 bg-background/50 rounded">
                              <span className={`font-semibold ${
                                signal.severity === 'high' ? 'text-red-500' :
                                signal.severity === 'medium' ? 'text-orange-500' :
                                'text-blue-500'
                              }`}>
                                {signal.severity.toUpperCase()}:
                              </span>
                              <span className="ml-2 text-muted-foreground">
                                {signal.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="font-semibold mb-3">Actividad Reciente</h3>
                    <AccountTimeline 
                      events={timeline.slice(0, 5)} 
                      hasMore={false}
                    />
                  </div>
                </>
              )}

              {activeTab === 'orders' && (
                <AccountOrdersTab
                  accountId={account.id}
                  orders={orders}
                  onCreateOrder={() => {
                    // Navigate to create order
                    window.location.href = `/ventas/pedidos/new?accountId=${account.id}`;
                  }}
                />
              )}

              {activeTab === 'tasks' && (
                <AccountTasksTab
                  accountId={account.id}
                  tasks={tasks}
                  onCreateTask={() => {
                    console.log('Create task for account:', account.id);
                    // TODO: Open create task modal
                  }}
                  onToggleTask={async (taskId) => {
                    console.log('Toggle task:', taskId);
                    // TODO: Implement task toggle
                    // Reload data
                    await loadAccountData();
                  }}
                />
              )}

              {activeTab === 'timeline' && (
                <AccountTimeline
                  events={timeline}
                  onLoadMore={loadMoreTimeline}
                  hasMore={timelineHasMore}
                  loading={timelineLoading}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
