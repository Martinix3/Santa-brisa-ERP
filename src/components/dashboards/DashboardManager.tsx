"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import Link from "next/link";
import {
  BrainCircuit,
  TrendingUp,
  Users,
  Factory,
  DollarSign,
  Package,
  Calendar,
  Megaphone,
  Truck,
  Server,
  ExternalLink,
  Wallet
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { AlertsCard } from "./shared/AlertsCard";
import { QualityWidget } from "./QualityWidget";
import { DashboardSkeleton } from "./DashboardSkeleton";

import { useState, useEffect, useMemo } from "react";
import { analyzeProduction } from '@/server/actions/ai/production.actions';
import { analyzeMarketing } from '@/server/actions/ai/marketing.actions';
import { getSalesConversionMetric, getSalesMarginMetric } from '@/server/actions/ai/sales.actions';
// ... imports

export default function DashboardManager() {
  const { data } = useData();

  // Santa Brain AI Metrics State
  const [aiMetrics, setAiMetrics] = useState({
    conversionRate: 0,
    productionOee: 0,
    marketingRoi: 0,
    financeMargin: 0
  });

  // Fetch AI Metrics on mount
  useEffect(() => {
    const fetchAiMetrics = async () => {
      try {
        const [conversion, margin, production, marketing] = await Promise.all([
          getSalesConversionMetric(),
          getSalesMarginMetric(),
          analyzeProduction(), // Overall production analysis
          analyzeMarketing({ channel: 'overall' }) // Overall marketing analysis
        ]);

        setAiMetrics({
          conversionRate: conversion.success ? conversion.rate : 0,
          financeMargin: margin.success ? margin.marginPct : 0,
          productionOee: production.success && production.analysis ? production.analysis.oee.oee : 0,
          marketingRoi: marketing.success && marketing.analysis ? marketing.analysis.metrics.roi : 0
        });
      } catch (err) {
        console.error('Error fetching Santa Brain metrics:', err);
      }
    };

    fetchAiMetrics();
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month

    // 1. Ventas del mes actual y anterior
    const currentMonthOrders = data.ordersSellOut?.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= currentMonthStart;
    }) || [];

    const prevMonthOrders = data.ordersSellOut?.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= prevMonthStart && orderDate <= prevMonthEnd;
    }) || [];

    const salesValue = currentMonthOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const prevSalesValue = prevMonthOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    // Calcular crecimiento
    let salesGrowth = 0;
    if (prevSalesValue > 0) {
      salesGrowth = ((salesValue - prevSalesValue) / prevSalesValue) * 100;
    } else if (salesValue > 0) {
      salesGrowth = 100; // Crecimiento infinito si antes era 0
    }

    // 2. Producción activa
    const activeProduction = data.productionOrders?.filter((po: any) =>
      po.status === 'IN_PROGRESS' || po.status === 'RELEASED'
    ).length || 0;

    // 3. Inventario
    const inventoryValue = data.onHand?.reduce((sum: number, oh: any) => {
      const ohKey = oh.sku || oh.itemId;
      const item = data.items?.find((i: any) => i.sku === ohKey || i.id === ohKey);
      return sum + (oh.qty * (item?.costUnit || 0));
    }, 0) || 0;

    const criticalStock = data.onHand?.filter((oh: any) => oh.qty < 50).length || 0;

    // 4. Finanzas
    const pendingPayment = data.ordersSellOut?.filter((o: any) =>
      o.status === 'shipped' || o.status === 'invoiced'
    ).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0) || 0;

    const collectedAmount = data.ordersSellOut?.filter((o: any) =>
      o.status === 'paid' || o.status === 'closed'
    ).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0) || 0;

    // Conteos
    const totalAccounts = data.accounts?.length || 0;
    const activeOrders = data.productionOrders?.filter((po: any) =>
      po.status === 'IN_PROGRESS' || po.status === 'RELEASED'
    ).length || 0;
    const pendingQC = data.lots?.filter((l: any) =>
      l.qcStatus === 'PENDING' || l.qcStatus === 'IN_PROGRESS'
    ).length || 0;

    const monthEvents = data.marketingEvents?.filter((e: any) =>
      new Date(e.startAt).getMonth() === currentMonth
    ).length || 0;

    const activeCampaigns = data.onlineCampaigns?.filter((c: any) =>
      c.status === 'active'
    ).length || 0;

    return {
      salesValue,
      salesGrowth: Number(salesGrowth.toFixed(1)),
      activeProduction,
      inventoryValue,
      criticalStock,
      pendingPayment,
      collectedAmount,
      totalAccounts,
      activeOrders,
      pendingQC,
      monthEvents,
      activeCampaigns,
      monthOrdersCount: currentMonthOrders.length
    };
  }, [data]);


  // ...

  if (!data || !metrics) {
    return <DashboardSkeleton />;
  }

  const salesTarget = 320000; // TODO: Traer de config

  const executiveKpis = {
    sales: { value: metrics.salesValue, growth: metrics.salesGrowth, target: salesTarget },
    production: { value: metrics.activeProduction, growth: 8.3 },
    inventory: { value: metrics.inventoryValue, critical: metrics.criticalStock },
    finance: { collected: metrics.salesValue, pending: metrics.pendingPayment }
  };

  const departmentSummary = [
    {
      dept: 'Ventas',
      href: '/ventas',
      icon: TrendingUp,
      color: 'text-primary',
      metrics: [
        { label: 'Facturación', value: `€${(metrics.salesValue / 1000).toFixed(1)}K`, status: 'success' },
        { label: 'Pipeline', value: `${metrics.totalAccounts} cuentas`, status: 'success' },
        { label: 'Conversión', value: `${aiMetrics.conversionRate}%`, status: 'success' }
      ]
    },
    {
      dept: 'Producción',
      href: '/production',
      icon: Factory,
      color: 'text-purple-500',
      metrics: [
        { label: 'Órdenes Activas', value: metrics.activeProduction.toString(), status: 'neutral' },
        { label: 'Pendientes QC', value: metrics.pendingQC.toString(), status: 'warning' },
        { label: 'OEE Global', value: `${aiMetrics.productionOee.toFixed(1)}%`, status: aiMetrics.productionOee > 70 ? 'success' : 'warning' }
      ]
    },
    {
      dept: 'Marketing',
      href: '/marketing',
      icon: Users,
      color: 'text-pink-500',
      metrics: [
        { label: 'Campañas', value: metrics.activeCampaigns.toString(), status: 'success' },
        { label: 'Eventos Mes', value: metrics.monthEvents.toString(), status: 'neutral' },
        { label: 'ROI Est.', value: `${aiMetrics.marketingRoi.toFixed(1)}x`, status: aiMetrics.marketingRoi > 2 ? 'success' : 'neutral' }
      ]
    },
    {
      dept: 'Finanzas',
      href: '/finance',
      icon: Wallet,
      color: 'text-emerald-500',
      metrics: [
        { label: 'Cobrado', value: `€${(metrics.collectedAmount / 1000).toFixed(1)}K`, status: 'success' },
        { label: 'Pendiente', value: `€${(metrics.pendingPayment / 1000).toFixed(1)}K`, status: 'warning' },
        { label: 'Margen', value: `${aiMetrics.financeMargin}%`, status: 'success' }
      ]
    }
  ];

  const santaBrainPriorities = [
    {
      id: '1',
      title: '🔴 Factura vencida Grupo Hostelero',
      description: '€3,200 · Vencida hace 15 días · Gestionar cobro urgente',
      priority: 'critical',
      dept: 'Finanzas'
    },
    {
      id: '2',
      title: '🟡 Stock crítico SB-LIME-01',
      description: 'Solo 12 unidades · Planificar reposición o producción',
      priority: 'high',
      dept: 'Operaciones'
    },
    {
      id: '3',
      title: '🔵 Aprobar pedido Cadena Hotelera',
      description: '€12,500 · Requiere aprobación gerencial · Margen 44%',
      priority: 'medium',
      dept: 'Ventas'
    }
  ];

  const criticalAlerts = [
    {
      id: '1',
      type: 'critical' as const,
      title: 'Factura vencida > 15 días',
      description: 'Grupo Hostelero Premium · €3,200',
      actionLabel: 'Gestionar cobro'
    },
    {
      id: '2',
      type: 'warning' as const,
      title: '3 SKUs en stock crítico',
      description: 'Requieren reposición inmediata',
      actionLabel: 'Ver inventario'
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Lote L-BASE-422 en HOLD',
      description: 'Parámetros fuera de rango · Revisar QC',
      actionLabel: 'Abrir QC'
    },
    {
      id: '4',
      type: 'info' as const,
      title: 'Pedido grande pendiente',
      description: 'Cadena Hotelera · €12,500 · Requiere aprobación',
      actionLabel: 'Revisar'
    }
  ];

  const upcomingEvents = [
    { id: '1', title: 'Feria HORECA Madrid', date: 'Próxima semana', type: 'FERIA' },
    { id: '2', title: 'Degustación Hotel Premium', date: 'Jueves 16:00', type: 'DEMO' },
    { id: '3', title: 'Reunión inversores', date: 'Viernes 10:00', type: 'MEETING' }
  ];

  // Santa Brain - Datos mensuales (Simulados para meses anteriores, Real para mes actual)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = [];

    // Generar últimos 4 meses
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('es-ES', { month: 'short' });
      const isCurrentMonth = i === 0;

      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        ventas: isCurrentMonth ? metrics.salesValue : 20000 + Math.random() * 10000, // Simulado para demo
        produccion: isCurrentMonth ? metrics.activeProduction : 15 + Math.floor(Math.random() * 10),
        marketing: isCurrentMonth ? metrics.monthEvents : 2 + Math.floor(Math.random() * 5)
      });
    }
    return months;
  }, [metrics]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard General</h2>
          <p className="text-muted-foreground">
            Visión unificada de operaciones, ventas y rendimiento financiero
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/admin/brain">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <BrainCircuit className="mr-2 h-4 w-4" />
              Santa Brain
            </button>
          </Link>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas Totales"
          value={`€${(executiveKpis.sales.value / 1000).toFixed(1)}K`}
          icon={<DollarSign size={20} />}
          trend={executiveKpis.sales.growth > 0 ? "up" : "down"}
          hint={`${executiveKpis.sales.growth}% vs mes anterior`}
        />
        <KpiCard
          label="Producción Activa"
          value={executiveKpis.production.value.toString()}
          icon={<Factory size={20} />}
          trend="up"
          hint="Eficiencia estable"
        />
        <KpiCard
          label="Valor Inventario"
          value={`€${(executiveKpis.inventory.value / 1000).toFixed(1)}K`}
          icon={<Package size={20} />}
          trend={executiveKpis.inventory.critical > 0 ? "down" : "neutral"}
          hint={`${executiveKpis.inventory.critical} items críticos`}
        />
        <KpiCard
          label="Pendiente Cobro"
          value={`€${(executiveKpis.finance.pending / 1000).toFixed(1)}K`}
          icon={<Wallet size={20} />}
          trend={executiveKpis.finance.pending > 50000 ? "down" : "neutral"}
          hint="Revisar vencimientos"
        />
      </div>

      {/* Department Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {departmentSummary.map((dept, i) => (
          <Link key={i} href={dept.href} className="block transition-transform hover:scale-[1.02]">
            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">{dept.dept}</h3>
                <dept.icon className={`h-4 w-4 ${dept.color}`} />
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4 mt-4">
                  {dept.metrics.map((m, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{m.label}</span>
                      <span className={`text-sm font-medium ${m.status === 'success' ? 'text-green-600' :
                        m.status === 'warning' ? 'text-yellow-600' :
                          'text-foreground'
                        }`}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts & Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ChartCard
          title="Tendencia Mensual"
          data={monthlyTrend}
          categories={["ventas", "produccion"]}
          colors={["#2563eb", "#9333ea"]}
          xAxisKey="month"
          className="col-span-4"
        />
        <div className="col-span-3 space-y-4">
          <QualityWidget
            lots={data.lots || []}
            qualityReleases={data.qualityReleases || []}
            qcTests={data.qcTests || []}
          />
          <AlertsCard alerts={criticalAlerts} />
        </div>
      </div>
    </div>
  );
}
