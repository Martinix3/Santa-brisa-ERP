"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import { 
  Truck, 
  Package, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Box,
  Boxes
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { listAllProjects } from "@/server/actions/projects";
import type { Project, OrderSellOut } from "@/domain/ssot";
import { ProjectCard } from "@/features/projects/components";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";

export default function WarehouseDashboardPage() {
  const { data } = useData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Cargar proyectos del departamento Warehouse
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      const result = await listAllProjects();
      if (result.success) {
        // Filtrar solo proyectos del departamento ALMACEN
        const warehouseProjects = result.data.filter(p => p.department === 'ALMACEN');
        setProjects(warehouseProjects);
      }
      setLoadingProjects(false);
    }
    
    loadProjects();
  }, []);
  
  // Datos del SSOT
  const lots = data?.lots || [];
  const onHand = data?.onHand || [];
  const orders = data?.ordersSellOut || [];
  
  // KPIs calculados
  const activeLots = useMemo(() => lots.filter(l => l.qcStatus === 'PASSED' || l.status === 'RELEASED').length, [lots]);
  const totalSkus = useMemo(() => {
    const uniqueSkus = new Set(onHand.map(oh => oh.itemId));
    return uniqueSkus.size;
  }, [onHand]);
  const totalStock = useMemo(() => {
    return onHand.reduce((sum, oh) => sum + (oh.qty || 0), 0);
  }, [onHand]);
  const pendingOrders = useMemo(() => {
    return orders.filter((o: OrderSellOut) => o.status === 'open' || o.status === 'confirmed').length;
  }, [orders]);
  
  // Alertas + Tareas del equipo warehouse
  const teamAlerts = [
    // Tareas del equipo almacén
    { 
      id: 'team-task-1', 
      type: 'critical' as const, 
      title: '📋 Revisar stock crítico SKU-LIME-01',
      description: 'Vence hoy · Asignada a: Pedro Ruiz · Solo quedan 18 unidades',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-2', 
      type: 'warning' as const, 
      title: '📋 Recepción material PLV feria',
      description: 'Vence mañana · Asignada a: Laura Sánchez · Verificar cantidades',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-3', 
      type: 'info' as const, 
      title: '📋 Auditoría inventario trimestral',
      description: 'Esta semana · Asignada a: Carlos Gómez · Preparar documentación',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-4', 
      type: 'warning' as const, 
      title: '📋 Optimizar picking zona A',
      description: 'Vence en 3 días · Asignada a: Ana Martín · Reorganizar estanterías',
      actionLabel: 'Ver tarea'
    }
  ];

  // Actividad reciente
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      date: string;
      icon: string;
    }> = [];
    
    // Últimos lotes recibidos
    lots.slice(0, 3).forEach(lot => {
      activities.push({
        id: `lot-${lot.id}`,
        type: 'Lote',
        title: lot.lotNumber || 'Lote sin número',
        description: `Item: ${lot.itemId}`,
        date: lot.receivedAt || lot.createdAt,
        icon: '📦'
      });
    });
    
    // Ordenar por fecha
    return activities.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  }, [lots]);

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Truck className="h-6 w-6" />
        Dashboard Almacén
      </h1>
      
      <div className="sb-page__content">
        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeLots}</div>
            <div className="sb-kpi__label">📦 LOTES ACTIVOS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              {lots.length} total
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{totalSkus}</div>
            <div className="sb-kpi__label">🏷️ SKUs EN STOCK</div>
            <div className="sb-kpi__change">Inventario</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{totalStock.toLocaleString()}</div>
            <div className="sb-kpi__label">📊 UNIDADES TOTALES</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              En almacén
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{pendingOrders}</div>
            <div className="sb-kpi__label">🚚 PEDIDOS PENDIENTES</div>
            <div className="sb-kpi__change">Por preparar</div>
          </div>
        </div>

        {/* Proyectos del Equipo Warehouse */}
        {!loadingProjects && projects.length > 0 && (
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">🎯 Proyectos del Equipo Almacén ({projects.length})</h3>
            </div>
            <div className="sb-card__content">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    progress={0}
                    teamMembers={[]}
                    onClick={() => {/* TODO: abrir ProjectDrawer */}}
                  />
                ))}
              </div>
            </div>
          </SBCard>
        )}

        {/* Quick Actions */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">⚡ Acciones Rápidas</h3>
          </div>
          <div className="sb-card__content">
            <div className="sb-tiles">
              <button className="sb-tile" onClick={() => window.location.href = '/warehouse/inventory'}>
                <Package size={20} />
                <span className="sb-tile__label">Ver Inventario</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/warehouse/goods-receipt'}>
                <Box size={20} />
                <span className="sb-tile__label">Nueva Recepción</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/warehouse/logistics'}>
                <Truck size={20} />
                <span className="sb-tile__label">Gestión Logística</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/quality/lot-release'}>
                <CheckCircle2 size={20} />
                <span className="sb-tile__label">Liberar Lotes</span>
              </button>
            </div>
          </div>
        </SBCard>

        {/* Grid de 2 columnas: Actividad Reciente + Tareas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad Reciente */}
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">📌 Actividad Reciente</h3>
            </div>
            <div className="sb-card__content space-y-3">
              {recentActivity.length === 0 ? (
                <div className="sb-empty py-8">
                  <AlertCircle size={48} className="sb-empty__icon" />
                  <p className="sb-empty__title">Sin actividad</p>
                  <p className="sb-empty__description">
                    No hay movimientos recientes de almacén
                  </p>
                </div>
              ) : (
                recentActivity.map(item => (
                  <div key={item.id} className="sb-card hover-raise p-3 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="sb-avatar">{item.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="sb-badge sb-badge--primary">{item.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SBCard>

          {/* Tareas del Equipo */}
          <div className="space-y-4">
            {/* Tareas del equipo con "assigned to" */}
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">📋 Tareas del Equipo Almacén</h3>
              <AlertsCard alerts={teamAlerts} variant="light" />
            </div>

            <SBCard>
              <div className="sb-card__header">
                <h3 className="sb-card__title">📊 Resumen de Stock</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="sb-metric">
                  <Boxes className="text-primary" size={24} />
                  <div>
                    <div className="sb-metric__label">Lotes Totales</div>
                    <div className="text-2xl font-bold">{lots.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeLots} activos
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Package className="text-blue-500" size={24} />
                  <div>
                    <div className="sb-metric__label">SKUs</div>
                    <div className="text-2xl font-bold">{totalSkus}</div>
                    <div className="text-xs text-muted-foreground">
                      Referencias únicas
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <TrendingUp className="text-success" size={24} />
                  <div>
                    <div className="sb-metric__label">Unidades</div>
                    <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
                    <div className="text-xs text-success">
                      Total en almacén
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Truck className="text-amber-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Pedidos</div>
                    <div className="text-2xl font-bold">{pendingOrders}</div>
                    <div className="text-xs text-muted-foreground">
                      Pendientes preparación
                    </div>
                  </div>
                </div>
              </div>
            </SBCard>
          </div>
        </div>

        {/* Stock Crítico */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">⚠️ Stock Crítico</h3>
            <button 
              className="sb-btn sb-btn--sm sb-btn--ghost"
              onClick={() => window.location.href = '/warehouse/inventory'}
            >
              Ver Todo
            </button>
          </div>
          <div className="sb-card__content">
            {onHand.length === 0 ? (
              <div className="sb-empty py-8">
                <Package size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin stock registrado</p>
                <p className="sb-empty__description">
                  No hay registros de stock en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 font-medium">Ubicación</th>
                      <th className="pb-2 font-medium">Cantidad</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {onHand.slice(0, 5).map((stock, idx) => (
                      <tr key={`${stock.itemId}-${stock.locationId}-${idx}`} className="hover:bg-secondary/30">
                        <td className="py-3 font-medium">{stock.itemId}</td>
                        <td className="py-3">{stock.locationId || 'Sin ubicación'}</td>
                        <td className="py-3">{stock.qty}</td>
                        <td className="py-3">
                          <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                            (stock.qty || 0) < 20
                              ? 'bg-destructive/10 text-destructive'
                              : (stock.qty || 0) < 50
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                          }`}>
                            {(stock.qty || 0) < 20 ? 'Crítico' : (stock.qty || 0) < 50 ? 'Bajo' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SBCard>
      </div>
    </div>
  );
}
