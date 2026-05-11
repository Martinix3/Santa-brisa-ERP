/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/quality/lots/QualityLotsClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  ClipboardCheck,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { QualityBadge } from "@/components/quality/QualityBadge";
import { ReleaseLotDrawer } from "@/components/quality/ReleaseLotDrawer";
import { GeminiAlertsCard } from "@/components/quality/GeminiAlertsCard";
import type { LotReleaseTableRow } from "@/types/quality";
import type { QualityLotsSnapshot } from "@/server/actions/quality.data";
import { CheckCircle2 } from "lucide-react";
import { isCriticalPriority } from "@/types/quality";
import { QC_STATUS_META } from "@/domain/ssot";
import type { QcPlan } from "@/domain/ssot";

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

const EmptyState = ({ hint }: { hint: string }) => (
  <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-2xl bg-secondary/50 text-muted-foreground">
    <ClipboardCheck className="h-8 w-8 mb-3 text-muted-foreground" />
    <p className="text-sm max-w-sm">{hint}</p>
  </div>
);

type Props = QualityLotsSnapshot;

export function QualityLotsClient({
  lots,
  items,
  plans,
  suppliers,
  users,
  predictiveAlerts,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [selectedLot, setSelectedLot] = useState<LotReleaseTableRow | null>(null);

  const itemsById = useMemo(() => {
    return new Map(items.map(item => [item.id ?? item.sku, item]));
  }, [items]);

  const suppliersById = useMemo(
    () => new Map(suppliers.map(s => [s.id, s])),
    [suppliers]
  );

  const usersById = useMemo(
    () => new Map(users.map(u => [u.id, u])),
    [users]
  );

  const planNames = useMemo(
    () => new Map(plans.map(plan => [plan.id, plan.name])),
    [plans]
  );

  const plansBySku = useMemo(() => {
    const map = new Map<string, QcPlan>();
    plans.forEach(plan => {
      (plan.appliesToItems ?? []).forEach(sku => {
        if (sku) {
          map.set(sku, plan);
        }
      });
    });
    return map;
  }, [plans]);

  const lotRows = useMemo((): LotReleaseTableRow[] => {
    const now = new Date();

    return lots
      .filter(lot => (lot as any).lotCode ?? lot.lotNumber)
      .map(lot => {
        const item = itemsById.get(lot.itemId) ?? itemsById.get(lot.sku ?? "");
        const supplier = lot.supplierId
          ? suppliersById.get(lot.supplierId)?.name ?? lot.supplierId
          : "";
        const receptionDate = lot.receivedAt
          ? new Date(lot.receivedAt)
          : new Date(lot.createdAt);
        const daysInHold = Math.floor(
          (now.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let priority: LotReleaseTableRow["priority"] = "low";
        if (isCriticalPriority(daysInHold)) {
          priority = "critical";
        } else if (daysInHold > 5) {
          priority = "high";
        } else if (daysInHold > 2) {
          priority = "medium";
        }

        const qcMeta = QC_STATUS_META[lot.qcStatus];
        const hasCoa =
          Boolean(lot.qcCoaUrl || lot.qcCoa) ||
          Boolean(lot.qcDocuments && lot.qcDocuments.length > 0);
        const derivedPlan = plansBySku.get(lot.sku ?? "");
        const resolvedPlanId = lot.qcPlanId ?? derivedPlan?.id;

        const lotCodeOrNumber = (lot as any).lotCode ?? lot.lotNumber;
        return {
          id: lot.id,
          lotNumber: lotCodeOrNumber,
          sku: lot.sku ?? lot.itemId ?? "",
          itemId: lot.itemId,
          itemName: item?.name ?? lot.itemName ?? lot.sku ?? lot.itemId ?? lotCodeOrNumber,
          category: item?.category ?? "",
          supplier: lot.supplierId ?? "",
          supplierName: supplier,
          receptionDate,
          qcStatus: lot.qcStatus,
          qcPlanId: resolvedPlanId,
          qcPlanName: resolvedPlanId ? planNames.get(resolvedPlanId) ?? derivedPlan?.name : undefined,
          qcApprovedByName: lot.qcApprovedByName ?? usersById.get(lot.qcApprovedBy ?? "")?.displayName,
          qcRejectedByName: lot.qcRejectedByName ?? usersById.get(lot.qcRejectedBy ?? "")?.displayName,
          qcReviewOwnerName:
            lot.qcReviewOwnerName ?? usersById.get(lot.qcReviewOwnerId ?? "")?.displayName,
          qcCoaUrl: lot.qcCoaUrl ?? lot.qcCoa,
          qcDocuments: lot.qcDocuments,
          qcConditions: lot.qcConditions,
          daysInHold,
          priority,
          hasCoaDocument: hasCoa,
          requiresAnalysis: !qcMeta?.canSell,
        };
      });
  }, [lots, itemsById, suppliersById, usersById, planNames]);

  const filteredLots = useMemo(() => {
    let filtered = lotRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(lot =>
        (lot.lotNumber ?? "").toLowerCase().includes(q) ||
        lot.itemName.toLowerCase().includes(q) ||
        lot.supplier.toLowerCase().includes(q) ||
        (lot.supplierName ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(lot => lot.qcStatus === statusFilter);
    }
    if (priorityFilter !== "ALL") {
      filtered = filtered.filter(lot => lot.priority === priorityFilter);
    }
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter(lot => lot.category === categoryFilter);
    }

    return filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.daysInHold - a.daysInHold;
    });
  }, [lotRows, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(lotRows.map(lot => lot.category).filter(Boolean));
    return ["ALL", ...Array.from(cats)];
  }, [lotRows]);

  const stats = useMemo(() => {
    const total = lotRows.length;
    const pending = lotRows.filter(l => l.qcStatus === "PENDING").length;
    const inProgress = lotRows.filter(l => l.qcStatus === "IN_PROGRESS").length;
    const hold = lotRows.filter(l => l.qcStatus === "HOLD").length;
    const critical = lotRows.filter(l => l.priority === "critical").length;
    const avgDays = total > 0
      ? lotRows.reduce((sum, l) => sum + l.daysInHold, 0) / total
      : 0;

    return { total, pending, inProgress, hold, critical, avgDays };
  }, [lotRows]);

  const handleRefresh = () => {
    startTransition(async () => {
      router.refresh();
      toast.success("Datos actualizados");
    });
  };

  const handleLotClick = (lotId: string) => {
    const lot = filteredLots.find(l => l.id === lotId);
    if (lot) {
      setSelectedLot(lot);
    }
  };

  const handleDrawerClose = () => setSelectedLot(null);

  const handleDrawerUpdate = () => {
    handleRefresh();
    setSelectedLot(null);
  };

  return (
    <>
      <ModuleHeader title="Liberación de Lotes" icon={CheckCircle2}>
        <div className="flex gap-2">
          <Link href="/quality/plans">
            <SBButton variant="secondary" size="sm">Ver planes QC</SBButton>
          </Link>
          <SBButton
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Actualizar
          </SBButton>
        </div>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* KPI cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <article className="sb-glass rounded-xl border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total lotes</p>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
            </article>
            <article className="sb-glass rounded-xl border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-semibold text-warning">{stats.pending}</p>
            </article>
            <article className="sb-glass rounded-xl border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">En revisión</p>
              <p className="text-2xl font-semibold text-info">{stats.inProgress}</p>
            </article>
            <article className="sb-glass rounded-xl border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">En retención</p>
              <p className="text-2xl font-semibold text-destructive">{stats.hold}</p>
            </article>
            <article className="sb-glass rounded-xl border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Días promedio</p>
              <p className="text-2xl font-semibold text-foreground">{stats.avgDays.toFixed(1)}</p>
            </article>
          </section>

          {/* Gemini alerts */}
          {predictiveAlerts.length > 0 && (
            <GeminiAlertsCard alerts={predictiveAlerts} loading={false} />
          )}

          {/* Filters */}
          <section className="sb-glass rounded-2xl border border-border/40 p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por lote, SKU o proveedor..."
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter size={14} />
                Filtros
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En revisión</option>
                <option value="HOLD">Retenido</option>
                <option value="PASSED">Aprobado</option>
                <option value="FAILED">Rechazado</option>
                <option value="CONDITIONAL">Condicional</option>
              </Select>
              <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="ALL">Todas las prioridades</option>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </Select>
              <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === "ALL" ? "Todas las categorías" : cat}
                  </option>
                ))}
              </Select>
              <Select
                value=""
                onChange={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                  setCategoryFilter("ALL");
                }}
              >
                <option value="">Limpiar filtros</option>
              </Select>
            </div>
          </section>

          {/* Lots list */}
          <section className="space-y-4">
            {filteredLots.length === 0 ? (
              <EmptyState hint="No hay lotes que coincidan con los filtros aplicados." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredLots.map(lot => (
                  <article
                    key={lot.id}
                    className="sb-glass rounded-2xl border border-border/40 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleLotClick(lot.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {lot.lotNumber}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {lot.itemName}
                        </p>
                      </div>
                      <QualityBadge status={lot.qcStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mt-4">
                      <div>
                        <p className="font-semibold text-foreground">{lot.daysInHold} días</p>
                        <p>En retención</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{lot.supplierName || 'Proveedor'}</p>
                        <p>Proveedor</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {lot.qcPlanName ?? 'Sin plan'}
                        </p>
                        <p>Plan QC</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {lot.qcReviewOwnerName ?? 'Sin asignar'}
                        </p>
                        <p>Responsable</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span
                        className={`px-2 py-1 rounded-full font-semibold ${
                          lot.priority === 'critical'
                            ? 'bg-destructive/10 text-destructive'
                            : lot.priority === 'high'
                            ? 'bg-warning/10 text-warning'
                            : lot.priority === 'medium'
                            ? 'bg-info/10 text-info'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        Prioridad {lot.priority}
                      </span>
                      {lot.hasCoaDocument && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Package size={12} />
                          CoA adjunto
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedLot && (
        <ReleaseLotDrawer
          lot={selectedLot}
          onClose={handleDrawerClose}
          onUpdate={handleDrawerUpdate}
        />
      )}
    </>
  );
}
