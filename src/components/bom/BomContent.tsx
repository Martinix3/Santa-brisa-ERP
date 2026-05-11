/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/bom/BomContent.tsx
"use client";

import React from "react";
import { Factory } from "lucide-react";
import { EmptyState } from "@/components/ui/ui-primitives";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { useDataFilters } from "@/hooks/useDataFilters";
import { BomCard } from "./BomCard";
import type { BomWithKPIs } from "@/types/bom";

interface BomContentProps {
  boms: BomWithKPIs[];
  onSelectBom: (bom: BomWithKPIs) => void;
  selectedBomId?: string;
  renderForm: () => React.ReactNode;
}

export function BomContent({
  boms,
  onSelectBom,
  selectedBomId,
  renderForm,
}: BomContentProps) {
  const {
    filtered: filteredData,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilter,
    resetFilters,
  } = useDataFilters(boms, {
    searchFields: ["name", "outputItemName", "outputItemSku"],
    filters: {
      stage: (bom: BomWithKPIs, value: string) => {
        if (value === "all") return true;
        return bom.stage === value;
      },
      outputCategory: (bom: BomWithKPIs, value: string) => {
        if (value === "all") return true;
        if (value === "intermediate") return bom.stage === "PRODUCCION";
        if (value === "fg") return bom.stage === "ENVASADO";
        return true;
      },
    },
  });

  const hasActiveFilters =
    searchTerm.length > 0 ||
    Object.values(filters).some((v: string | undefined) => v && v !== "all");

  return (
    <div className="space-y-4">
      <DataToolbar
        searchPlaceholder="Buscar por nombre o SKU…"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: "stage",
            label: "Etapa",
            value: filters.stage || "all",
            options: [
              { label: "Producción", value: "PRODUCCION" },
              { label: "Envasado", value: "ENVASADO" },
            ],
            onChange: (value: string) =>
              setFilter("stage", value === "all" ? "" : value),
          },
          {
            key: "outputCategory",
            label: "Categoría",
            value: filters.outputCategory || "all",
            options: [
              { label: "Intermedios", value: "intermediate" },
              { label: "Productos finales", value: "fg" },
            ],
            onChange: (value: string) =>
              setFilter("outputCategory", value === "all" ? "" : value),
          },
        ]}
        actions={[]}
        onReset={hasActiveFilters ? resetFilters : undefined}
        className="sb-card-glass-light hover-raise"
      />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="sb-card-glass-light hover-raise p-4 h-full">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recetas</h3>
            <p className="text-xs text-muted-foreground">
              {filteredData.length} resultados
            </p>
          </div>
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {filteredData.length === 0 ? (
              <EmptyState
                icon={Factory}
                title="No hay recetas"
                description={
                  hasActiveFilters
                    ? "Ajusta la búsqueda o los filtros para ver resultados."
                    : "Crea tu primera receta para empezar a planificar producción."
                }
              />
            ) : (
              filteredData.map((bom) => (
                <BomCard
                  key={bom.id}
                  bom={bom}
                  isSelected={bom.id === selectedBomId}
                  onClick={() => onSelectBom(bom)}
                />
              ))
            )}
          </div>
        </div>

        <div className="min-h-[420px]">
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
