/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/orders/OrderAdvancedFilters.tsx
import { useState, useEffect } from 'react';
import { type OrderSellOut, type OrderStatus } from '@/domain/ssot';

interface FilterState {
  // Status and basic filters
  status: OrderStatus[];
  source: string[];
  channel: string[];

  // Date ranges
  dateRange: {
    field: 'createdAt' | 'orderDate' | 'updatedAt';
    from?: string;
    to?: string;
  };

  // Amount filters
  amountRange: {
    min?: number;
    max?: number;
  };

  // Customer filters
  customerVat?: string;
  customerName?: string;

  // Commercial filters
  ownerId: string[];
  distributorPartyId: string[];

  // Completeness filters
  completenessLevel: ('CRITICAL' | 'WARNING' | 'GOOD' | 'EXCELLENT')[];
  missingFields: string[];

  // Advanced filters
  hasNotes: boolean | null;
  hasPromotions: boolean | null;
  syncStatus: ('synced' | 'pending' | 'error' | 'never')[];

  // Text search
  searchText?: string;
  searchFields: ('docNumber' | 'customerName' | 'notes')[];
}

const DEFAULT_FILTERS: FilterState = {
  status: [],
  source: [],
  channel: [],
  dateRange: { field: 'createdAt' },
  amountRange: {},
  ownerId: [],
  distributorPartyId: [],
  completenessLevel: [],
  missingFields: [],
  hasNotes: null,
  hasPromotions: null,
  syncStatus: [],
  searchFields: ['docNumber', 'customerName']
};

// Apply filters to orders
const applyFilters = (orders: OrderSellOut[], filterState: FilterState): OrderSellOut[] => {
  return orders.filter(order => {
    // Status filter
    if (filterState.status.length > 0 && !filterState.status.includes(order.status)) {
      return false;
    }

    // Source filter
    if (filterState.source.length > 0 && (!order.source || !filterState.source.includes(order.source))) {
      return false;
    }

    // Channel filter
    if (filterState.channel.length > 0 && (!order.channel || !filterState.channel.includes(order.channel))) {
      return false;
    }

    // Date range filter
    if (filterState.dateRange.from || filterState.dateRange.to) {
      const dateValue = order[filterState.dateRange.field];
      if (!dateValue) return false;

      const orderDate = new Date(dateValue);
      if (filterState.dateRange.from && orderDate < new Date(filterState.dateRange.from)) {
        return false;
      }
      if (filterState.dateRange.to && orderDate > new Date(filterState.dateRange.to)) {
        return false;
      }
    }

    // Amount range filter
    if (filterState.amountRange.min !== undefined && (!order.totalAmount || order.totalAmount < filterState.amountRange.min)) {
      return false;
    }
    if (filterState.amountRange.max !== undefined && (!order.totalAmount || order.totalAmount > filterState.amountRange.max)) {
      return false;
    }

    // Customer filters
    if (filterState.customerVat && (!order.customerVat || !order.customerVat.toLowerCase().includes(filterState.customerVat.toLowerCase()))) {
      return false;
    }
    if (filterState.customerName && (!order.customerName || !order.customerName.toLowerCase().includes(filterState.customerName.toLowerCase()))) {
      return false;
    }

    // Owner filter
    if (filterState.ownerId.length > 0 && (!order.ownerId || !filterState.ownerId.includes(order.ownerId))) {
      return false;
    }

    // Distributor filter
    if (filterState.distributorPartyId.length > 0 && (!order.distributorPartyId || !filterState.distributorPartyId.includes(order.distributorPartyId))) {
      return false;
    }

    // Notes filter
    if (filterState.hasNotes === true && (!order.notes || order.notes.trim() === '')) {
      return false;
    }
    if (filterState.hasNotes === false && order.notes && order.notes.trim() !== '') {
      return false;
    }

    // Promotions filter
    if (filterState.hasPromotions === true && (!order.linkedPromotions || order.linkedPromotions.length === 0)) {
      return false;
    }
    if (filterState.hasPromotions === false && order.linkedPromotions && order.linkedPromotions.length > 0) {
      return false;
    }

    // Sync status filter
    if (filterState.syncStatus.length > 0) {
      let syncStatus: string;
      if (order.syncError) {
        syncStatus = 'error';
      } else if (order.syncedToHolded) {
        syncStatus = 'synced';
      } else if (order.holdedOrderId) {
        syncStatus = 'pending';
      } else {
        syncStatus = 'never';
      }

      if (!filterState.syncStatus.includes(syncStatus as any)) {
        return false;
      }
    }

    // Text search
    if (filterState.searchText && filterState.searchText.trim() !== '') {
      const searchTerm = filterState.searchText.toLowerCase();
      const matchesSearch = filterState.searchFields.some(field => {
        const fieldValue = order[field];
        return fieldValue && String(fieldValue).toLowerCase().includes(searchTerm);
      });

      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
};

interface OrderAdvancedFiltersProps {
  orders: OrderSellOut[];
  onFiltersChange: (filteredOrders: OrderSellOut[]) => void;
  onFilterStateChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  showCompactView?: boolean;
}

export function OrderAdvancedFilters({
  orders,
  onFiltersChange,
  onFilterStateChange,
  initialFilters = {},
  showCompactView = false
}: OrderAdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  const [isExpanded, setIsExpanded] = useState(!showCompactView);

  // Extract unique values for dropdowns
  const uniqueValues = {
    sources: [...new Set(orders.map(o => o.source).filter(Boolean))],
    channels: [...new Set(orders.map(o => o.channel).filter(Boolean))],
    owners: [...new Set(orders.map(o => o.ownerId).filter(Boolean))],
    distributors: [...new Set(orders.map(o => o.distributorPartyId).filter(Boolean))]
  };



  // Update filters and apply them
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    const filteredOrders = applyFilters(orders, updatedFilters);
    onFiltersChange(filteredOrders);
    onFilterStateChange?.(updatedFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFiltersChange(orders);
    onFilterStateChange?.(DEFAULT_FILTERS);
  };

  // Count active filters
  const activeFiltersCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'searchFields') return count; // Don't count searchFields

    if (Array.isArray(value)) {
      return count + (value.length > 0 ? 1 : 0);
    }
    if (typeof value === 'object' && value !== null) {
      const hasValues = Object.values(value).some(v => v !== undefined && v !== null && v !== '');
      return count + (hasValues ? 1 : 0);
    }
    if (typeof value === 'string') {
      return count + (value.trim() !== '' ? 1 : 0);
    }
    if (typeof value === 'boolean') {
      return count + 1;
    }
    return count;
  }, 0);

  // Apply filters when orders change
  useEffect(() => {
    const filteredOrders = applyFilters(orders, filters);
    onFiltersChange(filteredOrders);
  }, [orders, filters, onFiltersChange]);

  if (showCompactView && !isExpanded) {
    return (
      <div className="order-filters order-filters--compact">
        <div className="order-filters__compact-header">
          <button
            className="sb-btn sb-btn--ghost sb-btn--sm"
            onClick={() => setIsExpanded(true)}
          >
            🔍 Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>

          {activeFiltersCount > 0 && (
            <button
              className="sb-btn sb-btn--ghost sb-btn--xs"
              onClick={resetFilters}
              title="Limpiar filtros"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="order-filters">
      <div className="order-filters__header">
        <h3 className="order-filters__title">
          Filtros Avanzados
          {activeFiltersCount > 0 && (
            <span className="order-filters__count">({activeFiltersCount} activos)</span>
          )}
        </h3>

        <div className="order-filters__actions">
          {activeFiltersCount > 0 && (
            <button
              className="sb-btn sb-btn--ghost sb-btn--sm"
              onClick={resetFilters}
            >
              Limpiar todo
            </button>
          )}

          {showCompactView && (
            <button
              className="sb-btn sb-btn--ghost sb-btn--sm"
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="order-filters__content">
        {/* Search */}
        <div className="order-filters__section">
          <label className="order-filters__label">Búsqueda</label>
          <input
            type="text"
            className="sb-input"
            placeholder="Buscar pedidos..."
            value={filters.searchText || ''}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
          />
        </div>

        {/* Status Filter */}
        <div className="order-filters__section">
          <label className="order-filters__label">Estado</label>
          <div className="order-filters__checkboxes">
            {(['open', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled', 'lost'] as OrderStatus[]).map(status => (
              <label key={status} className="order-filters__checkbox">
                <input
                  type="checkbox"
                  checked={filters.status.includes(status)}
                  onChange={(e) => {
                    const newStatus = e.target.checked
                      ? [...filters.status, status]
                      : filters.status.filter(s => s !== status);
                    updateFilters({ status: newStatus });
                  }}
                />
                {status}
              </label>
            ))}
          </div>
        </div>

        {/* Amount Range */}
        <div className="order-filters__section">
          <label className="order-filters__label">Importe</label>
          <div className="order-filters__range">
            <input
              type="number"
              className="sb-input sb-input--sm"
              placeholder="Mín"
              value={filters.amountRange.min || ''}
              onChange={(e) => updateFilters({
                amountRange: {
                  ...filters.amountRange,
                  min: e.target.value ? Number(e.target.value) : undefined
                }
              })}
            />
            <span>-</span>
            <input
              type="number"
              className="sb-input sb-input--sm"
              placeholder="Máx"
              value={filters.amountRange.max || ''}
              onChange={(e) => updateFilters({
                amountRange: {
                  ...filters.amountRange,
                  max: e.target.value ? Number(e.target.value) : undefined
                }
              })}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="order-filters__section">
          <label className="order-filters__label">Fechas</label>
          <div className="order-filters__date-range">
            <select
              className="sb-select sb-select--sm"
              value={filters.dateRange.field}
              onChange={(e) => updateFilters({
                dateRange: {
                  ...filters.dateRange,
                  field: e.target.value as any
                }
              })}
            >
              <option value="createdAt">Fecha creación</option>
              <option value="orderDate">Fecha pedido</option>
              <option value="updatedAt">Última actualización</option>
            </select>
            <input
              type="date"
              className="sb-input sb-input--sm"
              value={filters.dateRange.from || ''}
              onChange={(e) => updateFilters({
                dateRange: {
                  ...filters.dateRange,
                  from: e.target.value
                }
              })}
            />
            <input
              type="date"
              className="sb-input sb-input--sm"
              value={filters.dateRange.to || ''}
              onChange={(e) => updateFilters({
                dateRange: {
                  ...filters.dateRange,
                  to: e.target.value
                }
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the FilterState type for use in other components
export type { FilterState };
