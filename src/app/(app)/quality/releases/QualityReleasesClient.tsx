/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * @deprecated Legacy Quality page
 * Use quality-v2 system instead
 * See: QUALITY_DEPRECATION_PLAN.md
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, RefreshCw, Clock, CheckCircle2, Download, User } from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { DecisionBadge } from "@/components/quality/QualityBadge";
import type { QualityReleasesSnapshot } from "@/server/actions/quality.data";

type Props = QualityReleasesSnapshot;

export function QualityReleasesClient({ releases, items }: Props) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("MONTH");

  const itemsById = useMemo(
    () => new Map(items.map(item => [item.id ?? item.sku, item])),
    [items]
  );

  const filteredReleases = useMemo(() => {
    let filtered = releases;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(release => {
        const item = itemsById.get(release.itemId);
        const lotCodeOrNumber = release.lotCode;
        return (
          lotCodeOrNumber.toLowerCase().includes(q) ||
          (item?.name ?? "").toLowerCase().includes(q) ||
          (release.decisionBy ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (decisionFilter !== "ALL") {
      filtered = filtered.filter(release => release.decision === decisionFilter);
    }
    if (dateRangeFilter !== "ALL") {
      const now = new Date();
      const cutoff = new Date(now);
      switch (dateRangeFilter) {
        case "TODAY":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "WEEK":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "MONTH":
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case "QUARTER":
          cutoff.setMonth(now.getMonth() - 3);
          break;
      }
      filtered = filtered.filter(release => {
        const decisionDate = new Date(release.decisionAt ?? release.createdAt ?? Date.now());
        return decisionDate >= cutoff;
      });
    }

    return filtered.sort((a, b) =>
      new Date(b.decisionAt ?? b.createdAt ?? Date.now()).getTime() -
      new Date(a.decisionAt ?? a.createdAt ?? Date.now()).getTime()
    );
  }, [releases, itemsById, searchQuery, decisionFilter, dateRangeFilter]);

  const stats = useMemo(() => {
    const total = releases.length;
    const approved = releases.filter(r => r.decision === "APPROVED").length;
    const rejected = releases.filter(r => r.decision === "REJECTED").length;
    const conditional = releases.filter(r => r.decision === "CONDITIONAL").length;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    const releasesWithTests = releases.filter(
      r => Array.isArray(r.testsPerformed) && r.testsPerformed.length > 0
    );
    const avgPassRate =
      releasesWithTests.length > 0
        ? releasesWithTests.reduce((sum, release) => {
          const passed =
            release.testsPerformed!.filter((test: { result?: string; inSpec?: boolean }) => test.result === "PASS" || test.inSpec).length ??
            0;
          return sum + (passed / release.testsPerformed!.length) * 100;
        }, 0) / releasesWithTests.length
        : 0;

    return { total, approved, rejected, conditional, approvalRate, avgPassRate };
  }, [releases]);

  const handleRefresh = () => {
    startTransition(async () => {
      router.refresh();
      toast.success("Historial actualizado");
    });
  };

  const handleExport = () => {
    toast.info("Exportando historial (pendiente de implementación)");
  };

  return (
    <>
      <ModuleHeader title="Historial de Liberaciones" icon={CheckCircle2}>
        <div className="flex gap-2">
          <SBButton variant="ghost" size="sm" onClick={handleExport}>
            <Download size={16} />
            Exportar
          </SBButton>
          <SBButton variant="secondary" size="sm" disabled={isRefreshing} onClick={handleRefresh}>
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Actualizar
          </SBButton>
        </div>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Liberaciones" value={stats.total} />
            <StatCard label="Aprobadas" value={stats.approved} tone="success" />
            <StatCard label="Rechazadas" value={stats.rejected} tone="destructive" />
            <StatCard label="Condicionales" value={stats.conditional} tone="warning" />
            <StatCard
              label="Ratio aprobación"
              value={`${stats.approvalRate.toFixed(1)}%`}
              tone="info"
            />
          </section>

          <section className="sb-glass rounded-2xl border border-border/40 p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por lote, SKU o responsable..."
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter size={14} />
                Filtros
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)}>
                <option value="ALL">Todas las decisiones</option>
                <option value="APPROVED">Aprobados</option>
                <option value="REJECTED">Rechazados</option>
                <option value="CONDITIONAL">Condicionales</option>
                <option value="HOLD">En hold</option>
              </Select>
              <Select value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)}>
                <option value="TODAY">Últimas 24h</option>
                <option value="WEEK">Última semana</option>
                <option value="MONTH">Último mes</option>
                <option value="QUARTER">Último trimestre</option>
                <option value="ALL">Todo el histórico</option>
              </Select>
              <Select
                value=""
                onChange={() => {
                  setSearchQuery("");
                  setDecisionFilter("ALL");
                  setDateRangeFilter("MONTH");
                }}
              >
                <option value="">Limpiar filtros</option>
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            {filteredReleases.length === 0 ? (
              <div className="sb-glass rounded-2xl border border-border/40 p-10 text-center text-sm text-muted-foreground">
                No hay liberaciones con los filtros aplicados.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredReleases.map(release => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    itemName={itemsById.get(release.itemId)?.name}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "destructive" | "warning" | "info";
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    info: "text-info",
  };

  return (
    <article className="sb-glass rounded-xl border border-border/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </article>
  );
}

function ReleaseCard({
  release,
  itemName,
}: {
  release: QualityReleasesSnapshot["releases"][number];
  itemName?: string;
}) {
  const decisionDate = new Date(release.decisionAt ?? release.createdAt ?? Date.now());
  const tests = release.testsPerformed ?? [];
  const passed = tests.filter((test: { result?: string; inSpec?: boolean }) => test.result === "PASS" || test.inSpec).length;
  const passRate = tests.length > 0 ? (passed / tests.length) * 100 : 0;

  return (
    <article className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">{release.lotCode}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {itemName ?? release.itemName ?? release.itemId}
          </p>
        </div>
        <DecisionBadge decision={release.decision as any} />
      </header>

      <section className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-muted-foreground">Tests</span>
          <span className="font-semibold text-foreground">{tests.length}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Aprobados</span>
          <span className="font-semibold text-success">{passed}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Pass rate</span>
          <span className="font-semibold text-info">{passRate.toFixed(0)}%</span>
        </div>
      </section>

      {release.reason && release.decision === "REJECTED" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
          {release.reason}
        </div>
      )}

      {release.conditions && release.conditions.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-2 text-xs text-warning">
          {release.conditions.length} condiciones aplicadas
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {decisionDate.toLocaleDateString("es-ES")}
        </span>
        <span className="flex items-center gap-1">
          <User size={12} />
          {release.decisionBy ?? "Desconocido"}
        </span>
      </footer>
    </article>
  );
}
