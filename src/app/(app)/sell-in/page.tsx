"use client";
import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META, SB_COLORS } from '@/domain/ssot.v7';
import { PageShell } from '@/components/shared/PageShell';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TimeRangeFilter } from '@/components/sales/TimeRangeFilter';
import { TasksPanel } from '@/components/sales/TasksPanel';
import { MixComercialDonut } from '@/components/sales/MixComercialDonut';
import { EvolucionVentasChart } from '@/components/sales/EvolucionVentasChart';
import { SBButton } from '@/components/ui/ui-primitives';
import { DollarSign, ShoppingCart, Store, TrendingUp, RefreshCw } from 'lucide-react';
import { TimeRange, filterByTimeRange } from '@/lib/time-range-helpers';
import { getCajasSellOut } from '@/lib/sales-helpers';
import { getDistributors } from '@/lib/distributor-helpers';

type CanalFilter = 'TODOS' | 'ONLINE' | 'DISTRIBUIDOR' | 'PRIVADA' | 'OTROS';

export default function SellInPage() {
  const { data, currentUser } = useData();
  const { config } = useSystemConfig();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [canalFilter, setCanalFilter] = useState<CanalFilter>('TODOS');
  const [distributorFilter, setDistributorFilter] = useState<string>('TODOS');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Obtener colores desde SSOT (config o fallback a constantes de SSOT)
  const ventasTheme = config?.theme.departments.VENTAS || DEPT_META.VENTAS;
  const infoColor = config?.theme.state.info || SB_COLORS.state.info;
  const successColor = config?.theme.state.success || SB_COLORS.state.success;
  const warningColor = config?.theme.state.warning || SB_COLORS.state.warning;

  // Función de filtro por periodo
  const periodFilter = useMemo(() => {
    return (date: string) => filterByTimeRange(date, timeRange);
  }, [timeRange]);

  // KPIs Principales
  const kpis = useMemo(() => {
    if (!data) return null;

    // Pedidos directos (DIRECT)
    const ordersDirectos = (data.ordersSellOut || []).filter(o => o.flow === 'DIRECT');
    const periodOrders = ordersDirectos.filter(o => periodFilter(o.createdAt));

    // Importe total facturado
    const importeTotal = periodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Ventas online (Shopify)
    const ventasOnline = periodOrders
      .filter(o => o.source === 'SHOPIFY')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Ventas a distribuidores (reposición)
    const ventasDistribuidores = periodOrders
      .filter(o => {
        const cuenta = data.accounts?.find(a => a.id === o.accountId);
        return cuenta?.segment === 'DISTRIBUIDOR';
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Ventas privadas
    const ventasPrivadas = periodOrders
      .filter(o => {
        const cuenta = data.accounts?.find(a => a.id === o.accountId);
        return cuenta?.segment === 'PRIVADA';
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      importeTotal,
      ventasOnline,
      ventasDistribuidores,
      ventasPrivadas,
      numPedidos: periodOrders.length,
      ticketPromedio: periodOrders.length > 0 ? importeTotal / periodOrders.length : 0,
    };
  }, [data, periodFilter]);

  // Distribuidores disponibles
  const distribuidores = useMemo(() => {
    if (!data) return [];
    return getDistributors(data);
  }, [data]);

  // Pedidos filtrados por canal y distribuidor
  const pedidosFiltrados = useMemo(() => {
    if (!data) return [];
    
    let orders = (data.ordersSellOut || [])
      .filter(o => o.flow === 'DIRECT' && periodFilter(o.createdAt));
    
    // Filtrar por canal
    if (canalFilter !== 'TODOS') {
      orders = orders.filter(o => {
        const cuenta = data.accounts?.find(a => a.id === o.accountId);
        
        if (canalFilter === 'ONLINE') {
          return o.source === 'SHOPIFY';
        } else if (canalFilter === 'DISTRIBUIDOR') {
          return cuenta?.segment === 'DISTRIBUIDOR';
        } else if (canalFilter === 'PRIVADA') {
          return cuenta?.segment === 'PRIVADA';
        } else if (canalFilter === 'OTROS') {
          return o.source !== 'SHOPIFY' && cuenta?.segment !== 'DISTRIBUIDOR' && cuenta?.segment !== 'PRIVADA';
        }
        return true;
      });
    }
    
    // Si hay filtro de distribuidor
    if (canalFilter === 'DISTRIBUIDOR' && distributorFilter !== 'TODOS') {
      orders = orders.filter(o => {
        const cuenta = data.accounts?.find(a => a.id === o.accountId);
        return cuenta?.distributorPartyId === distributorFilter;
      });
    }
    
    return orders;
  }, [data, periodFilter, canalFilter, distributorFilter]);

  // Mix Comercial (para gráfico donut)
  const mixComercialData = useMemo(() => {
    if (!data) return [];

    const byCanal: Record<string, number> = {};
    
    pedidosFiltrados.forEach(order => {
      const cuenta = data.accounts?.find(a => a.id === order.accountId);
      
      // Separar ONLINE como canal independiente
      if (order.source === 'SHOPIFY') {
        byCanal['ONLINE'] = (byCanal['ONLINE'] || 0) + (order.totalAmount || 0);
      } else if (cuenta?.segment === 'DISTRIBUIDOR') {
        byCanal['DISTRIBUIDOR'] = (byCanal['DISTRIBUIDOR'] || 0) + (order.totalAmount || 0);
      } else if (cuenta?.segment === 'PRIVADA') {
        byCanal['PRIVADA'] = (byCanal['PRIVADA'] || 0) + (order.totalAmount || 0);
      } else if (cuenta?.segment === 'HORECA') {
        byCanal['HORECA'] = (byCanal['HORECA'] || 0) + (order.totalAmount || 0);
      } else if (cuenta?.segment === 'RETAIL') {
        byCanal['RETAIL'] = (byCanal['RETAIL'] || 0) + (order.totalAmount || 0);
      } else {
        byCanal['OTRO'] = (byCanal['OTRO'] || 0) + (order.totalAmount || 0);
      }
    });

    // Usar paleta derivada del tema de VENTAS
    const baseColor = ventasTheme.color;
    const grayColor = config?.theme.accent?.gray || SB_COLORS.brand.neutral900;
    const colors: Record<string, string> = {
      'ONLINE': warningColor,           // Warning para online
      'DISTRIBUIDOR': infoColor,        // Info para distribuidores
      'HORECA': baseColor,              // Color principal del dept
      'RETAIL': successColor,           // Success para retail
      'PRIVADA': grayColor,             // Desde SSOT
      'OTRO': grayColor                 // Desde SSOT
    };

    return Object.entries(byCanal)
      .map(([name, value]) => ({ 
        name, 
        value, 
        color: colors[name] || grayColor
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, pedidosFiltrados]);

  // Evolución de ventas (agrupado por día/semana/mes según timeRange)
  const evolucionData = useMemo(() => {
    if (!data || pedidosFiltrados.length === 0) return [];

    const grouped: Record<string, number> = {};

    pedidosFiltrados.forEach(order => {
      const date = new Date(order.createdAt);
      let key: string;

      if (timeRange === 'week') {
        // Por día
        key = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      } else if (timeRange === 'month') {
        // Por semana del mes
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `S${weekNum}`;
      } else {
        // Por mes
        key = date.toLocaleDateString('es-ES', { month: 'short' });
      }

      grouped[key] = (grouped[key] || 0) + (order.totalAmount || 0);
    });

    return Object.entries(grouped)
      .map(([fecha, importe]) => ({ fecha, importe }))
      .slice(-10); // Últimos 10 periodos
  }, [pedidosFiltrados, timeRange]);

  // Ranking Mejores Clientes
  const mejoresClientes = useMemo(() => {
    if (!data) return [];

    const ordersDirectos = (data.ordersSellOut || [])
      .filter(o => o.flow === 'DIRECT' && periodFilter(o.createdAt));

    const byAccount: Record<string, { nombre: string; importe: number; pedidos: number }> = {};

    ordersDirectos.forEach(order => {
      const cuenta = data.accounts?.find(a => a.id === order.accountId);
      if (!cuenta) return;

      if (!byAccount[order.accountId]) {
        byAccount[order.accountId] = {
          nombre: cuenta.name,
          importe: 0,
          pedidos: 0,
        };
      }

      byAccount[order.accountId].importe += order.totalAmount || 0;
      byAccount[order.accountId].pedidos += 1;
    });

    return Object.values(byAccount)
      .sort((a, b) => b.importe - a.importe)
      .slice(0, 10); // Top 10
  }, [data, periodFilter]);

  if (!data || !currentUser) {
    return (
      <PageShell title="Dashboard Sell-In" module="sales">
        <div>Cargando...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard Sell-In" module="sales">
      <div className="space-y-6">
        {/* Header Sticky con Filtros */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            <div className="flex items-center gap-3">
              <SBButton
                variant="secondary"
                onClick={async () => {
                  setSyncing(true);
                  setSyncMessage(null);
                  try {
                    const res = await fetch('/api/integrations/holded/sync-orders', {
                      method: 'POST',
                    });
                    const data = await res.json();
                    if (data.ok) {
                      const stats = data.stats || {};
                      const total = stats.total || 0;
                      const created = stats.created || 0;
                      const skipped = stats.skipped || 0;
                      
                      if (created > 0) {
                        setSyncMessage(`✅ ${created} pedido${created > 1 ? 's' : ''} importado${created > 1 ? 's' : ''} de ${total} presupuestos en Holded`);
                        // Solo recargar si se importaron pedidos
                        setTimeout(() => window.location.reload(), 3000);
                      } else if (total === 0) {
                        setSyncMessage(`ℹ️ No hay presupuestos en Holded para sincronizar`);
                      } else {
                        setSyncMessage(`ℹ️ ${total} presupuesto${total > 1 ? 's' : ''} encontrado${total > 1 ? 's' : ''}, ${skipped} ya estaba${skipped > 1 ? 'n' : ''} importado${skipped > 1 ? 's' : ''}`);
                      }
                    } else {
                      setSyncMessage(`❌ Error: ${data.error || 'Error desconocido'}`);
                    }
                  } catch (error: any) {
                    setSyncMessage(`❌ Error de conexión: ${error.message}`);
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Holded'}
              </SBButton>
              <p className="text-sm text-muted-foreground">
                Ventas directas - Facturación
              </p>
            </div>
          </div>
          {syncMessage && (
            <div className="mt-2 text-sm font-medium">
              {syncMessage}
            </div>
          )}
        </div>

        {/* KPIs Principales */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Importe Facturado"
              value={`${Math.round(kpis.importeTotal)}€`}
              icon={DollarSign}
              accentColor={ventasTheme.color}
            />
            <KpiCard
              title="Ventas Online"
              value={`${Math.round(kpis.ventasOnline)}€`}
              icon={ShoppingCart}
              accentColor={warningColor}
            />
            <KpiCard
              title="Ventas a Distribuidores"
              value={`${Math.round(kpis.ventasDistribuidores)}€`}
              icon={Store}
              accentColor={infoColor}
            />
            <KpiCard
              title="Ticket Promedio"
              value={`${Math.round(kpis.ticketPromedio)}€`}
              icon={TrendingUp}
              accentColor={successColor}
            />
          </div>
        )}

        {/* Filtros por Canal y Distribuidor */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Filtros de Gráficos</h3>
          <div className="flex flex-wrap gap-4">
            {/* Filtro Canal */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Canal</label>
              <select
                value={canalFilter}
                onChange={(e) => {
                  setCanalFilter(e.target.value as CanalFilter);
                  setDistributorFilter('TODOS');
                }}
                className="w-full p-2 border rounded-lg bg-background"
              >
                <option value="TODOS">Todos los canales</option>
                <option value="ONLINE">Online (Shopify)</option>
                <option value="DISTRIBUIDOR">Distribuidores</option>
                <option value="PRIVADA">Ventas Privadas</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>

            {/* Filtro Distribuidor (solo si canal=DISTRIBUIDOR) */}
            {canalFilter === 'DISTRIBUIDOR' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-2">Distribuidor</label>
                <select
                  value={distributorFilter}
                  onChange={(e) => setDistributorFilter(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background"
                >
                  <option value="TODOS">Todos los distribuidores</option>
                  {distribuidores.map(dist => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mix Comercial Donut */}
          <MixComercialDonut 
            data={mixComercialData} 
            title="Mix Comercial por Segmento"
          />
          
          {/* Evolución Ventas */}
          <EvolucionVentasChart 
            data={evolucionData}
            title="Evolución de Ventas (€)"
          />
        </div>

        {/* Ranking Mejores Clientes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Top 10 Mejores Clientes</h2>
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3 font-semibold">Posición</th>
                  <th className="text-left p-3 font-semibold">Cliente</th>
                  <th className="text-center p-3 font-semibold">Pedidos</th>
                  <th className="text-right p-3 font-semibold">Importe Total</th>
                  <th className="text-right p-3 font-semibold">Ticket Medio</th>
                </tr>
              </thead>
              <tbody>
                {mejoresClientes.map((cliente, idx) => {
                  const ticketMedio = cliente.importe / cliente.pedidos;
                  return (
                    <tr 
                      key={idx}
                      className={`border-t hover:bg-secondary/50`}
                      style={{
                        backgroundColor: idx === 0 ? `${warningColor}10` : undefined
                      }}
                    >
                      <td className="p-3">
                        {idx === 0 && <span className="text-lg font-bold" style={{ color: warningColor }}>#1</span>}
                        {idx === 1 && <span className="text-lg font-bold text-gray-400">#2</span>}
                        {idx === 2 && <span className="text-lg font-bold" style={{ color: successColor }}>#3</span>}
                        {idx > 2 && <span className="text-muted-foreground">#{idx + 1}</span>}
                      </td>
                      <td className="p-3 font-medium">{cliente.nombre}</td>
                      <td className="text-center p-3">{cliente.pedidos}</td>
                      <td className="text-right p-3 font-bold text-lg">
                        {Math.round(cliente.importe)}€
                      </td>
                      <td className="text-right p-3 text-muted-foreground">
                        {Math.round(ticketMedio)}€
                      </td>
                    </tr>
                  );
                })}
                {mejoresClientes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay clientes con ventas en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div 
          className="rounded-lg p-4 text-sm border"
          style={{ 
            backgroundColor: `${infoColor}10`,
            borderColor: `${infoColor}33`
          }}
        >
          <p className="font-semibold mb-2" style={{ color: infoColor }}>
            Sell-In - Ventas Directas
          </p>
          <p className="text-muted-foreground">
            Facturación directa de Santa Brisa. Incluye ventas online (Shopify), 
            ventas a distribuidores (reposición) y ventas privadas. 
            Los datos se sincronizan automáticamente desde el sistema de pedidos.
          </p>
        </div>

        {/* Panel de Tareas */}
        <TasksPanel departamento="VENTAS" timeRange={timeRange} />
      </div>
    </PageShell>
  );
}
