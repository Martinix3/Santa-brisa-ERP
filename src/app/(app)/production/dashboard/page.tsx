"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import { 
  Factory, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { listAllProjects } from "@/server/actions/projects";
import type { Project } from "@/domain/ssot";
import { ProjectCard } from "@/features/projects/components";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";

export default function ProductionDashboardPage() {
  const { data } = useData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Cargar proyectos del departamento Producción
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      const result = await listAllProjects();
      if (result.success) {
        const productionProjects = result.data.filter(p => p.department === 'PRODUCCION');
        setProjects(productionProjects);
      }
      setLoadingProjects(false);
    }
    
    loadProjects();
  }, []);
  
  // Datos del SSOT
  const productionOrders = data?.productionOrders || [];
  const lots = data?.lots || [];
  const boms = data?.billOfMaterials || [];
  
  // KPIs calculados
  const activeOrders = useMemo(() => {
    return productionOrders.filter(po => 
      po.status === 'IN_PROGRESS' || po.status === 'RELEASED'
    ).length;
  }, [productionOrders]);
  
  const completedOrders = useMemo(() => {
    return productionOrders.filter(po => po.status === 'DONE').length;
  }, [productionOrders]);
  
  const activeLots = useMemo(() => {
    return lots.filter(l => l.qcStatus === 'PASSED' || l.status === 'RELEASED').length;
  }, [lots]);
  
  const activeBOMs = useMemo(() => {
    return boms.filter(b => b.isActive !== false).length;
  }, [boms]);
  
  // Tareas del equipo producción
  const teamAlerts = [
    { 
      id: 'team-task-1', 
      type: 'critical' as const, 
      title: '📋 Iniciar producción lote SB-MAR-2025-001',
      description: 'Vence hoy · Asignada a: Pedro González · 1000 unidades',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-2', 
      type: 'warning' as const, 
      title: '📋 Control calidad lote envasado',
      description: 'Vence mañana · Asignada a: Laura Ruiz · Protocolo CCP',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-3', 
      type: 'info' as const, 
      title: '📋 Actualizar BOM Santa Margarita',
      description: 'Esta semana · Asignada a: Carlos López · Nueva fórmula',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-4', 
      type: 'warning' as const, 
      title: '📋 Mantenimiento línea envasado',
      description: 'Vence en 3 días · Asignada a: Juan Martín · Preventivo mensual',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Factory className="h-6 w-6" />
        Dashboard Producción
      </h1>
      
      <div className="sb-page__content">
        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeOrders}</div>
            <div className="sb-kpi__label">🏭 ÓRDENES ACTIVAS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              En producción
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{completedOrders}</div>
            <div className="sb-kpi__label">✅ COMPLETADAS</div>
            <div className="sb-kpi__change">Este mes</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeLots}</div>
            <div className="sb-kpi__label">📦 LOTES LIBERADOS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              {lots.length} total
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeBOMs}</div>
            <div className="sb-kpi__label">📋 BOMs ACTIVOS</div>
            <div className="sb-kpi__change">Recetas</div>
          </div>
        </div>

        {/* Proyectos del Equipo Producción */}
        {!loadingProjects && projects.length > 0 && (
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">🎯 Proyectos del Equipo Producción ({projects.length})</h3>
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
              <button className="sb-tile" onClick={() => window.location.href = '/production/execution'}>
                <Factory size={20} />
                <span className="sb-tile__label">Ejecución</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/production/bom'}>
                <Package size={20} />
                <span className="sb-tile__label">BOMs</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/quality/lot-release'}>
                <CheckCircle2 size={20} />
                <span className="sb-tile__label">Liberar Lotes</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/warehouse/inventory'}>
                <TrendingUp size={20} />
                <span className="sb-tile__label">Inventario</span>
              </button>
            </div>
          </div>
        </SBCard>

        {/* Grid de 2 columnas: Tareas + Resumen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tareas del Equipo */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">📋 Tareas del Equipo Producción</h3>
              <AlertsCard alerts={teamAlerts} variant="light" />
            </div>
          </div>

          {/* Resumen Producción */}
          <div className="space-y-4">
            <SBCard>
              <div className="sb-card__header">
                <h3 className="sb-card__title">📊 Resumen de Producción</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="sb-metric">
                  <Factory className="text-primary" size={24} />
                  <div>
                    <div className="sb-metric__label">Órdenes Totales</div>
                    <div className="text-2xl font-bold">{productionOrders.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeOrders} activas
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Package className="text-blue-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Lotes</div>
                    <div className="text-2xl font-bold">{lots.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeLots} liberados
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <CheckCircle2 className="text-success" size={24} />
                  <div>
                    <div className="sb-metric__label">Completadas</div>
                    <div className="text-2xl font-bold">{completedOrders}</div>
                    <div className="text-xs text-success">
                      Este mes
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Clock className="text-amber-500" size={24} />
                  <div>
                    <div className="sb-metric__label">BOMs</div>
                    <div className="text-2xl font-bold">{activeBOMs}</div>
                    <div className="text-xs text-muted-foreground">
                      Recetas activas
                    </div>
                  </div>
                </div>
              </div>
            </SBCard>
          </div>
        </div>

        {/* Órdenes de Producción Activas */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">🏭 Órdenes de Producción Activas</h3>
            <button 
              className="sb-btn sb-btn--sm sb-btn--ghost"
              onClick={() => window.location.href = '/production/execution'}
            >
              Ver Todas
            </button>
          </div>
          <div className="sb-card__content">
            {productionOrders.length === 0 ? (
              <div className="sb-empty py-8">
                <Factory size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin órdenes de producción</p>
                <p className="sb-empty__description">
                  No hay órdenes en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">Orden</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">Cantidad</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {productionOrders.slice(0, 5).map((po) => (
                      <tr key={po.id} className="hover:bg-secondary/30">
                        <td className="py-3 font-medium">{po.orderNumber || po.id}</td>
                        <td className="py-3">{po.outputItemId}</td>
                        <td className="py-3">{po.targetQuantity} {po.baseUnit}</td>
                        <td className="py-3">
                          <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                            po.status === 'DONE'
                              ? 'bg-success/10 text-success'
                              : po.status === 'IN_PROGRESS'
                              ? 'bg-info/10 text-info'
                              : po.status === 'RELEASED'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted/10 text-muted-foreground'
                          }`}>
                            {po.status}
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
