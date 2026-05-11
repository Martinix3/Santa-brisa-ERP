"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useData } from "@/lib/dataprovider";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Download,
  TrendingUp,
  Target,
  MousePointer,
  DollarSign,
  ExternalLink,
  Circle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { OnlineCampaign } from "@/domain/ssot";

export default function AdsPage() {
  const { data } = useData();
  const campaigns = data?.onlineCampaigns || [];
  
  const [platform, setPlatform] = useState<string>("all");

  // Filtrar campañas
  const filteredCampaigns = useMemo(() => {
    if (platform === "all") return campaigns;
    return campaigns.filter(c => c.channel?.toLowerCase() === platform.toLowerCase());
  }, [campaigns, platform]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const totalSpend = activeCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalConversions = activeCampaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0);
    const avgCTR = activeCampaigns.length > 0
      ? activeCampaigns.reduce((sum, c) => sum + (c.metrics?.ctr || 0), 0) / activeCampaigns.length
      : 0;
    const avgROAS = activeCampaigns.length > 0
      ? activeCampaigns.reduce((sum, c) => sum + (c.metrics?.roas || 0), 0) / activeCampaigns.length
      : 0;

    return { totalSpend, totalConversions, avgCTR, avgROAS };
  }, [campaigns]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDateRange = (start: string, end?: string) => {
    const startDate = new Date(start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    if (!end) return startDate;
    const endDate = new Date(end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `${startDate} - ${endDate}`;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'sb-status--active';
      case 'closed': return 'sb-status--inactive';
      case 'cancelled': return 'sb-status--error';
      default: return 'sb-status--inactive';
    }
  };

  return (
    <div className="sb-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="sb-page__title">📊 Campañas Ads</h1>
        <div className="flex gap-2">
          <button className="sb-btn sb-btn--secondary">
            <Download size={18} />
            Importar Meta
          </button>
          <button className="sb-btn sb-btn--primary">
            <Plus size={18} />
            Nueva Campaña
          </button>
        </div>
      </div>
      
      {/* Gráfico Gasto vs Conversión */}
      <div className="sb-card mb-6">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Rendimiento de Campañas (Últimos 30 días)</h3>
          <div className="flex gap-2">
            <button className="sb-pill sb-pill--primary">
              <Circle size={8} className="fill-current" />
              <span className="ml-1">Gasto</span>
            </button>
            <button className="sb-pill sb-pill--success">
              <Circle size={8} className="fill-current" />
              <span className="ml-1">Conversiones</span>
            </button>
          </div>
        </div>
        <div className="sb-card__content">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={campaigns.slice(0, 10).map(c => ({
              name: c.title.slice(0, 15),
              gasto: c.spend || 0,
              conversiones: c.metrics?.conversions || 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="gasto" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Gasto (€)"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="conversiones" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                name="Conversiones"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPIs de campañas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="sb-metric">
          <TrendingUp className="text-primary" size={24} />
          <div>
            <div className="sb-metric__label">Inversión Total</div>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalSpend)}</div>
            <div className="text-xs text-muted-foreground">Este mes</div>
          </div>
        </div>
        
        <div className="sb-metric">
          <Target className="text-success" size={24} />
          <div>
            <div className="sb-metric__label">Conversiones</div>
            <div className="text-2xl font-bold">{kpis.totalConversions}</div>
            <div className="text-xs text-success">Activas</div>
          </div>
        </div>
        
        <div className="sb-metric">
          <MousePointer className="text-blue-500" size={24} />
          <div>
            <div className="sb-metric__label">CTR Promedio</div>
            <div className="text-2xl font-bold">{kpis.avgCTR.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground">Todas las campañas</div>
          </div>
        </div>
        
        <div className="sb-metric">
          <DollarSign className="text-amber-500" size={24} />
          <div>
            <div className="sb-metric__label">ROAS</div>
            <div className="text-2xl font-bold">{kpis.avgROAS.toFixed(1)}x</div>
            <div className="text-xs text-muted-foreground">Promedio</div>
          </div>
        </div>
      </div>
      
      {/* Filtros y Tabla */}
      <div className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Todas las Campañas</h3>
          <div className="flex gap-2">
            <button 
              className={`sb-pill ${platform === 'all' ? 'sb-pill--primary' : ''}`} 
              onClick={() => setPlatform('all')}
            >
              Todas
            </button>
            <button 
              className={`sb-pill ${platform === 'meta' ? 'sb-pill--primary' : ''}`} 
              onClick={() => setPlatform('meta')}
            >
              Meta
            </button>
            <button 
              className={`sb-pill ${platform === 'google' ? 'sb-pill--primary' : ''}`} 
              onClick={() => setPlatform('google')}
            >
              Google
            </button>
            <button 
              className={`sb-pill ${platform === 'tiktok' ? 'sb-pill--primary' : ''}`} 
              onClick={() => setPlatform('tiktok')}
            >
              TikTok
            </button>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Canal</th>
                <th>Presupuesto</th>
                <th>Periodo</th>
                <th>Impresiones</th>
                <th>CTR</th>
                <th>ROAS</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="sb-empty py-8">
                      <TrendingUp size={48} className="sb-empty__icon" />
                      <p className="sb-empty__title">Sin campañas</p>
                      <p className="sb-empty__description">
                        {platform !== 'all' 
                          ? `No hay campañas en ${platform}` 
                          : 'Crea tu primera campaña'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(campaign => (
                  <tr key={campaign.id} className="cursor-pointer hover:bg-secondary/50">
                    <td className="font-medium">{campaign.title}</td>
                    <td>
                      <span className="sb-badge">{campaign.channel}</span>
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(campaign.budget || 0)}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {formatDateRange(campaign.startAt, campaign.endAt)}
                    </td>
                    <td>{(campaign.metrics?.impressions || 0).toLocaleString('es-ES')}</td>
                    <td className="font-medium">{campaign.metrics?.ctr || 0}%</td>
                    <td className={`font-semibold ${(campaign.metrics?.roas || 0) >= 3 ? 'text-success' : ''}`}>
                      {campaign.metrics?.roas || 0}x
                    </td>
                    <td>
                      <span className={`sb-status ${getStatusClass(campaign.status)}`}>
                        {campaign.status === 'active' ? 'Activa' : 
                         campaign.status === 'planned' ? 'Planificada' : 
                         campaign.status === 'closed' ? 'Cerrada' : 'Cancelada'}
                      </span>
                    </td>
                    <td>
                      {campaign.tracking?.landingUrl && (
                        <button 
                          className="sb-btn sb-btn--sm sb-btn--ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(campaign.tracking?.landingUrl || '', '_blank');
                          }}
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
