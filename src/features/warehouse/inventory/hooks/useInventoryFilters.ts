/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/warehouse/inventory/hooks/useInventoryFilters.ts
/**
 * Hook para gestionar filtros de inventario
 * Siguiendo convenciones SSOT
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { OnHandView, Item, QcStatus } from '@/domain/ssot';
import { isQcReleased, isQcHold, isQcFailed } from '@/domain/qc-status';

export type InventoryFilters = {
  globalSearch: string;
  locationId: string;
  qcStatus: string;
  onlyWithStock: boolean;
};

type UseInventoryFiltersOptions = {
  onHand: OnHandView[];
  items: Item[];
  debounceMs?: number; // Añadido: configurable debounce
};

type UseInventoryFiltersReturn = {
  filters: InventoryFilters;
  setFilters: React.Dispatch<React.SetStateAction<InventoryFilters>>;
  setGlobalSearch: (search: string) => void;
  setLocationFilter: (locationId: string) => void;
  setQcFilter: (qcStatus: string) => void;
  setOnlyWithStock: (only: boolean) => void;
  resetFilters: () => void;
  filteredOnHand: OnHandView[];
  totalRecords: number;
  filteredRecords: number;
  isSearching: boolean; // Nuevo: indica si está aplicando búsqueda
};

const DEFAULT_FILTERS: InventoryFilters = {
  globalSearch: '',
  locationId: 'ALL',
  qcStatus: 'ALL',
  onlyWithStock: true,
};

export function useInventoryFilters({
  onHand,
  items,
  debounceMs = 300, // Debounce por defecto de 300ms
}: UseInventoryFiltersOptions): UseInventoryFiltersReturn {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce para búsqueda global
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.globalSearch);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters.globalSearch, debounceMs]);

  // Crear mapa de items para lookup rápido (memoizado)
  const itemsBySku = useMemo(
    () => new Map(items.map(item => [item.sku, item])),
    [items]
  );

  // Aplicar filtros (ahora usa debouncedSearch)
  const filteredOnHand = useMemo(() => {
    let rows = onHand;

    // Filtrar por ubicación (SSOT V2: use locationId canonical, warehouseId is legacy)
    if (filters.locationId !== 'ALL') {
      rows = rows.filter(r => 
        (r.locationId || r.warehouseId) === filters.locationId
      );
    }

    // Filtrar por estado QC
    if (filters.qcStatus !== 'ALL') {
      rows = rows.filter(r => {
        const status = r.qcStatus || 'PENDING';
        
        if (filters.qcStatus === 'PASSED') {
          return isQcReleased(status);
        } else if (filters.qcStatus === 'PENDING') {
          return isQcHold(status);
        } else if (filters.qcStatus === 'FAILED') {
          return isQcFailed(status);
        }
        
        return status === filters.qcStatus;
      });
    }

    // Filtrar solo con stock (compatible con SSOT V2 buckets y legacy)
    if (filters.onlyWithStock) {
      rows = rows.filter(r => {
        // Calcular qty total (manejar buckets SSOT v2 y legacy)
        let totalQty: number;
        let releasedQty: number;
        
        if (typeof r.qty === 'object' && r.qty !== null) {
          // SSOT v2: qty = { RELEASED, HOLD, REJECTED }
          const qtyBuckets = r.qty as any;
          releasedQty = qtyBuckets.RELEASED || 0;
          totalQty = (qtyBuckets.RELEASED || 0) + (qtyBuckets.HOLD || 0) + (qtyBuckets.REJECTED || 0);
        } else {
          // Legacy: qty as number
          totalQty = Number(r.qty) || 0;
          releasedQty = totalQty;
        }
        
        // Calcular reservas (manejar buckets SSOT v2 y legacy)
        let reservedQty: number;
        if (typeof r.reservedQty === 'object' && r.reservedQty !== null) {
          reservedQty = (r.reservedQty as any).RELEASED || 0;
        } else {
          reservedQty = Number(r.reservedQty ?? r.reserved ?? 0);
        }
        
        // Stock disponible = qty total - reservado (o RELEASED - reservado para SSOT v2)
        const availableQty = releasedQty - reservedQty;
        
        return availableQty > 0;
      });
    }

    // Búsqueda global con debounce
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.trim().toLowerCase();
      
      rows = rows.filter(r => {
        // Buscar en SKU (legacy y canónico via itemId)
        if (r.sku?.toLowerCase().includes(query)) return true;
        
        // Buscar en itemId (canónico SSOT v2)
        if (r.itemId?.toLowerCase().includes(query)) return true;
        
        // Buscar en lotCode (SSOT v2: campo canónico)
        if (r.lotCode?.toLowerCase().includes(query)) return true;
        
        // Buscar en lotNumbers object (legacy - deprecar)
        if (r.lotNumbers) {
          const lotMatches = Object.keys(r.lotNumbers).some(ln => 
            ln.toLowerCase().includes(query)
          );
          if (lotMatches) return true;
        }
        
        // Buscar en nombre del item (SSOT V2: prioritize itemId lookup)
        const item = (r.itemId ? items.find(it => it.id === r.itemId) : undefined) || (r.sku ? itemsBySku.get(r.sku) : undefined);
        if (item?.name?.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }

    return rows;
  }, [onHand, filters, debouncedSearch, itemsBySku]);

  // useCallback para evitar re-creaciones innecesarias
  const setGlobalSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, globalSearch: search }));
  }, []);

  const setLocationFilter = useCallback((locationId: string) => {
    setFilters(prev => ({ ...prev, locationId }));
  }, []);

  const setQcFilter = useCallback((qcStatus: string) => {
    setFilters(prev => ({ ...prev, qcStatus }));
  }, []);

  const setOnlyWithStock = useCallback((only: boolean) => {
    setFilters(prev => ({ ...prev, onlyWithStock: only }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setFilters,
    setGlobalSearch,
    setLocationFilter,
    setQcFilter,
    setOnlyWithStock,
    resetFilters,
    filteredOnHand,
    totalRecords: onHand.length,
    filteredRecords: filteredOnHand.length,
    isSearching,
  };
}
