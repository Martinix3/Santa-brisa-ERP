"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, Target, Heart } from "lucide-react";
import type { AccountKPIs as AccountKPIsType } from "@/server/actions/accounts";

interface AccountKPIsProps {
  data: AccountKPIsType;
}

export function AccountKPIs({ data }: AccountKPIsProps) {
  const { revenue, engagement, pipeline, health, purchase } = data;

  // Trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  // Health color
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'at_risk': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Revenue YTD */}
      <KpiCard
        label="REVENUE YTD"
        value={`€${Math.round(revenue.ytd).toLocaleString()}`}
        variant="dark"
        icon={<DollarSign size={20} />}
        trend={revenue.trend === 'stable' ? 'neutral' : revenue.trend}
      />

      {/* Engagement Score */}
      <KpiCard
        label="ENGAGEMENT"
        value={`${engagement.score}/100`}
        variant="light"
        icon={<Users size={20} />}
        trend={engagement.score > 60 ? 'up' : engagement.score < 40 ? 'down' : 'neutral'}
      />

      {/* Pipeline */}
      <KpiCard
        label="PIPELINE"
        value={pipeline.value > 0 ? `€${pipeline.value.toLocaleString()}` : 'N/A'}
        variant="light"
        icon={<Target size={20} />}
      />

      {/* Health Status */}
      <KpiCard
        label="HEALTH"
        value={health.status.toUpperCase()}
        variant="subtle"
        icon={<Heart size={20} className={getHealthColor(health.status)} />}
      />
      </div>

      {/* Purchase KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="COMPRA CADA"
          value={purchase?.avgDaysBetweenOrders > 0 ? `${purchase.avgDaysBetweenOrders} días` : 'N/A'}
          variant="light"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard
          label="PEDIDOS 90D"
          value={`${purchase?.last90d ?? 0}`}
          variant="light"
          icon={<Target size={20} />}
        />
        <KpiCard
          label="TICKET MEDIO"
          value={`€${Math.round(purchase?.avgTicket || 0).toLocaleString()}`}
          variant="light"
          icon={<DollarSign size={20} />}
        />
        <KpiCard
          label="ÚLTIMO PEDIDO"
          value={purchase?.lastOrderAt ? new Date(purchase.lastOrderAt).toLocaleDateString('es-ES') : 'N/A'}
          variant="subtle"
          icon={<Minus size={20} />}
        />
      </div>
    </div>
  );
}
