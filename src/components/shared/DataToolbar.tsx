'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { Search, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export interface ActionButton {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
}

export interface DataToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterOption[];
  actions?: ActionButton[];
  onReset?: () => void;
  className?: string;
}

export function DataToolbar({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filters = [],
  actions = [],
  onReset,
  className = '',
}: DataToolbarProps) {
  const hasActiveFilters = searchValue || filters.some(f => f.value && f.value !== 'all');

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50",
      className
    )}>
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className="sb-input pl-10 pr-8"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters */}
      {filters.map((filter) => (
        <div key={filter.key} className="min-w-[150px]">
          <select
            className="sb-select"
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            <option value="all">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Reset Button */}
      {hasActiveFilters && onReset && (
        <button
          onClick={onReset}
          className="sb-btn sb-btn--ghost sb-btn--sm"
        >
          <X size={14} />
          Limpiar
        </button>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex gap-2 ml-auto">
          {actions.map((action, idx: number) => (
            <button
              key={idx}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`sb-btn ${
                action.variant === 'primary' ? 'sb-btn--primary' :
                action.variant === 'destructive' ? 'sb-btn--destructive' :
                action.variant === 'secondary' ? 'sb-btn--secondary' :
                'sb-btn--ghost'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
