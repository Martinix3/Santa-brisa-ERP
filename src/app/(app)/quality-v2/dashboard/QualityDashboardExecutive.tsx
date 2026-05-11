"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileWarning,
  Sparkles,
  ClipboardList,
  BarChart3,
  Settings,
  BookOpen,
  XCircle
} from "lucide-react";
import type { Lot, QualityPlan, AnalysisParameter, GeminiAnalysis } from "@/domain/ssot-v2-plus-schemas";

type LotWithItem = Lot & {
  itemName?: string;
};

type Props = {
  lots: LotWithItem[];
  plans: QualityPlan[];
  parameters: AnalysisParameter[];
  geminiAlerts: GeminiAnalysis[];
};

export function QualityDashboardExecutive({ lots, plans, parameters, geminiAlerts }: Props) {
  // KPI Calculations
  const metrics = useMemo(() => {
    const total = lots.length;
    const pending = lots.filter(l => ["PENDING","IN_PROGRESS","HOLD","CONDITIONAL"].includes(l.qcStatus)).length;
    const passed = lots.filter(l => l.qcStatus === "PASSED").length;
    const failed = lots.filter(l => l.qcStatus === "FAILED").length;
    const hold = lots.filter(l => l.qcStatus === "HOLD").length;
    
    const rejectionRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0";
    const approvalRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
    
    // Calcular tiempo medio (mockup - en producción calcular desde timestamps reales)
    const avgTime = "4.2";
    
    // NCs abiertas (mockup - en producción desde colección de no conformidades)
    const openNCs = Math.floor(failed * 1.5);

    return {
      total,
      pending,
      passed,
      failed,
      hold,
      rejectionRate,
      approvalRate,
      avgTime,
      openNCs,
    };
  }, [lots]);

  // Top 5 lotes destacados (HOLD o alertas Gemini)
  const highlightedLots = useMemo(() => {
    const lotsWithAlerts = lots.map(l => ({
      ...l,
      alertCount: geminiAlerts.filter(a => a.linkedEntity?.type === 'lot' && a.linkedEntity.id === l.id).length,
    }));
    return lotsWithAlerts
      .filter(l => l.qcStatus === "HOLD" || l.alertCount > 0)
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5);
  }, [lots, geminiAlerts]);

  // Tendencias mensuales (mockup - en producción desde aggregation queries)
  const monthlyTrends = [
    { month: "Sep", passed: 87, failed: 8, pending: 15 },
    { month: "Oct", passed: 92, failed: 6, pending: 12 },
    { month: "Nov", passed: 89, failed: 9, pending: 14 },
    { month: "Dic", passed: 95, failed: 4, pending: 11 },
    { month: "Ene", passed: metrics.passed, failed: metrics.failed, pending: metrics.pending },
  ];

  return (
    <main className="p-4 md:p-6 space-y-5">
      {/* HEADER */}
      <header className="sb-header-glass p-5">
        <h1>Dashboard Quality Control</h1>
        <p className="text-muted-foreground">Vista ejecutiva · {metrics.total} lotes en sistema</p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--primary">Nueva revisión QC</button>
          <button className="sb-btn--secondary">Exportar informe</button>
          <button className="sb-btn--ghost">Ver todos los lotes</button>
        </div>
      </header>

      {/* KPI CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Tasa de rechazo"
          value={`${metrics.rejectionRate}%`}
          trend={{ value: -1.2, positive: true }}
          tone="success"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Lotes en HOLD"
          value={metrics.hold}
          trend={{ value: +3, positive: false }}
          tone="warning"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="Tiempo medio QC"
          value={`${metrics.avgTime}h`}
          trend={{ value: -0.5, positive: true }}
          tone="info"
        />
        <KpiCard
          icon={<FileWarning className="w-5 h-5" />}
          label="NCs abiertas"
          value={metrics.openNCs}
          trend={{ value: -2, positive: true }}
          tone="destructive"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-5">
          {/* CHARTS */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4">Tendencias mensuales</h3>
            <div className="space-y-4">
              {monthlyTrends.map((m, i) => (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.month}</span>
                    <span className="text-muted-foreground">
                      {m.passed + m.failed + m.pending} lotes
                    </span>
                  </div>
                  <div className="flex h-6 rounded overflow-hidden">
                    <div 
                      className="bg-success" 
                      style={{ width: `${(m.passed / (m.passed + m.failed + m.pending)) * 100}%` }}
                      title={`${m.passed} aprobados`}
                    />
                    <div 
                      className="bg-destructive" 
                      style={{ width: `${(m.failed / (m.passed + m.failed + m.pending)) * 100}%` }}
                      title={`${m.failed} rechazados`}
                    />
                    <div 
                      className="bg-warning" 
                      style={{ width: `${(m.pending / (m.passed + m.failed + m.pending)) * 100}%` }}
                      title={`${m.pending} pendientes`}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success" /> {m.passed}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-destructive" /> {m.failed}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-warning" /> {m.pending}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DISTRIBUTION CHART */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4">Distribución de estados</h3>
            <div className="flex items-center justify-center gap-8 py-6">
              <DonutSegment 
                label="Aprobados" 
                value={metrics.passed} 
                total={metrics.total} 
                color="text-success" 
              />
              <DonutSegment 
                label="Rechazados" 
                value={metrics.failed} 
                total={metrics.total} 
                color="text-destructive" 
              />
              <DonutSegment 
                label="Pendientes" 
                value={metrics.pending} 
                total={metrics.total} 
                color="text-warning" 
              />
            </div>
          </div>

          {/* HIGHLIGHTED LOTS */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4">Lotes que requieren atención</h3>
            {highlightedLots.length > 0 ? (
              <div className="space-y-2">
                {highlightedLots.map(lot => (
                  <div key={lot.lotCode} className="rounded-lg border p-3 hover:bg-secondary/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <div>
                          <p className="font-medium">{lot.lotCode}</p>
                          <p className="text-xs text-muted-foreground">{lot.itemName || lot.itemId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lot.alertCount > 0 && (
                          <span className="sb-badge--warning">{lot.alertCount} alerta{lot.alertCount > 1 ? 's' : ''}</span>
                        )}
                        <span className="sb-badge--default">{lot.qcStatus}</span>
                        <button className="sb-btn--ghost text-xs">Ver</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-sm text-muted-foreground">
                  No hay lotes que requieran atención inmediata
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5">
          {/* GEMINI ALERTS */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Alertas Gemini
            </h3>
            {geminiAlerts.length > 0 ? (
              <div className="space-y-3">
                {geminiAlerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="rounded-lg border-l-4 border-accent bg-secondary/10 p-3">
                    <div className="flex items-start gap-2">
                      {alert.severity === "critical" ? (
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      ) : alert.severity === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.signal}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(alert.data)?.slice(0, 80) || 'Sin detalles'}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="sb-btn--ghost w-full text-xs">
                  Ver todas las alertas →
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin alertas activas
              </p>
            )}
          </div>

          {/* QUICK STATS */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4">Estadísticas rápidas</h3>
            <div className="space-y-3">
              <StatItem label="Total lotes" value={metrics.total} />
              <StatItem label="Tasa aprobación" value={`${metrics.approvalRate}%`} />
              <StatItem label="Planes QC activos" value={plans.length} />
              <StatItem label="Parámetros monitorizados" value={parameters.length} />
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="sb-card-glass-light p-5">
            <h3 className="font-semibold mb-4">Acciones rápidas</h3>
            <div className="space-y-2">
              <button className="sb-btn--secondary w-full text-sm justify-start flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Revisar lotes pendientes
              </button>
              <button className="sb-btn--secondary w-full text-sm justify-start flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Generar informe mensual
              </button>
              <button className="sb-btn--secondary w-full text-sm justify-start flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurar alertas
              </button>
              <button className="sb-btn--secondary w-full text-sm justify-start flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Ver biblioteca métodos
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

// KPI Card Component - Refined with neutral colors
function KpiCard({ 
  icon, 
  label, 
  value, 
  trend, 
  tone 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  trend?: { value: number; positive: boolean }; 
  tone: "success" | "warning" | "destructive" | "info";
}) {
  const iconColorClass = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-muted-foreground",
  }[tone];

  return (
    <div className="sb-card-glass-light p-5">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3">
        <div className={iconColorClass}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          {trend.positive ? (
            <>
              <TrendingDown className="w-3 h-3 text-success" />
              <span>{trend.value > 0 ? "+" : ""}{trend.value}% vs mes anterior</span>
            </>
          ) : (
            <>
              <TrendingUp className="w-3 h-3 text-destructive" />
              <span>{trend.value > 0 ? "+" : ""}{trend.value}% vs mes anterior</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Donut Segment Component
function DonutSegment({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${color}`}>{percentage}%</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
      <div className="text-xs text-muted-foreground">({value})</div>
    </div>
  );
}

// Stat Item Component
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
