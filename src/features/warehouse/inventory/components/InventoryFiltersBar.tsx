/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/warehouse/inventory/components/InventoryFiltersBar.tsx
'use client';

import React from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { Input, Select, SBButton } from '@/components/ui/ui-primitives';
import type { InventoryFilters } from '../hooks/useInventoryFilters';

type InventoryFiltersBarProps = {
  filters: InventoryFilters;
  onGlobalSearchChange: (search: string) => void;
  onLocationChange: (locationId: string) => void;
  onQcStatusChange: (qcStatus: string) => void;
  onOnlyWithStockChange: (only: boolean) => void;
  onResetFilters: () => void;
  locations: string[];
  totalRecords: number;
  filteredRecords: number;
  isSearching?: boolean; // Nuevo: indicador de búsqueda activa
};

export function InventoryFiltersBar({
  filters,
  onGlobalSearchChange,
  onLocationChange,
  onQcStatusChange,
  onOnlyWithStockChange,
  onResetFilters,
  locations,
  totalRecords,
  filteredRecords,
  isSearching = false,
}: InventoryFiltersBarProps) {
  const hasActiveFilters = 
    filters.globalSearch !== '' ||
    filters.locationId !== 'ALL' ||
    filters.qcStatus !== 'ALL' ||
    filters.onlyWithStock !== true;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda global */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          {isSearching ? (
            <Loader2 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" 
              size={16} 
            />
          ) : (
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
              size={16} 
            />
          )}
          <Input
            type="text"
            placeholder="Buscar por SKU, nombre o lote…"
            value={filters.globalSearch}
            onChange={e => onGlobalSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro de ubicación */}
        <Select
          className="w-[140px] text-sm"
          value={filters.locationId}
          onChange={e => onLocationChange(e.target.value)}
        >
          {locations.map(loc => (
            <option key={loc} value={loc}>
              {loc === 'ALL' ? 'Todas las ubicaciones' : loc}
            </option>
          ))}
        </Select>

        {/* Filtro de estado QC */}
        <Select
          className="w-[120px] text-sm"
          value={filters.qcStatus}
          onChange={e => onQcStatusChange(e.target.value)}
        >
          <option value="ALL">Todo QC</option>
          <option value="PASSED">Liberado</option>
          <option value="PENDING">Retenido</option>
          <option value="FAILED">Rechazado</option>
        </Select>

        {/* Checkbox solo con stock */}
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
          <input
            type="checkbox"
            className="accent-primary"
            checked={filters.onlyWithStock}
            onChange={e => onOnlyWithStockChange(e.target.checked)}
          />
          Con stock
        </label>

        {/* Botón de reset */}
        {hasActiveFilters && (
          <SBButton 
            variant="ghost" 
            size="sm" 
            onClick={onResetFilters}
            className="text-xs"
          >
            <Filter size={12} />
            Limpiar
          </SBButton>
        )}
        
        {/* Contador */}
        <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">{filteredRecords}</span>
          <span className="mx-1">/</span>
          <span className="font-semibold text-foreground">{totalRecords}</span>
        </div>
      </div>
    </div>
  );
}
