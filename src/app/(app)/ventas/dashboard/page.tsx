"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import { 
  ShoppingCart, 
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Package
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { listAllProjects } from "@/server/actions/projects";
import type { Project } from "@/domain/ssot";
import { ProjectCard } from "@/features/projects/components";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";

export default function VentasDashboardPage() {
  const { data } = useData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Cargar proyectos del departamento Ventas
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      const result = await listAllProjects();
      if (result.success) {
        const salesProjects = result.data.filter(p => p.department === 'VENTAS');
        setProjects(salesProjects);
      }
      setLoadingProjects(false);
    }
    
    loadProjects();
  }, []);
  
  // Datos del SSOT
  const orders = data?.ordersSellOut || [];
  const accounts = data?.accounts || [];
  const contacts = data?.contacts || [];
  
  // KPIs calculados
  const activeAccounts = useMemo(() => {
    return accounts.filter(a => a.stage === 'ACTIVA').length;
  }, [accounts]);
  
  const monthOrders = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter(o => {
      const orderDate = new Date(o.orderDate || o.createdAt);
      return orderDate.getMonth() === now.getMonth() && 
             orderDate.getFullYear() === now.getFullYear();
    });
    return thisMonth.length;
  }, [orders]);
  
  const monthRevenue = useMemo(() => {
    const now = new Date();
    return orders
      .filter(o => {
        const orderDate = new Date(o.orderDate || o.createdAt);
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders]);
  
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'open' || o.status === 'confirmed').length;
  }, [orders]);
  
  // Tareas del equipo ventas
  const teamAlerts = [
    { 
      id: 'team-task-1', 
      type: 'critical' as const, 
      title: '📋 Seguimiento pedido La Marina',
      description: 'Vence hoy · Asignada a: Juan López · Cliente VIP',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-2', 
      type: 'warning' as const, 
      title: '📋 Visita comercial Grupo VIPS',
      description: 'Vence mañana · Asignada a: María García · Presentación productos',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-3', 
      type: 'info' as const, 
      title: '📋 Cerrar contrato distribuidor Madrid',
      description: 'Esta semana · Asignada a: Carlos Ruiz · Negociación final',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-4', 
      type: 'warning' as const, 
      title: '📋 Reactivar cuenta Hotel Palace',
      description: 'Vence en 3 días · Asignada a: Ana Martínez · Sin pedidos 60 días',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />
        Dashboard Ventas
      </h1>
      
      <div className="sb-page__content">
        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeAccounts}</div>
            <div className="sb-kpi__label">🏪 CUENTAS ACTIVAS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              {accounts.length} total
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{monthOrders}</div>
            <div className="sb-kpi__label">📦 PEDIDOS MES</div>
            <div className="sb-kpi__change">Este mes</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">€{(monthRevenue / 1000).toFixed(1)}K</div>
            <div className="sb-kpi__label">💰 FACTURACIÓN MES</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              Revenue
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{pendingOrders}</div>
            <div className="sb-kpi__label">⏳ PEDIDOS PENDIENTES</div>
            <div className="sb-kpi__change">Por confirmar</div>
          </div>
        </div>

        {/* Proyectos del Equipo Ventas */}
        {!loadingProjects && projects.length > 0 && (
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">🎯 Proyectos del Equipo Ventas ({projects.length})</h3>
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
              <button className="sb-tile" onClick={() => window.location.href = '/ventas/cuentas'}>
                <Users size={20} />
                <span className="sb-tile__label">Ver Cuentas</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/ventas/pedidos'}>
                <Package size={20} />
                <span className="sb-tile__label">Ver Pedidos</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/contacts'}>
                <Target size={20} />
                <span className="sb-tile__label">Contactos</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/calendario'}>
                <TrendingUp size={20} />
                <span className="sb-tile__label">Mi Pipeline</span>
              </button>
            </div>
          </div>
        </SBCard>

        {/* Grid de 2 columnas: Tareas + Resumen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tareas del Equipo */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">📋 Tareas del Equipo Ventas</h3>
              <AlertsCard alerts={teamAlerts} variant="light" />
            </div>
          </div>

          {/* Resumen Ventas */}
          <div className="space-y-4">
            <SBCard>
              <div className="sb-card__header">
                <h3 className="sb-card__title">📊 Resumen de Ventas</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="sb-metric">
                  <Users className="text-primary" size={24} />
                  <div>
                    <div className="sb-metric__label">Cuentas Totales</div>
                    <div className="text-2xl font-bold">{accounts.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeAccounts} activas
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <ShoppingCart className="text-blue-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Pedidos</div>
                    <div className="text-2xl font-bold">{orders.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {monthOrders} este mes
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <DollarSign className="text-success" size={24} />
                  <div>
                    <div className="sb-metric__label">Facturación</div>
                    <div className="text-2xl font-bold">€{(monthRevenue / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-success">
                      Este mes
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Target className="text-amber-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Pipeline</div>
                    <div className="text-2xl font-bold">{pendingOrders}</div>
                    <div className="text-xs text-muted-foreground">
                      Oportunidades abiertas
                    </div>
                  </div>
                </div>
              </div>
            </SBCard>
          </div>
        </div>

        {/* Top Cuentas */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">🏆 Top Cuentas</h3>
            <button 
              className="sb-btn sb-btn--sm sb-btn--ghost"
              onClick={() => window.location.href = '/ventas/cuentas'}
            >
              Ver Todas
            </button>
          </div>
          <div className="sb-card__content">
            {accounts.length === 0 ? (
              <div className="sb-empty py-8">
                <Users size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin cuentas registradas</p>
                <p className="sb-empty__description">
                  No hay cuentas en el sistema
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">Cuenta</th>
                      <th className="pb-2 font-medium">Segmento</th>
                      <th className="pb-2 font-medium">Stage</th>
                      <th className="pb-2 font-medium">Comercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {accounts.slice(0, 5).map((account) => (
                      <tr key={account.id} className="hover:bg-secondary/30">
                        <td className="py-3 font-medium">{account.name}</td>
                        <td className="py-3">{account.segment}</td>
                        <td className="py-3">
                          <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                            account.stage === 'ACTIVA'
                              ? 'bg-success/10 text-success'
                              : account.stage === 'POTENCIAL'
                              ? 'bg-info/10 text-info'
                              : 'bg-muted/10 text-muted-foreground'
                          }`}>
                            {account.stage}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{account.ownerId || 'Sin asignar'}</td>
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
