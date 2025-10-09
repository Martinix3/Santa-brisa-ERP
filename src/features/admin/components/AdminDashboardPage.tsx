// src/features/admin/components/AdminDashboardPage.tsx
"use client";
import React, { useMemo } from 'react';
import { Users, Target, TrendingUp, Briefcase, Package, Factory, Beaker, Truck, ShoppingCart, Megaphone, DollarSign, ClipboardList } from 'lucide-react';

import { useData } from '@/lib/dataprovider';
import { PageShell } from '@/components/shared/PageShell';
import { getCajasSellOut } from '@/lib/sales-helpers';
import { getPipelineAlerts } from '@/lib/pipeline-helpers';

// Componentes descompuestos
import { KpiCard } from './KpiCard';
import { DepartmentKpiSection } from './DepartmentKpiSection';
import { DepartmentTasksPanel } from './DepartmentTasksPanel';

export function AdminDashboardPage() {
  const { data, currentUser } = useData();

  const kpis = useMemo(() => {
    if (!data) return null;

    const accountsByStage = {
      POTENCIAL: (data.accounts || []).filter(a => a.stage === 'POTENCIAL').length,
      SEGUIMIENTO: (data.accounts || []).filter(a => a.stage === 'SEGUIMIENTO').length,
      ACTIVA: (data.accounts || []).filter(a => a.stage === 'ACTIVA').length,
      FALLIDA: (data.accounts || []).filter(a => a.stage === 'FALLIDA').length,
    };
    
    return {
      activeUsers: (data.users || []).filter(u => u.role !== 'admin' && u.active).length,
      totalUsers: (data.users || []).filter(u => u.role !== 'admin').length,
      totalAccounts: (data.accounts || []).length,
      accountsByStage,
      totalOrders: (data.ordersSellOut || []).length,
      totalCajas: getCajasSellOut(data.ordersSellOut || []),
      allAlerts: getPipelineAlerts(data.accounts || [], data.interactions || []),
      production: {
        title: 'Producción', 
        icon: Factory,
        accentVar: 'produccion',
        stats: [
          { label: 'Planificadas', value: (data.productionOrders || []).filter(po => po.status === 'PLANNED').length, variant: 'info' as const },
          { label: 'En Proceso', value: (data.productionOrders || []).filter(po => po.status === 'IN_PROGRESS' || po.status === 'RELEASED').length, variant: 'primary' as const },
          { label: 'Completadas', value: (data.productionOrders || []).filter(po => po.status === 'DONE').length, variant: 'success' as const },
        ],
      },
      quality: {
        title: 'Calidad', 
        icon: Beaker,
        accentVar: 'calidad',
        stats: [
          { label: 'Pendientes QC', value: (data.lots || []).filter(l => l.qcStatus === 'PENDING').length, variant: 'primary' as const },
          { label: 'Liberados', value: (data.lots || []).filter(l => l.qcStatus === 'PASSED' || l.qcStatus === 'WAIVED').length, variant: 'success' as const },
          { label: 'Rechazados', value: (data.lots || []).filter(l => l.qcStatus === 'FAILED').length, variant: 'destructive' as const },
        ],
      },
      logistics: {
        title: 'Logística', 
        icon: Truck,
        accentVar: 'logistica',
        stats: [
          { label: 'Pendientes', value: (data.shipments || []).filter(s => s.status === 'pending' || s.status === 'picking' || s.status === 'ready_to_ship').length, variant: 'info' as const },
          { label: 'En Tránsito', value: (data.shipments || []).filter(s => s.status === 'shipped').length, variant: 'primary' as const },
          { label: 'Entregados', value: (data.shipments || []).filter(s => s.status === 'delivered').length, variant: 'success' as const },
        ],
      },
      sales: {
        title: 'Ventas',
        icon: ShoppingCart,
        accentVar: 'ventas',
        stats: [
          { label: 'Pendientes', value: (data.ordersSellOut || []).filter(o => o.status === 'open' || o.status === 'confirmed').length, variant: 'info' as const },
          { label: 'Facturados', value: (data.ordersSellOut || []).filter(o => o.billingStatus === 'invoiced').length, variant: 'primary' as const },
          { label: 'Cobrados', value: (data.ordersSellOut || []).filter(o => o.billingStatus === 'paid').length, variant: 'success' as const },
        ],
      },
      marketing: {
        title: 'Marketing',
        icon: Megaphone,
        accentVar: 'marketing',
        stats: [
          { label: 'Eventos Activos', value: (data.marketingEvents || []).filter(e => e.status === 'active' || e.status === 'planned').length, variant: 'primary' as const },
          { label: 'Campañas Online', value: (data.onlineCampaigns || []).filter(c => c.status === 'active').length, variant: 'primary' as const },
          { label: 'Tácticas POS', value: (data.posTactics || []).filter(p => p.status === 'active' || p.status === 'scheduled').length, variant: 'info' as const },
        ],
      },
      finance: {
        title: 'Financiero',
        icon: DollarSign,
        accentVar: 'finance',
        stats: [
          { label: 'Facturas Pendientes', value: (data.financeLinks || []).filter(f => f.status === 'pending').length, variant: 'info' as const },
          { label: 'Vencidas', value: (data.financeLinks || []).filter(f => f.status === 'overdue').length, variant: 'destructive' as const },
          { label: 'Pagadas', value: (data.financeLinks || []).filter(f => f.status === 'paid').length, variant: 'success' as const },
        ],
      }
    };
  }, [data]);

  if (!data || !currentUser || !kpis) {
    return (
      <PageShell title="Dashboard Admin" module="admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </PageShell>
    );
  }

  const formattedDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <PageShell title="" module="admin" className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="sb-h1">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-1 capitalize">{formattedDate}</p>
        </header>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard 
            icon={Users} 
            title="Usuarios Activos" 
            value={kpis.activeUsers} 
            description={`de ${kpis.totalUsers} totales`} 
          />
          <KpiCard 
            icon={Briefcase} 
            title="Total Cuentas" 
            value={kpis.totalAccounts} 
            description={`${kpis.accountsByStage.ACTIVA} activas`} 
          />
          <KpiCard 
            icon={Package} 
            title="Total Pedidos" 
            value={kpis.totalOrders} 
          />
          <KpiCard 
            icon={TrendingUp} 
            title="Cajas Vendidas" 
            value={kpis.totalCajas} 
            description="Total acumulado" 
          />
        </div>
        
        {/* Sección Operaciones */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Operaciones</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DepartmentKpiSection {...kpis.production} />
            <DepartmentKpiSection {...kpis.quality} />
            <DepartmentKpiSection {...kpis.logistics} />
          </div>
        </div>

        {/* Sección Comercial y Financiero */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Comercial & Financiero</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DepartmentKpiSection {...kpis.sales} />
            <DepartmentKpiSection {...kpis.marketing} />
            <DepartmentKpiSection {...kpis.finance} />
          </div>
        </div>
        
        {/* Panel de Tareas por Departamento */}
        <div className="sb-card">
          <div className="sb-card__header">
            <ClipboardList className="sb-icon" />
            <h2 className="sb-card__title">Tareas Pendientes por Departamento</h2>
          </div>
          <div className="sb-card__content">
            <DepartmentTasksPanel />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
