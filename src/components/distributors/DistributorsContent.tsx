"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useMemo } from "react";
import { Building2, Users, Euro, CheckCircle2, AlertCircle } from "lucide-react";
import { DistributorWithKPIs } from "@/types/distributors";
import { useDataFilters, type FilterConfig } from "@/hooks/useDataFilters";
import { DataToolbar, type FilterOption } from "@/components/shared/DataToolbar";
import { DistributorCard } from "./DistributorCard";

interface DistributorsContentProps {
  initialDistributors: DistributorWithKPIs[];
}

type DistributorTab = "todos" | "activos" | "inactivos";

export function DistributorsContent({ initialDistributors }: DistributorsContentProps) {
  const [activeTab, setActiveTab] = useState<DistributorTab>("todos");

  // Filter configuration for useDataFilters
  const filterConfig: FilterConfig<DistributorWithKPIs> = {
    searchFields: ["name", "id"],
    filters: {},
  };

  const { filtered, search, setSearch, resetFilters } =
    useDataFilters(initialDistributors, filterConfig);

  // Filter by tab (status)
  const tabFilteredDistributors = useMemo(() => {
    let distributors = filtered;

    if (activeTab === "activos") {
      distributors = distributors.filter((d: DistributorWithKPIs) => d.status === "ACTIVO");
    } else if (activeTab === "inactivos") {
      distributors = distributors.filter((d: DistributorWithKPIs) => d.status === "INACTIVO");
    }

    return distributors;
  }, [filtered, activeTab]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const distributors = tabFilteredDistributors;

    const totalDistributors = distributors.length;
    const activeDistributors = distributors.filter(
      (d: DistributorWithKPIs) => d.status === "ACTIVO"
    ).length;
    const totalAccounts = distributors.reduce(
      (sum: number, d: DistributorWithKPIs) => sum + d.totalAccounts,
      0
    );
    const totalVolume = distributors.reduce(
      (sum: number, d: DistributorWithKPIs) => sum + d.totalSellIn,
      0
    );

    return {
      total: totalDistributors,
      active: activeDistributors,
      accounts: totalAccounts,
      volume: totalVolume,
    };
  }, [tabFilteredDistributors]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="sb-tabs">
        <button
          className={activeTab === "todos" ? "active" : ""}
          onClick={() => setActiveTab("todos")}
        >
          <Building2 className="w-4 h-4" />
          Todos
          <span className="sb-badge">{initialDistributors.length}</span>
        </button>
        <button
          className={activeTab === "activos" ? "active" : ""}
          onClick={() => setActiveTab("activos")}
        >
          <CheckCircle2 className="w-4 h-4" />
          Activos
          <span className="sb-badge">
            {initialDistributors.filter((d) => d.status === "ACTIVO").length}
          </span>
        </button>
        <button
          className={activeTab === "inactivos" ? "active" : ""}
          onClick={() => setActiveTab("inactivos")}
        >
          <AlertCircle className="w-4 h-4" />
          Inactivos
          <span className="sb-badge">
            {initialDistributors.filter((d) => d.status === "INACTIVO").length}
          </span>
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="sb-kpi">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Total Distribuidores
            </span>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {kpis.total}
          </div>
        </div>

        <div className="sb-kpi">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Activos
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.active}
          </div>
        </div>

        <div className="sb-kpi">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Total Cuentas
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {kpis.accounts}
          </div>
        </div>

        <div className="sb-kpi">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Volumen YTD
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(kpis.volume)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar distribuidor..."
        filters={[]}
        onReset={resetFilters}
      />

      {/* Distributors Grid */}
      {tabFilteredDistributors.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">
            No se encontraron distribuidores
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabFilteredDistributors.map((distributor: DistributorWithKPIs) => (
            <DistributorCard key={distributor.id} distributor={distributor} />
          ))}
        </div>
      )}
    </div>
  );
}
