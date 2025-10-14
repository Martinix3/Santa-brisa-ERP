"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import { 
  ShieldCheck, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Package
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { listAllProjects } from "@/server/actions/projects";
import type { Project } from "@/domain/ssot";
import { ProjectCard } from "@/features/projects/components";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";

export default function QualityDashboardPage() {
  const { data } = useData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Cargar proyectos del departamento Calidad
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      const result = await listAllProjects();
      if (result.success) {
        const qualityProjects = result.data.filter(p => p.department === 'CALIDAD');
        setProjects(qualityProjects);
      }
      setLoadingProjects(false);
    }
    
    loadProjects();
  }, []);
  
  // Datos del SSOT
  const lots = data?.lots || [];
  const qcTests = data?.qcTests || [];
  const qcPlans = data?.qcPlans || [];
  const qcProtocols = data?.qcProtocols || [];
  
  // KPIs calculados
  const passedLots = useMemo(() => {
    return lots.filter(l => l.qcStatus === 'PASSED').length;
  }, [lots]);
  
  const pendingLots = useMemo(() => {
    return lots.filter(l => l.qcStatus === 'PENDING').length;
  }, [lots]);
  
  const failedLots = useMemo(() => {
    return lots.filter(l => l.qcStatus === 'FAILED').length;
  }, [lots]);
  
  const totalTests = useMemo(() => {
    return qcTests.length;
  }, [qcTests]);
  
  // Tareas del equipo calidad
  const teamAlerts = [
    { 
      id: 'team-task-1', 
      type: 'critical' as const, 
      title: '📋 Liberar lote SB-MAR-2025-001',
      description: 'Vence hoy · Asignada a: Laura Sánchez · Tests completos',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-2', 
      type: 'warning' as const, 
      title: '📋 Auditoría APPCC mensual',
      description: 'Vence mañana · Asignada a: Carlos Ruiz · Revisar protocolos',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-3', 
      type: 'info' as const, 
      title: '📋 Actualizar especificaciones MP',
      description: 'Esta semana · Asignada a: Ana López · Nuevos proveedores',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-4', 
      type: 'warning' as const, 
      title: '📋 Calibrar equipos laboratorio',
      description: 'Vence en 3 días · Asignada a: Pedro Martín · Mantenimiento preventivo',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <ShieldCheck className="h-6 w-6" />
        Dashboard Calidad
      </h1>
      
      <div className="sb-page__content">
        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{passedLots}</div>
            <div className="sb-kpi__label">✅ LOTES APROBADOS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              Liberados
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{pendingLots}</div>
            <div className="sb-kpi__label">⏳ PENDIENTES</div>
            <div className="sb-kpi__change">En revisión</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{failedLots}</div>
            <div className="sb-kpi__label">❌ RECHAZADOS</div>
            <div className="sb-kpi__change sb-kpi__change--negative">
              No conformes
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{totalTests}</div>
            <div className="sb-kpi__label">🧪 TESTS REALIZADOS</div>
            <div className="sb-kpi__change">Total</div>
          </div>
        </div>

        {/* Proyectos del Equipo Calidad */}
        {!loadingProjects && projects.length > 0 && (
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">🎯 Proyectos del Equipo Calidad ({projects.length})</h3>
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
              <button className="sb-tile" onClick={() => window.location.href = '/quality/lot-release'}>
                <CheckCircle2 size={20} />
                <span className="sb-tile__label">Liberar Lotes</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/quality/traceability'}>
                <Package size={20} />
                <span className="sb-tile__label">Trazabilidad</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/quality/parametros'}>
                <TrendingUp size={20} />
                <span className="sb-tile__label">Parámetros</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/production/execution'}>
                <ShieldCheck size={20} />
                <span className="sb-tile__label">Protocolos</span>
              </button>
            </div>
          </div>
        </SBCard>

        {/* Grid de 2 columnas: Tareas + Resumen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tareas del Equipo */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">📋 Tareas del Equipo Calidad</h3>
              <AlertsCard alerts={teamAlerts} variant="light" />
            </div>
          </div>

          {/* Resumen Calidad */}
          <div className="space-y-4">
            <SBCard>
              <div className="sb-card__header">
                <h3 className="sb-card__title">📊 Resumen de Calidad</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="sb-metric">
                  <Package className="text-primary" size={24} />
                  <div>
                    <div className="sb-metric__label">Lotes Totales</div>
                    <div className="text-2xl font-bold">{lots.length}</div>
                    <div className="text-xs text-muted-foreground">
                      En sistema
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <CheckCircle2 className="text-success" size={24} />
                  <div>
                    <div className="sb-metric__label">Aprobados</div>
                    <div className="text-2xl font-bold">{passedLots}</div>
                    <div className="text-xs text-success">
                      {lots.length > 0 ? ((passedLots / lots.length) * 100).toFixed(1) : 0}% tasa
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <AlertCircle className="text-amber-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Pendientes</div>
                    <div className="text-2xl font-bold">{pendingLots}</div>
                    <div className="text-xs text-muted-foreground">
                      En revisión
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <XCircle className="text-destructive" size={24} />
                  <div>
                    <div className="sb-metric__label">Rechazados</div>
                    <div className="text-2xl font-bold">{failedLots}</div>
                    <div className="text-xs text-muted-foreground">
                      No conformes
                    </div>
                  </div>
                </div>
              </div>
            </SBCard>
          </div>
        </div>

        {/* Lotes Pendientes de Liberación */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">⏳ Lotes Pendientes de Liberación</h3>
            <button 
              className="sb-btn sb-btn--sm sb-btn--ghost"
              onClick={() => window.location.href = '/quality/lot-release'}
            >
              Ver Todos
            </button>
          </div>
          <div className="sb-card__content">
            {lots.length === 0 ? (
              <div className="sb-empty py-8">
                <Package size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin lotes registrados</p>
                <p className="sb-empty__description">
                  No hay lotes en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">Lote</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">Cantidad</th>
                      <th className="pb-2 font-medium">Estado QC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {lots.slice(0, 5).map((lot) => (
                      <tr key={lot.id} className="hover:bg-secondary/30">
                        <td className="py-3 font-medium">{lot.lotNumber}</td>
                        <td className="py-3">{lot.itemName || lot.itemId}</td>
                        <td className="py-3">{lot.quantity} {lot.uom}</td>
                        <td className="py-3">
                          <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                            lot.qcStatus === 'PASSED'
                              ? 'bg-success/10 text-success'
                              : lot.qcStatus === 'FAILED'
                              ? 'bg-destructive/10 text-destructive'
                              : lot.qcStatus === 'PENDING'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted/10 text-muted-foreground'
                          }`}>
                            {lot.qcStatus || 'PENDING'}
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
