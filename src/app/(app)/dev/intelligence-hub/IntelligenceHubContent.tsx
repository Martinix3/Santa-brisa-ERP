'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


/**
 * Intelligence Hub Content Component
 * 
 * Dashboard principal del Intelligence Hub siguiendo el design system
 * @see UI_UX_STYLE_GUIDE.md
 */

import { useState } from 'react';
import { 
  Brain, 
  Zap, 
  Clock, 
  DollarSign,
  Mail,
  FileText,
  Mic,
  TrendingUp,
  Package,
  Factory,
  List,
  Warehouse,
  Megaphone,
  Award,
  Code,
  Palette,
  Activity,
  Sparkles,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboards/shared/KpiCard';
import type { IntelligenceHubStats } from '@/server/actions/intelligence-hub.actions';

interface Props {
  initialStats: IntelligenceHubStats;
}

type CategoryFilter = 'all' | 'intelligence' | 'analysis' | 'automation';

export function IntelligenceHubContent({ initialStats }: Props) {
  const [activeTab, setActiveTab] = useState<CategoryFilter>('all');
  const [stats] = useState(initialStats);

  // Filtrar analyzers por categoría
  const filteredAnalyzers = stats.byAnalyzer.filter((analyzer) => {
    if (activeTab === 'all') return true;
    return analyzer.category === activeTab;
  });

  // Iconos para cada analyzer
  const analyzerIcons: Record<string, React.ReactNode> = {
    'email-analyzer': <Mail size={16} />,
    'document-analyzer': <FileText size={16} />,
    'quicklog-analyzer': <Mic size={16} />,
    'sales-analyzer': <TrendingUp size={16} />,
    'stock-analyzer': <Package size={16} />,
    'production-analyzer': <Factory size={16} />,
    'bom-analyzer': <List size={16} />,
    'warehouse-analyzer': <Warehouse size={16} />,
    'marketing-analyzer': <Megaphone size={16} />,
    'quality-analyzer': <Award size={16} />,
    'code-analyzer': <Code size={16} />,
    'uiux-analyzer': <Palette size={16} />,
  };

  // Contar por categoría para badges
  const categoryCounts = {
    all: stats.byAnalyzer.length,
    intelligence: stats.byAnalyzer.filter((a) => a.category === 'intelligence').length,
    analysis: stats.byAnalyzer.filter((a) => a.category === 'analysis').length,
    automation: stats.byAnalyzer.filter((a) => a.category === 'automation').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* HEADER */}
      <div className="sb-header-glass p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="text-primary" size={24} />
              <h1 className="text-2xl font-bold">Intelligence Hub</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Dashboard de Gemini AI Analyzers · Monitoreo y métricas en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="sb-kpi-badge px-3 py-1.5 bg-success/10 text-success">
              <Sparkles size={14} className="inline mr-1" />
              {stats.byAnalyzer.length} Analyzers Activos
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Calls"
          value={stats.overview.totalCalls.toLocaleString()}
          variant="light"
          icon={<Zap size={18} />}
          hint="últimos 7 días"
        />
        <KpiCard
          label="Total Cost"
          value={`$${stats.overview.totalCost.toFixed(4)}`}
          variant="light"
          icon={<DollarSign size={18} />}
          hint="últimos 7 días"
        />
        <KpiCard
          label="Avg Latency"
          value={`${Math.round(stats.overview.avgLatency)}ms`}
          variant="light"
          icon={<Clock size={18} />}
          hint="por llamada"
        />
        <KpiCard
          label="Total Tokens"
          value={(stats.overview.totalTokens / 1000).toFixed(1) + 'K'}
          variant="light"
          icon={<Activity size={18} />}
          hint="procesados"
        />
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80'
          }`}
        >
          <Brain size={16} />
          Todos
          <span className="sb-kpi-badge px-2 py-0.5 text-xs">{categoryCounts.all}</span>
        </button>

        <button
          onClick={() => setActiveTab('intelligence')}
          className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'intelligence'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80'
          }`}
        >
          <Mail size={16} />
          Intelligence
          <span className="sb-kpi-badge px-2 py-0.5 text-xs">{categoryCounts.intelligence}</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'analysis'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80'
          }`}
        >
          <TrendingUp size={16} />
          Analysis
          <span className="sb-kpi-badge px-2 py-0.5 text-xs">{categoryCounts.analysis}</span>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'automation'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80'
          }`}
        >
          <Megaphone size={16} />
          Automation
          <span className="sb-kpi-badge px-2 py-0.5 text-xs">{categoryCounts.automation}</span>
        </button>
      </div>

      {/* LAYOUT: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* COLUMNA PRINCIPAL: TABLA DE ANALYZERS */}
        <div className="lg:col-span-2 space-y-5">
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain size={18} />
                Gemini Analyzers
              </h3>
              <p className="text-sm text-muted-foreground">
                {filteredAnalyzers.length} analyzers · Últimos 7 días
              </p>
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/30">
                    <th className="pb-2 font-medium">Analyzer</th>
                    <th className="pb-2 font-medium text-center">Complexity</th>
                    <th className="pb-2 font-medium text-right">Calls</th>
                    <th className="pb-2 font-medium text-right">Cost</th>
                    <th className="pb-2 font-medium text-right">Latency</th>
                    <th className="pb-2 font-medium text-right">Last 24h</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredAnalyzers.map((analyzer) => (
                    <tr key={analyzer.name} className="hover:bg-secondary/30 cursor-pointer">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {analyzerIcons[analyzer.name] || <Brain size={16} />}
                          <div>
                            <div className="font-medium">{analyzer.displayName}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {analyzer.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                            analyzer.complexity === 'simple'
                              ? 'bg-success/10 text-success'
                              : analyzer.complexity === 'medium'
                              ? 'bg-info/10 text-info'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {analyzer.complexity}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {analyzer.totalCalls.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono">
                        ${analyzer.totalCost.toFixed(4)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {Math.round(analyzer.avgLatency)}ms
                      </td>
                      <td className="py-3 text-right">
                        <div className="text-xs">
                          <div className="font-mono">{analyzer.last24h.calls} calls</div>
                          <div className="text-muted-foreground font-mono">
                            ${analyzer.last24h.cost.toFixed(4)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAnalyzers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hay analyzers en esta categoría</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-5">
          {/* Complexity Breakdown */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap size={18} />
              Por Complejidad
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-success/10 text-success">
                    Simple
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stats.byComplexity.simple.calls} calls
                  </span>
                </div>
                <span className="text-sm font-mono">
                  ${stats.byComplexity.simple.cost.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-info/10 text-info">
                    Medium
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stats.byComplexity.medium.calls} calls
                  </span>
                </div>
                <span className="text-sm font-mono">
                  ${stats.byComplexity.medium.cost.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-warning/10 text-warning">
                    Complex
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stats.byComplexity.complex.calls} calls
                  </span>
                </div>
                <span className="text-sm font-mono">
                  ${stats.byComplexity.complex.cost.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity size={18} />
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 10).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-3 border-b border-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {activity.analyzer.replace('-', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.operation}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono">{activity.latencyMs}ms</div>
                    <div className="text-muted-foreground font-mono">
                      ${activity.cost.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Info */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={18} />
              Información de Costos
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo promedio/call</span>
                <span className="font-mono">
                  ${stats.overview.totalCalls > 0 
                    ? (stats.overview.totalCost / stats.overview.totalCalls).toFixed(6)
                    : '0.000000'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens promedio</span>
                <span className="font-mono">
                  {stats.overview.totalCalls > 0
                    ? Math.round(stats.overview.totalTokens / stats.overview.totalCalls)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proyección mensual</span>
                <span className="font-mono font-semibold text-primary">
                  ${((stats.overview.totalCost / 7) * 30).toFixed(2)}/mes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
