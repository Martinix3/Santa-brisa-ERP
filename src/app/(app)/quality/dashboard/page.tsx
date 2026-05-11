"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useMemo, useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import { getQualityPredictiveAlerts } from "@/server/actions/quality-gemini";
import type { PredictiveAlert } from "@/server/gemini/analyzers/quality-analyzer";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import Link from "next/link";
import type { Lot, QcTest, QualityRelease, QcPlanBySku } from "@/domain/ssot";
import { QualityBadge } from "@/components/quality/QualityBadge";
import { GeminiAlertsCard } from "@/components/quality/GeminiAlertsCard";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBButton } from "@/components/ui/ui-primitives";
import { format, differenceInDays, subDays } from "date-fns";
import { es } from "date-fns/locale";

export default function QualityDashboardPage() {
  const { data } = useData();
  const [geminiAlerts, setGeminiAlerts] = useState<PredictiveAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const lots = (data?.lots || []) as Lot[];
  const qcTests = (data?.qcTests || []) as QcTest[];
  const qualityReleases = (data?.qualityReleases || []) as QualityRelease[];
  const qcPlans = (data?.qcPlans || []) as QcPlanBySku[];

  // Load Gemini alerts
  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoadingAlerts(true);
        const result = await getQualityPredictiveAlerts({
          severityFilter: ['critical', 'warning'],
          limit: 10,
        });

        if (result.success && result.data) {
          setGeminiAlerts(result.data);
        }
      } catch (error) {
        console.error('Failed to load Gemini alerts:', error);
      } finally {
        setLoadingAlerts(false);
      }
    }

    if (lots.length > 0 || qualityReleases.length > 0) {
      loadAlerts();
    } else {
      setLoadingAlerts(false);
    }
  }, [lots.length, qualityReleases.length]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const last30Days = subDays(now, 30);

    // Lots in QC process
    const lotsInHold = lots.filter(l =>
      l.qcStatus === 'PENDING' || l.qcStatus === 'IN_PROGRESS' || l.qcStatus === 'HOLD'
    );

    // Critical lots (>7 days in hold)
    const criticalLots = lotsInHold.filter(l => {
      const createdDate = new Date(l.createdAt);
      const daysInHold = differenceInDays(now, createdDate);
      return daysInHold > 7;
    });

    // Recent releases (last 30 days)
    const recentReleases = qualityReleases.filter(r => {
      const releaseDate = new Date(r.decisionAt);
      return releaseDate >= last30Days;
    });

    const approvedCount = recentReleases.filter(r => r.decision === 'APPROVED').length;
    const rejectedCount = recentReleases.filter(r => r.decision === 'REJECTED').length;
    const conditionalCount = recentReleases.filter(r => r.decision === 'CONDITIONAL').length;

    const approvalRate = recentReleases.length > 0
      ? (approvedCount / recentReleases.length) * 100
      : 0;

    // Average review time (in hours)
    const releasesWithDuration = recentReleases.filter(r => r.reviewDuration);
    const avgReviewTime = releasesWithDuration.length > 0
      ? releasesWithDuration.reduce((sum, r) => sum + (r.reviewDuration || 0), 0) / releasesWithDuration.length / 60
      : 0;

    // Pass rate from tests
    const recentTests = qcTests.filter(t => {
      const testDate = new Date(t.testedAt);
      return testDate >= last30Days;
    });

    const passedTests = recentTests.filter(t => t.result === 'PASS' || t.inSpec).length;
    const passRate = recentTests.length > 0
      ? (passedTests / recentTests.length) * 100
      : 0;

    // Active QC plans (QcPlanBySku doesn't have active field, count all)
    const activePlans = qcPlans.length;

    return {
      lotsInHold: lotsInHold.length,
      criticalLots: criticalLots.length,
      recentReleases: recentReleases.length,
      approvedCount,
      rejectedCount,
      conditionalCount,
      approvalRate,
      avgReviewTime,
      passRate,
      activePlans,
      totalPlans: qcPlans.length,
    };
  }, [lots, qualityReleases, qcTests, qcPlans]);

  // Get critical lots list (top 5)
  const criticalLotsList = useMemo(() => {
    const now = new Date();
    return lots
      .filter(l => l.qcStatus === 'PENDING' || l.qcStatus === 'IN_PROGRESS' || l.qcStatus === 'HOLD')
      .map(lot => {
        const createdDate = new Date(lot.createdAt);
        const daysInHold = differenceInDays(now, createdDate);
        return { ...lot, daysInHold };
      })
      .filter(l => l.daysInHold > 2) // More than 2 days
      .sort((a, b) => b.daysInHold - a.daysInHold)
      .slice(0, 5);
  }, [lots]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return qualityReleases
      .sort((a, b) => new Date(b.decisionAt).getTime() - new Date(a.decisionAt).getTime())
      .slice(0, 5);
  }, [qualityReleases]);

  // Trend calculation (compare last 30 vs previous 30 days)
  const trends = useMemo(() => {
    const now = new Date();
    const last30 = subDays(now, 30);
    const previous30 = subDays(now, 60);

    const currentPeriod = qualityReleases.filter(r => {
      const date = new Date(r.decisionAt);
      return date >= last30;
    });

    const previousPeriod = qualityReleases.filter(r => {
      const date = new Date(r.decisionAt);
      return date >= previous30 && date < last30;
    });

    const currentApprovalRate = currentPeriod.length > 0
      ? (currentPeriod.filter(r => r.decision === 'APPROVED').length / currentPeriod.length) * 100
      : 0;

    const previousApprovalRate = previousPeriod.length > 0
      ? (previousPeriod.filter(r => r.decision === 'APPROVED').length / previousPeriod.length) * 100
      : 0;

    const approvalTrend = currentApprovalRate - previousApprovalRate;

    return {
      approvalTrend,
      volumeTrend: currentPeriod.length - previousPeriod.length,
    };
  }, [qualityReleases]);

  if (!data) {
    return (
      <div className="sb-page flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ModuleHeader title="Control de Calidad" icon={CheckCircle2}>
        <Link href="/quality/lots">
          <SBButton variant="secondary" size="sm">
            Liberar Lotes
          </SBButton>
        </Link>
        <Link href="/quality/plans">
          <SBButton variant="primary" size="sm">
            Gestionar Planes
          </SBButton>
        </Link>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Lotes en Proceso */}
          <div className="sb-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                En Proceso
              </div>
              <Package className="w-4 h-4 text-info" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-semibold text-foreground">
                {stats.lotsInHold}
              </div>
              {stats.criticalLots > 0 && (
                <div className="text-xs text-destructive font-medium">
                  {stats.criticalLots} críticos
                </div>
              )}
            </div>
            <Link
              href="/quality/lots"
              className="text-xs text-info hover:underline mt-2 inline-block"
            >
              Ver todos →
            </Link>
          </div>

          {/* Tasa de Aprobación */}
          <div className="sb-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tasa Aprobación
              </div>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-semibold text-foreground">
                {stats.approvalRate.toFixed(1)}%
              </div>
              {trends.approvalTrend !== 0 && (
                <div className={`flex items-center text-xs font-medium ${trends.approvalTrend > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                  {trends.approvalTrend > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(trends.approvalTrend).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Últimos 30 días
            </div>
          </div>

          {/* Tiempo Promedio de Revisión */}
          <div className="sb-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tiempo Promedio
              </div>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-semibold text-foreground">
                {stats.avgReviewTime.toFixed(1)}h
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Por revisión QC
            </div>
          </div>

          {/* Pass Rate de Tests */}
          <div className="sb-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pass Rate Tests
              </div>
              <AlertCircle className="w-4 h-4 text-info" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-semibold text-foreground">
                {stats.passRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {qcTests.length} tests realizados
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Decisiones Recientes */}
          <div className="sb-glass rounded-xl p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Decisiones (30d)
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Aprobados</span>
                </div>
                <span className="font-semibold text-success">{stats.approvedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>Rechazados</span>
                </div>
                <span className="font-semibold text-destructive">{stats.rejectedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span>Condicionales</span>
                </div>
                <span className="font-semibold text-warning">{stats.conditionalCount}</span>
              </div>
            </div>
          </div>

          {/* Planes Activos */}
          <div className="sb-glass rounded-xl p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Planes de Control
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Activos</span>
              <span className="text-2xl font-semibold text-success">{stats.activePlans}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-medium text-foreground">{stats.totalPlans}</span>
            </div>
            <Link
              href="/quality/plans"
              className="text-xs text-info hover:underline mt-3 inline-block"
            >
              Gestionar planes →
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="sb-glass rounded-xl p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Acciones Rápidas
            </div>
            <div className="space-y-2">
              <Link
                href="/quality/lots"
                className="block px-3 py-2 text-sm bg-info/10 hover:bg-info/20 text-info rounded-lg transition-colors border border-info/20"
              >
                Liberar Lotes
              </Link>
              <Link
                href="/quality/releases"
                className="block px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Ver Historial
              </Link>
              <Link
                href="/quality/plans"
                className="block px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Gestionar Planes
              </Link>
            </div>
          </div>
        </div>

        {/* Gemini Intelligence Section */}
        <div className="mb-6">
          <GeminiAlertsCard alerts={geminiAlerts} loading={loadingAlerts} />
        </div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Lots Alert */}
          <div className="sb-glass rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Lotes Críticos ({criticalLotsList.length})
              </h2>
            </div>

            {criticalLotsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay lotes críticos en este momento
              </div>
            ) : (
              <div className="space-y-2">
                {criticalLotsList.map((lot) => (
                  <Link
                    key={lot.id}
                    href="/quality/lots"
                    className="block p-3 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {lot.lotNumber}
                      </span>
                      <span className="text-xs font-medium text-destructive">
                        {lot.daysInHold} días
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{lot.itemName || lot.sku || lot.itemId}</span>
                      <QualityBadge status={lot.qcStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="sb-glass rounded-xl p-4 border">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Actividad Reciente
            </h2>

            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay actividad reciente
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((release) => (
                  <div key={release.id} className="pb-3 border-b border-border last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {release.lotCode}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {release.itemName || 'Lote'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${release.decision === 'APPROVED'
                          ? 'sb-badge--success'
                          : release.decision === 'REJECTED'
                            ? 'sb-badge--destructive'
                            : 'sb-badge--warning'
                        }`}>
                        {release.decision === 'APPROVED'
                          ? 'Aprobado'
                          : release.decision === 'REJECTED'
                            ? 'Rechazado'
                            : 'Condicional'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(release.decisionAt), "dd MMM, HH:mm", { locale: es })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
