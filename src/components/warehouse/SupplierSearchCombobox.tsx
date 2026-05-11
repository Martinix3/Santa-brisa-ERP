"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Building2, AlertCircle } from "lucide-react";
import Fuse from "fuse.js";
import { warehouseES } from "@/i18n/warehouse.es";

// Supplier type (simplified for warehouse operations)
export interface WarehouseSupplier {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  rating?: number; // 1-5 stars
  totalOrders?: number;
}

interface SupplierSearchComboboxProps {
  suppliers: WarehouseSupplier[];
  value?: WarehouseSupplier | null;
  onChange: (supplier: WarehouseSupplier | null) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function SupplierSearchCombobox({
  suppliers,
  value,
  onChange,
  disabled = false,
  error,
  placeholder = warehouseES.goodsReceipt.supplierSearch,
  label = warehouseES.goodsReceipt.supplier,
  required = false,
}: SupplierSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(suppliers, {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "taxId", weight: 0.3 },
        ],
        threshold: 0.3,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [suppliers]
  );

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return suppliers.slice(0, 8); // Show first 8 suppliers when no query
    }

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item).slice(0, 8);
  }, [searchQuery, fuse, suppliers]);

  // Handle supplier selection
  const handleSelect = useCallback(
    (supplier: WarehouseSupplier) => {
      onChange(supplier);
      setSearchQuery("");
      setIsOpen(false);
    },
    [onChange]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isOpen && e.target.value.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle clear selection
  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-supplier-combobox]")) {
        setIsOpen(false);
        if (!value) {
          setSearchQuery("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Rating stars display
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              star <= rating ? "text-warning" : "text-muted-foreground"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2" data-supplier-combobox>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Selected Supplier Display */}
      {value && !isOpen && (
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(true)}
            disabled={disabled}
            className="w-full p-3 rounded-lg border-2 border-border 
                     bg-background text-left transition-all
                     hover:border-primary
                     focus:outline-none focus:ring-2 focus:ring-primary
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {value.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {value.taxId && (
                    <span className="text-muted-foreground">
                      CIF: {value.taxId}
                    </span>
                  )}
                  {value.rating && renderStars(value.rating)}
                  {value.totalOrders && (
                    <span className="text-muted-foreground">
                      {value.totalOrders} pedidos
                    </span>
                  )}
                </div>
              </div>
              {!disabled && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-muted-foreground hover:text-foreground 
                           p-1 rounded transition-colors cursor-pointer"
                >
                  ✕
                </div>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Search Input */}
      {(!value || isOpen) && (
        <div className="relative">
          <div
            className={`relative rounded-lg border-2 transition-all ${
              isFocused
                ? "border-primary ring-2 ring-primary/20"
                : error
                  ? "border-destructive"
                  : "border-border"
            }`}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => {
                setIsFocused(true);
                setIsOpen(true);
              }}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full h-12 pl-10 pr-10 rounded-lg bg-background
                       text-foreground placeholder:text-muted-foreground
                       focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                         text-muted-foreground hover:text-foreground
                         p-1 rounded transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {isOpen && !disabled && (
            <div
              className="absolute z-50 w-full mt-2 sb-card-glass-light
                       rounded-lg shadow-xl border border-border/50
                       max-h-[400px] overflow-y-auto backdrop-blur-md"
            >
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => handleSelect(supplier)}
                      className="w-full p-3 rounded-lg text-left transition-colors
                               hover:bg-muted
                               focus:outline-none focus:bg-muted"
                    >
                      <div className="flex items-start gap-3">
                        {/* Supplier Icon */}
                        <div
                          className="w-12 h-12 rounded-lg bg-primary/10 
                                   flex items-center justify-center flex-shrink-0"
                        >
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>

                        {/* Supplier Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground mb-1 truncate">
                            {supplier.name}
                          </div>
                          
                          {/* Secondary info */}
                          <div className="space-y-1">
                            {supplier.taxId && (
                              <div className="text-xs text-muted-foreground">
                                CIF: {supplier.taxId}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              {supplier.rating && renderStars(supplier.rating)}
                              {supplier.totalOrders !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {supplier.totalOrders} pedidos
                                </span>
                              )}
                            </div>
                            
                            {supplier.phone && (
                              <div className="text-xs text-muted-foreground">
                                {supplier.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {searchQuery
                      ? "No se encontraron proveedores"
                      : "No hay proveedores disponibles"}
                  </p>
                  {searchQuery && (
                    <p className="text-sm mt-1">
                      Intenta buscar con otro término
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper Text */}
      {!error && !value && (
        <p className="text-sm text-muted-foreground">
          Busca por nombre o CIF del proveedor
        </p>
      )}
    </div>
  );
}

// Export helper for getting suppliers (mock for now, replace with actual API)
export async function getWarehouseSuppliers(): Promise<WarehouseSupplier[]> {
  // TODO: Replace with actual API call
  // This is a mock implementation
  return [];
}
