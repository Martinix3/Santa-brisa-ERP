"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useMemo } from "react";
import Link from "next/link";
import { ShieldCheck, TrendingUp, TrendingDown, ExternalLink, AlertTriangle } from "lucide-react";
import type { Lot, QualityRelease, QcTest } from "@/domain/ssot";
import { differenceInDays, subDays } from "date-fns";

interface QualityWidgetProps {
  lots: Lot[];
  qualityReleases: QualityRelease[];
  qcTests: QcTest[];
  variant?: "light" | "dark";
  className?: string;
}

export function QualityWidget({ 
  lots = [], 
  qualityReleases = [], 
  qcTests = [],
  variant = "light",
  className = ""
}: QualityWidgetProps) {
  
  const stats = useMemo(() => {
    const now = new Date();
    const last30Days = subDays(now, 30);
    const previous30Days = subDays(now, 60);
    
    // Lotes en proceso
    const lotsInHold = lots.filter(l => 
      l.qcStatus === 'PENDING' || l.qcStatus === 'IN_PROGRESS' || l.qcStatus === 'HOLD'
    );
    
    // Lotes críticos (>7 días)
    const criticalLots = lotsInHold.filter(l => {
      const createdDate = new Date(l.createdAt);
      const daysInHold = differenceInDays(now, createdDate);
      return daysInHold > 7;
    });
    
    // Tasa de aprobación (últimos 30 días)
    const recentReleases = qualityReleases.filter(r => {
      const releaseDate = new Date(r.decisionAt);
      return releaseDate >= last30Days;
    });
    
    const previousReleases = qualityReleases.filter(r => {
      const releaseDate = new Date(r.decisionAt);
      return releaseDate >= previous30Days && releaseDate < last30Days;
    });
    
    const approvedCount = recentReleases.filter(r => r.decision === 'APPROVED').length;
    const approvalRate = recentReleases.length > 0 
      ? (approvedCount / recentReleases.length) * 100 
      : 0;
    
    const previousApprovedCount = previousReleases.filter(r => r.decision === 'APPROVED').length;
    const previousApprovalRate = previousReleases.length > 0
      ? (previousApprovedCount / previousReleases.length) * 100
      : 0;
    
    const approvalTrend = approvalRate - previousApprovalRate;
    
    // Tiempo promedio de revisión (en horas)
    const releasesWithDuration = recentReleases.filter(r => r.reviewDuration);
    const avgReviewTime = releasesWithDuration.length > 0
      ? releasesWithDuration.reduce((sum, r) => sum + (r.reviewDuration || 0), 0) / releasesWithDuration.length / 60
      : 0;
    
    // Pass rate de tests
    const recentTests = qcTests.filter(t => {
      const testDate = new Date(t.testedAt);
      return testDate >= last30Days;
    });
    
    const passedTests = recentTests.filter(t => t.result === 'PASS' || t.inSpec).length;
    const passRate = recentTests.length > 0 
      ? (passedTests / recentTests.length) * 100 
      : 0;
    
    return {
      lotsInHold: lotsInHold.length,
      criticalLots: criticalLots.length,
      approvalRate,
      approvalTrend,
      avgReviewTime,
      passRate,
      totalReleases: recentReleases.length
    };
  }, [lots, qualityReleases, qcTests]);

  const baseClass = variant === "dark" 
    ? "sb-card-glass-dark" 
    : "sb-card-glass-light";

  return (
    <div className={`${baseClass} p-5 hover-raise ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-info" />
          <h3 className="text-sm font-semibold">Calidad</h3>
        </div>
        <Link 
          href="/quality/dashboard"
          className="text-xs text-info hover:underline flex items-center gap-1"
        >
          Ver dashboard
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Lotes en proceso */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Lotes en proceso
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{stats.lotsInHold}</span>
            {stats.criticalLots > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle size={12} />
                <span>{stats.criticalLots} críticos</span>
              </div>
            )}
            {stats.criticalLots === 0 && (
              <span className="w-2 h-2 rounded-full bg-success" />
            )}
          </div>
        </div>

        {/* Tasa de aprobación */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Tasa aprobación (30d)
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{stats.approvalRate.toFixed(1)}%</span>
            {stats.approvalTrend !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${
                stats.approvalTrend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.approvalTrend > 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                <span>{Math.abs(stats.approvalTrend).toFixed(1)}%</span>
              </div>
            )}
            {stats.approvalTrend === 0 && stats.totalReleases > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
        </div>

        {/* Tiempo promedio */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Tiempo promedio
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{stats.avgReviewTime.toFixed(1)}h</span>
            <span className={`w-2 h-2 rounded-full ${
              stats.avgReviewTime < 24 
                ? 'bg-success' 
                : stats.avgReviewTime < 48
                ? 'bg-warning'
                : 'bg-destructive'
            }`} />
          </div>
        </div>

        {/* Pass Rate */}
        {qcTests.length > 0 && (
          <div className="pt-3 border-t border-border/30">
            <div className="text-xs text-muted-foreground mb-1">
              Pass Rate
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{stats.passRate.toFixed(1)}%</span>
              <span className={`w-2 h-2 rounded-full ${
                stats.passRate >= 95 
                  ? 'bg-success' 
                  : stats.passRate >= 90
                  ? 'bg-warning'
                  : 'bg-destructive'
              }`} />
            </div>
          </div>
        )}
      </div>

      {/* Critical Alert Banner */}
      {stats.criticalLots > 0 && (
        <Link
          href="/quality/lots"
          className="mt-4 block rounded-lg bg-red-50/50 border border-red-200 p-3 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
            <div className="text-xs text-red-900">
              <span className="font-semibold">{stats.criticalLots} lote{stats.criticalLots > 1 ? 's' : ''}</span>
              {' '}requiere{stats.criticalLots > 1 ? 'n' : ''} atención urgente
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
