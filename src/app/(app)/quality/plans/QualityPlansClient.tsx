/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/quality/plans/QualityPlansClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { QualityPlansSnapshot } from "@/server/actions/quality.data";
import type { ItemCategory, QcPlan } from "@/domain/ssot";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { GeminiAlertsCard } from "@/components/quality/GeminiAlertsCard";
import { QcPlanDrawer } from "@/components/quality/QcPlanDrawer";
import { QcPlanEditorDrawer } from "@/components/quality/QcPlanEditorDrawer";

type Props = QualityPlansSnapshot;

const triggerLabels: Record<NonNullable<QcPlan["triggerOn"]>, string> = {
  RECEIPT: "Recepción",
  PRODUCTION: "Producción",
  BOTH: "Recepción y Producción",
};

const statusTone: Record<"active" | "inactive", string> = {
  active: "sb-badge--success",
  inactive: "sb-badge--default",
};

type Filters = {
  status: "ALL" | "ACTIVE" | "INACTIVE";
  trigger: "ALL" | "RECEIPT" | "PRODUCTION" | "BOTH";
  autoApprove: "ALL" | "ENABLED" | "DISABLED";
  category: "ALL" | ItemCategory;
};

export function QualityPlansClient({ plans, items, predictiveAlerts }: Props) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    status: "ALL",
    trigger: "ALL",
    autoApprove: "ALL",
    category: "ALL",
  });
  const [selectedPlan, setSelectedPlan] = useState<QcPlan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const categoryOptions = useMemo(() => {
    const categories = new Set<ItemCategory>();
    plans.forEach(plan => {
      (plan.appliesToCategories ?? []).forEach(cat => {
        if (cat) {
          categories.add(cat);
        }
      });
    });
    return Array.from(categories);
  }, [plans]);

  const planRows = useMemo(() => {
    return plans.map(plan => {
      const createdAt = plan.createdAt ? new Date(plan.createdAt) : null;
      const updatedAt = plan.updatedAt ? new Date(plan.updatedAt) : null;
      const itemsCoverage = plan.appliesToItems?.length ?? 0;
      const categoriesCoverage = plan.appliesToCategories?.length ?? 0;
      return {
        plan,
        createdAt,
        updatedAt,
        itemsCoverage,
        categoriesCoverage,
        autoApprove: plan.autoApproveRules?.enabled ?? false,
      };
    });
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return planRows.filter(row => {
      const { plan } = row;

      if (query) {
        const matchesName = plan.name.toLowerCase().includes(query);
        const matchesCode = (plan.code ?? "").toLowerCase().includes(query);
        const matchesSku = (plan.appliesToItems ?? []).some(itemId =>
          itemId.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesCode && !matchesSku) {
          return false;
        }
      }

      if (filters.status === "ACTIVE" && !plan.active) return false;
      if (filters.status === "INACTIVE" && plan.active) return false;

      if (filters.trigger !== "ALL") {
        if (plan.triggerOn !== filters.trigger) return false;
      }

      if (filters.autoApprove === "ENABLED" && !row.autoApprove) return false;
      if (filters.autoApprove === "DISABLED" && row.autoApprove) return false;

      if (filters.category !== "ALL") {
        if (!(plan.appliesToCategories ?? []).includes(filters.category)) {
          return false;
        }
      }

      return true;
    });
  }, [planRows, filters, searchQuery]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(plan => plan.active).length;
    const requiredRelease = plans.filter(plan => plan.requiredForRelease).length;
    const autoApprove = plans.filter(plan => plan.autoApproveRules?.enabled).length;
    const coverageSkus = new Set<string>();
    plans.forEach(plan => {
      (plan.appliesToItems ?? []).forEach(sku => coverageSkus.add(sku));
    });
    const coveragePct =
      items.length > 0 ? Math.min(100, Math.round((coverageSkus.size / items.length) * 100)) : 0;

    return { total, active, requiredRelease, autoApprove, coveragePct };
  }, [plans, items.length]);

  const handleRefresh = () => {
    startTransition(async () => {
      router.refresh();
      toast.success("Planes actualizados");
    });
  };

  const handlePlanClick = (plan: QcPlan) => {
    setSelectedPlan(plan);
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setIsEditorOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      status: "ALL",
      trigger: "ALL",
      autoApprove: "ALL",
      category: "ALL",
    });
    setSearchQuery("");
  };

  return (
    <>
      <ModuleHeader title="Planes de Calidad" icon={ShieldCheck}>
        <div className="flex gap-2">
          <SBButton variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus size={16} />
            Nuevo plan
          </SBButton>
          <SBButton
            variant="secondary"
            size="sm"
            disabled={isRefreshing}
            onClick={handleRefresh}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Actualizar
          </SBButton>
        </div>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <PlanStatCard
              icon={CheckCircle2}
              label="Planes activos"
              value={stats.active}
              hint={`${stats.total} totales`}
            />
            <PlanStatCard
              icon={ShieldCheck}
              label="Obligatorios para liberar"
              value={stats.requiredRelease}
              tone="warning"
            />
            <PlanStatCard
              icon={Sparkles}
              label="Auto-aprobación"
              value={stats.autoApprove}
              hint="Planes con reglas automáticas"
              tone="info"
            />
            <PlanStatCard
              icon={Layers}
              label="Cobertura SKU"
              value={`${stats.coveragePct}%`}
              hint="Ítems con plan asignado"
              tone="success"
            />
            <PlanStatCard
              icon={Activity}
              label="Alertas Gemini"
              value={predictiveAlerts.length}
              hint="Riesgos de calidad"
              tone={predictiveAlerts.length > 0 ? "destructive" : "info"}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <div className="space-y-4">
              <div className="sb-glass rounded-2xl border border-border/40 p-4 md:p-6 space-y-4">
                <div className="sb-toolbar flex-col md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Buscar por nombre, código o SKU..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 md:mt-0">
                    <Filter size={14} />
                    Filtros
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Select
                    value={filters.status}
                    onChange={event =>
                      setFilters(prev => ({ ...prev, status: event.target.value as Filters["status"] }))
                    }
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="ACTIVE">Solo activos</option>
                    <option value="INACTIVE">Solo inactivos</option>
                  </Select>
                  <Select
                    value={filters.trigger}
                    onChange={event =>
                      setFilters(prev => ({
                        ...prev,
                        trigger: event.target.value as Filters["trigger"],
                      }))
                    }
                  >
                    <option value="ALL">Todos los disparadores</option>
                    <option value="RECEIPT">Recepción</option>
                    <option value="PRODUCTION">Producción</option>
                    <option value="BOTH">Ambos</option>
                  </Select>
                  <Select
                    value={filters.autoApprove}
                    onChange={event =>
                      setFilters(prev => ({
                        ...prev,
                        autoApprove: event.target.value as Filters["autoApprove"],
                      }))
                    }
                  >
                    <option value="ALL">Auto-aprobación</option>
                    <option value="ENABLED">Solo con auto-aprobación</option>
                    <option value="DISABLED">Sin auto-aprobación</option>
                  </Select>
                  <Select
                    value={filters.category}
                    onChange={event =>
                      setFilters(prev => ({
                        ...prev,
                        category: event.target.value as ItemCategory,
                      }))
                    }
                  >
                    <option value="ALL">Todas las categorías</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex justify-end">
                  <SBButton variant="ghost" size="sm" onClick={resetFilters}>
                    Limpiar filtros
                  </SBButton>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredPlans.length === 0 ? (
                  <div className="col-span-full sb-glass rounded-2xl border border-border/40 p-10 text-center text-sm text-muted-foreground">
                    No se encontraron planes con los filtros aplicados.
                  </div>
                ) : (
                  filteredPlans.map(({ plan, createdAt, updatedAt, itemsCoverage, categoriesCoverage }) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanClick(plan)}
                      className="text-left sb-card-glass-light border border-border/40 p-5 hover-raise transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Código {plan.code ?? "sin código"} ·{" "}
                            {plan.triggerOn ? triggerLabels[plan.triggerOn] : "Sin disparador"}
                          </p>
                        </div>
                        <span className={`sb-badge ${statusTone[plan.active ? "active" : "inactive"]}`}>
                          {plan.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <MetricChip icon={Layers} label="Parámetros" value={plan.parameters?.length ?? 0} />
                        <MetricChip
                          icon={ShieldCheck}
                          label="Obligatorio"
                          value={plan.requiredForRelease ? "Sí" : "No"}
                          tone={plan.requiredForRelease ? "text-success" : "text-muted-foreground"}
                        />
                        <MetricChip
                          icon={Activity}
                          label="Auto-aprueba"
                          value={plan.autoApproveRules?.enabled ? "Sí" : "No"}
                          tone={plan.autoApproveRules?.enabled ? "text-primary" : "text-muted-foreground"}
                        />
                        <MetricChip
                          icon={Sparkles}
                          label="Cobertura"
                          value={`${itemsCoverage} SKU · ${categoriesCoverage} cat.`}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span>
                          Creado:{" "}
                          {createdAt
                            ? createdAt.toLocaleDateString("es-ES", { dateStyle: "medium" })
                            : "—"}
                        </span>
                        <span className="text-right">
                          Actualizado:{" "}
                          {updatedAt
                            ? updatedAt.toLocaleDateString("es-ES", { dateStyle: "medium" })
                            : "—"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <GeminiAlertsCard alerts={predictiveAlerts} />
              <div className="sb-card-glass-light border border-border/40 p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Cobertura SKUs</p>
                <p className="text-xs">
                  {plans.reduce((acc, plan) => acc + (plan.appliesToItems?.length ?? 0), 0)} asignaciones
                  · {items.length} ítems en catálogo.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <QcPlanEditorDrawer
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onCompleted={() => {
          setIsEditorOpen(false);
          handleRefresh();
        }}
        items={items}
        categoryOptions={categoryOptions}
      />

      {selectedPlan && (
        <QcPlanDrawer
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onUpdated={() => {
            setSelectedPlan(null);
            handleRefresh();
          }}
        />
      )}
    </>
  );
}

function PlanStatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "info" | "success" | "warning" | "destructive";
  icon: LucideIcon;
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: "border-border/40",
    info: "border-info/30",
    success: "border-success/30",
    warning: "border-warning/30",
    destructive: "border-destructive/30",
  };
  const iconTone: Record<typeof tone, string> = {
    default: "text-muted-foreground",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  return (
    <div className={`sb-card-glass-light p-5 border ${toneClasses[tone]} space-y-2`}>
      <div className={`inline-flex items-center justify-center rounded-lg bg-background/70 border border-border/40 p-2 ${iconTone[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
      <div className="p-1 rounded-md bg-secondary text-muted-foreground">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold text-foreground ${tone ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}
