/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface FilterConfig<T> {
  searchFields: (keyof T)[];
  filters: Record<string, (item: T, value: any) => boolean>;
}

export function useDataFilters<T>(
  data: T[],
  config: FilterConfig<T>
) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return data.filter((item: any) => {
      // Search matching
      const matchesSearch = !debouncedSearch || 
        config.searchFields.some(field => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(debouncedSearch.toLowerCase());
        });

      // Filters matching
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value || value === 'all') return true;
        const filterFn = config.filters[key];
        if (!filterFn) return true;
        return filterFn(item, value);
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, debouncedSearch, filters, config]);

  return {
    filtered,
    search,
    setSearch,
    filters,
    setFilter: (key: string, value: any) => 
      setFilters(prev => ({ ...prev, [key]: value })),
    resetFilters: () => {
      setSearch('');
      setFilters({});
    }
  };
}
