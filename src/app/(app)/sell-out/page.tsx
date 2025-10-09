"use client";
import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META, SB_COLORS } from '@/domain/ssot.v7';
import { PageShell } from '@/components/shared/PageShell';
import { Box, Store, Repeat, Plus, Target, AlertTriangle, Crosshair } from 'lucide-react';
import { TimeRange, filterByTimeRange, TIME_RANGE_LABELS } from '@/lib/time-range-helpers';
import { getCajasSellOut } from '@/lib/sales-helpers';
import { EvolucionVentasChart } from '@/components/sales/EvolucionVentasChart';

export default function SellOutPage() {
  const { data } = useData();
  const { config } = useSystemConfig();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  
  // Obtener colores desde SSOT (config o fallback a constantes de SSOT)
  const ventasTheme = config?.theme.departments.VENTAS || DEPT_META.VENTAS;
  const successColor = config?.theme.state.success || SB_COLORS.state.success;
  const warningColor = config?.theme.state.warning || SB_COLORS.state.warning;
  const dangerColor = config?.theme.state.danger || SB_COLORS.state.danger;

  // Función de filtro por periodo
  const periodFilter = useMemo(() => {
    return (date: string) => filterByTimeRange(date, timeRange);
  }, [timeRange]);

  // KPIs Principales
  const kpis = useMemo(() => {
    if (!data) return null;

    const orders = (data.ordersSellOut || []).filter(o => o.flow === 'PLACEMENT');
    const periodOrders = orders.filter(o => periodFilter(o.createdAt));
    const ytdOrders = orders.filter(o => {
      const year = new Date(o.createdAt).getFullYear();
      return year === new Date().getFullYear();
    });

    const cajasPeriodo = getCajasSellOut(periodOrders);
    const cajasYTD = getCajasSellOut(ytdOrders);

    // Activaciones (cuentas con primer pedido este mes)
    const cuentasConPedidos = new Map<string, string>();
    orders.forEach(o => {
      const accountId = o.accountId;
      if (!cuentasConPedidos.has(accountId)) {
        cuentasConPedidos.set(accountId, o.createdAt);
      } else {
        const existing = cuentasConPedidos.get(accountId)!;
        if (new Date(o.createdAt) < new Date(existing)) {
          cuentasConPedidos.set(accountId, o.createdAt);
        }
      }
    });
    const activaciones = Array.from(cuentasConPedidos.values()).filter(date => periodFilter(date)).length;

    // Nuevas cuentas (cuentas creadas en el periodo)
    const nuevasCuentas = (data.accounts || []).filter(a => periodFilter(a.createdAt)).length;

    // % Recompra (cuentas con más de 1 pedido)
    const cuentasConRecompra = Array.from(cuentasConPedidos.keys()).filter(accountId => {
      const pedidosCuenta = orders.filter(o => o.accountId === accountId);
      return pedidosCuenta.length > 1;
    }).length;
    const recompra = cuentasConPedidos.size > 0 ? (cuentasConRecompra / cuentasConPedidos.size) * 100 : 0;

    // Objetivo anual
    const comerciales = (data.users || []).filter(u => u.role === 'comercial');
    const objetivoAnual = comerciales.reduce((sum, u) => sum + (u.kpiBaseline?.unitsSold || 0), 0);

    return {
      cajasPeriodo,
      activaciones,
      nuevasCuentas,
      recompra,
      cajasYTD,
      objetivoAnual,
      porcentaje: objetivoAnual > 0 ? (cajasYTD / objetivoAnual) * 100 : 0
    };
  }, [data, periodFilter]);

  // Seguimiento de Distribuidores
  const distribuidoresSeguimiento = useMemo(() => {
    if (!data) return [];

    // LÓGICA CORRECTA: Buscar cuentas que tienen distributorPartyId (clientes finales)
    const cuentasCliente = (data.accounts || []).filter(a => a.distributorPartyId);
    
    // Agrupar por distributorPartyId (que apunta a otra CUENTA)
    const distribuidoresMap = new Map<string, typeof cuentasCliente>();
    cuentasCliente.forEach(cuenta => {
      const distribuidorId = cuenta.distributorPartyId!;
      const existing = distribuidoresMap.get(distribuidorId) || [];
      distribuidoresMap.set(distribuidorId, [...existing, cuenta]);
    });

    const orders = (data.ordersSellOut || []).filter(o => o.flow === 'PLACEMENT');

    return Array.from(distribuidoresMap.entries())
      .map(([distribuidorId, cuentasCliente]) => {
        // CLAVE: Buscar la CUENTA distribuidora (no el Party)
        const cuentaDistribuidora = data.accounts?.find(a => a.id === distribuidorId);
        
        // FILTRO: Verificar que la cuenta sea realmente un distribuidor
        if (!cuentaDistribuidora || (cuentaDistribuidora.segment as any) !== 'DISTRIBUIDOR') {
          return null;
        }
        
        // IDs de todas las cuentas cliente de este distribuidor
        const accountIds = cuentasCliente.map(c => c.id);
        
        // Owners únicos de las cuentas cliente
        const owners = [...new Set(cuentasCliente.map(c => c.ownerId))]
          .map(id => data.users?.find(u => u.id === id))
          .filter(Boolean)
          .map(u => u!.name);

        // Sumar pedidos de TODAS las cuentas cliente de este distribuidor
        const pedidos = orders.filter(o => accountIds.includes(o.accountId));
        const pedidosPeriodo = pedidos.filter(o => periodFilter(o.createdAt));
        const pedidosYTD = pedidos.filter(o => {
          const year = new Date(o.createdAt).getFullYear();
          return year === new Date().getFullYear();
        });

        const cajasMes = getCajasSellOut(pedidosPeriodo);
        const cajasAno = getCajasSellOut(pedidosYTD);

        // Objetivo: suma de objetivos de todos los owners / 12
        const objetivoMensual = owners.reduce((sum, ownerName) => {
          const owner = data.users?.find(u => u.name === ownerName);
          return sum + ((owner?.kpiBaseline?.unitsSold || 0) / 12);
        }, 0);

        return {
          id: distribuidorId,
          nombre: cuentaDistribuidora.name,
          owners: owners.join(', ') || 'Sin asignar',
          cajasMes,
          objetivo: objetivoMensual,
          cajasAno,
          prioridad: 1
        };
      })
      .filter((dist): dist is NonNullable<typeof dist> => dist !== null && dist.cajasAno > 0) // Solo distribuidores reales y con ventas
      .sort((a, b) => b.cajasAno - a.cajasAno);
  }, [data, periodFilter]);

  // Top Vendedores
  const topVendedores = useMemo(() => {
    if (!data) return [];

    const comerciales = (data.users || []).filter(u => u.role === 'comercial');
    const orders = (data.ordersSellOut || []).filter(o => o.flow === 'PLACEMENT' && periodFilter(o.createdAt));

    return comerciales.map(comercial => {
      const susPedidos = orders.filter(o => {
        const cuenta = data.accounts?.find(a => a.id === o.accountId);
        return cuenta?.ownerId === comercial.id;
      });

      return {
        id: comercial.id,
        nombre: comercial.name,
        cajas: getCajasSellOut(susPedidos)
      };
    }).sort((a, b) => b.cajas - a.cajas);
  }, [data, periodFilter]);

  // Alertas
  const alertas = useMemo(() => {
    if (!data) return [];

    const alerts: Array<{cuenta: string, tipo: string, mensaje: string}> = [];
    const accounts = (data.accounts || []).filter(a => a.distributorPartyId);
    const orders = data.ordersSellOut || [];

    accounts.forEach(account => {
      const pedidos = orders.filter(o => o.accountId === account.id && o.flow === 'PLACEMENT');
      
      if (pedidos.length > 0) {
        const ultimoPedido = pedidos.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        const diasSinPedido = Math.floor(
          (Date.now() - new Date(ultimoPedido.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Usar threshold desde SystemConfig (con fallback a 60 si no está cargado)
        const threshold = config?.businessRules.alerts.daysSinPedidoCritical ?? 60;
        
        if (diasSinPedido > threshold) {
          alerts.push({
            cuenta: account.name,
            tipo: 'sin-pedido',
            mensaje: `Sin pedido en ${diasSinPedido} días`
          });
        }
      }
    });

    return alerts.slice(0, 3);
  }, [data]);

  // Evolución de cajas por periodo
  const evolucionCajas = useMemo(() => {
    if (!data) return [];

    const orders = (data.ordersSellOut || [])
      .filter(o => o.flow === 'PLACEMENT' && periodFilter(o.createdAt));

    if (orders.length === 0) return [];

    const grouped: Record<string, number> = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key: string;

      if (timeRange === 'day') {
        // Por hora
        key = `${date.getHours()}:00`;
      } else if (timeRange === 'week') {
        // Por día
        key = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      } else if (timeRange === 'month') {
        // Por semana
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `S${weekNum}`;
      } else {
        // Por mes (YTD)
        key = date.toLocaleDateString('es-ES', { month: 'short' });
      }

      const cajas = getCajasSellOut([order]);
      grouped[key] = (grouped[key] || 0) + cajas;
    });

    return Object.entries(grouped)
      .map(([fecha, cajas]) => ({ fecha, importe: cajas }))
      .slice(-10); // Últimos 10 periodos
  }, [data, periodFilter, timeRange]);

  // Datos para gráfico de objetivo (adaptado según filtro)
  const objetivoData = useMemo(() => {
    if (!kpis) return { actual: 0, objetivo: 0, porcentaje: 0 };
    
    if (timeRange === 'ytd') {
      // YTD: usar cajas anuales vs objetivo anual
      return {
        actual: kpis.cajasYTD,
        objetivo: kpis.objetivoAnual,
        porcentaje: kpis.porcentaje
      };
    } else {
      // Otros: usar cajas del periodo vs objetivo proporcional
      const comerciales = (data?.users || []).filter(u => u.role === 'comercial');
      const objetivoAnual = comerciales.reduce((sum, u) => sum + (u.kpiBaseline?.unitsSold || 0), 0);
      
      let objetivoPeriodo = 0;
      if (timeRange === 'day') {
        objetivoPeriodo = objetivoAnual / 365;
      } else if (timeRange === 'week') {
        objetivoPeriodo = (objetivoAnual / 365) * 7;
      } else {
        objetivoPeriodo = objetivoAnual / 12;
      }
      
      const porcentaje = objetivoPeriodo > 0 ? (kpis.cajasPeriodo / objetivoPeriodo) * 100 : 0;
      
      return {
        actual: kpis.cajasPeriodo,
        objetivo: Math.round(objetivoPeriodo),
        porcentaje
      };
    }
  }, [kpis, timeRange, data]);

  if (!data) {
    return (
      <PageShell title="" module="sales">
        <div>Cargando...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="" module="sales">
      <div className="max-w-screen-xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Sell-Out</h1>
            <p className="text-slate-500 mt-1">
              {TIME_RANGE_LABELS[timeRange]}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            {/* View Toggles */}
            <div className="bg-white p-1 rounded-lg border border-slate-200">
              {(['day', 'week', 'month', 'ytd'] as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-slate-100 text-slate-800 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {TIME_RANGE_LABELS[range]}
                </button>
              ))}
            </div>
            <button 
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              style={{ 
                backgroundColor: ventasTheme.color,
                color: ventasTheme.textColor
              }}
            >
              <Plus className="w-4 h-4" />
              Registrar Venta
            </button>
          </div>
        </header>

        {/* KPIs Principales */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-600">Cajas Vendidas (Mes)</h3>
                <Box className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{kpis.cajasPeriodo}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-600">Activaciones POS (Mes)</h3>
                <Store className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{kpis.activaciones}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-600">Nuevas Cuentas (Mes)</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">{kpis.nuevasCuentas}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-600">% de Recompra</h3>
                <Repeat className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{Math.round(kpis.recompra)}%</p>
            </div>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabla de Seguimiento */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Seguimiento de Distribuidores</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="p-3">Distribuidor</th>
                      <th className="p-3">Owner(s)</th>
                      <th className="p-3">Cajas (Mes) / Objetivo</th>
                      <th className="p-3">Cajas (Año)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {distribuidoresSeguimiento.length > 0 ? (
                      distribuidoresSeguimiento.map(dist => (
                        <tr key={dist.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{dist.nombre}</td>
                          <td className="p-3 text-slate-600 text-xs">{dist.owners}</td>
                          <td className="p-3">
                            {dist.objetivo > 0 ? (
                              <div className="w-full bg-slate-200 rounded-full h-5">
                                <div
                                  className="h-5 rounded-full flex items-center justify-end pr-2"
                                  style={{ 
                                    width: `${Math.min((dist.cajasMes / dist.objetivo) * 100, 100)}%`,
                                    backgroundColor: successColor
                                  }}
                                >
                                  <span className="text-xs font-medium text-white">
                                    {dist.cajasMes}/{Math.round(dist.objetivo)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="font-medium text-slate-700">{dist.cajasMes}</span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-800">{dist.cajasAno}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          No hay distribuidores registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Objetivos y Alertas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Objetivos del Equipo */}
              <div 
                className="bg-white p-6 rounded-xl shadow-sm ring-2"
                style={{ 
                  borderColor: `${warningColor}33`,
                  '--tw-ring-color': `${warningColor}1a`
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6" style={{ color: warningColor }} />
                  <h2 className="text-xl font-bold text-slate-800">Objetivos del Equipo</h2>
                </div>
                {(() => {
                  const objetivosEquipo = (data.accounts || []).filter(a => (a as any).isTarget);
                  
                  return objetivosEquipo.length > 0 ? (
                    <ul className="space-y-3">
                      {objetivosEquipo.slice(0, 4).map(cuenta => {
                        const owner = data.users?.find(u => u.id === cuenta.ownerId);
                        const pedidos = (data.ordersSellOut || []).filter(o => o.accountId === cuenta.id);
                        const tienePedido = pedidos.length > 0;
                        
                        return (
                          <li key={cuenta.id} className="p-3 rounded-lg border" style={{ backgroundColor: `${warningColor}0d`, borderColor: `${warningColor}33` }}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Target className="w-3 h-3 flex-shrink-0" style={{ color: warningColor }} />
                                  <p className="font-semibold text-slate-800 text-sm">{cuenta.name}</p>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5">{owner?.name || 'Sin asignar'}</p>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                                tienePedido
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {tienePedido ? '✓ Con pedido' : '⏳ En progreso'}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No hay objetivos marcados.
                      <br />
                      <span className="text-xs">Marca cuentas como objetivo en el pipeline para verlas aquí.</span>
                    </p>
                  );
                })()}
              </div>

              {/* Necesitan Atención */}
              <div 
                className="bg-white p-6 rounded-xl shadow-sm ring-1"
                style={{ 
                  borderColor: `${dangerColor}33`,
                  '--tw-ring-color': `${dangerColor}1a`
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6" style={{ color: dangerColor }} />
                  <h2 className="text-xl font-bold text-slate-800">Necesitan Atención</h2>
                </div>
                <ul className="space-y-3">
                  {alertas.length > 0 ? (
                    alertas.map((alerta, i) => (
                      <li key={i} className="p-3 rounded-md bg-slate-50">
                        <p className="font-semibold text-slate-800">Cuenta {alerta.cuenta}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                          {alerta.mensaje}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="p-3 text-center text-slate-500">
                      Todo en orden ✓
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-8">
            {/* Progreso Objetivo */}
            {objetivoData && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  Progreso {timeRange === 'ytd' ? 'Anual' : 'del Periodo'}
                </h2>
                <div className="relative w-full max-w-xs mx-auto">
                  <svg viewBox="0 0 200 200" className="w-full">
                    {/* Fondo gris */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke={SB_COLORS.brand.neutral50}
                      strokeWidth="20"
                    />
                    {/* Progreso dinámico */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke={ventasTheme.color}
                      strokeWidth="20"
                      strokeDasharray={`${Math.min((objetivoData.porcentaje / 100) * 502.4, 502.4)} 502.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800">{Math.round(objetivoData.porcentaje)}%</span>
                    <span className="text-sm text-slate-500">{objetivoData.actual} / {objetivoData.objetivo}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Evolución de Cajas */}
            {evolucionCajas.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <EvolucionVentasChart 
                  data={evolucionCajas}
                  title="Evolución de Cajas"
                />
              </div>
            )}

            {/* Top Vendedores */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Top Vendedores ({TIME_RANGE_LABELS[timeRange]})</h2>
              <div className="space-y-5">
                {topVendedores.slice(0, 3).map((vendedor, i) => {
                  const maxCajas = topVendedores[0]?.cajas || 1;
                  const porcentaje = (vendedor.cajas / maxCajas) * 100;
                  const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-teal-500'];
                  
                  return (
                    <div key={vendedor.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-700">{vendedor.nombre}</span>
                        <span className={`text-sm font-bold ${i === 0 ? 'text-indigo-600' : i === 1 ? 'text-sky-600' : 'text-teal-600'}`}>
                          {vendedor.cajas} Cajas
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-6 p-1">
                        <div
                          className={`${colors[i]} h-full rounded-full flex items-center justify-end transition-all duration-1000`}
                          style={{ width: `${porcentaje}%` }}
                        >
                          <Target className="w-4 h-4 text-white mr-1" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
