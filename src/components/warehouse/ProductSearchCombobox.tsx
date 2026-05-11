"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Package, AlertCircle, ChevronDown } from "lucide-react";
import Fuse from "fuse.js";
import { warehouseES } from "@/i18n/warehouse.es";
import { CategoryBadge } from "./CategorySelector";
import type { GoodsReceiptCategory } from "@/domain/ssot";

// Product type (simplified for warehouse operations)
export interface WarehouseProduct {
  id: string;
  sku: string;
  name: string;
  category: GoodsReceiptCategory;
  stock: number;
  unit: string;
  price?: number;
  reorderPoint?: number;
  imageUrl?: string;
}

interface ProductSearchComboboxProps {
  products: WarehouseProduct[];
  value?: WarehouseProduct | null;
  onChange: (product: WarehouseProduct | null) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function ProductSearchCombobox({
  products,
  value,
  onChange,
  disabled = false,
  error,
  placeholder = warehouseES.goodsReceipt.searchProduct,
  label = warehouseES.goodsReceipt.product,
  required = false,
}: ProductSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: [
          { name: "name", weight: 0.6 },
          { name: "sku", weight: 0.4 },
        ],
        threshold: 0.3, // 0 = exact match, 1 = match anything
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [products]
  );

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return products.slice(0, 8); // Show first 8 products when no query
    }

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item).slice(0, 8); // Max 8 results
  }, [searchQuery, fuse, products]);

  // Handle product selection
  const handleSelect = useCallback(
    (product: WarehouseProduct) => {
      onChange(product);
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
      if (!target.closest("[data-combobox]")) {
        setIsOpen(false);
        if (!value) {
          setSearchQuery("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Stock status helper
  const getStockStatus = (product: WarehouseProduct) => {
    if (product.stock === 0) return { text: "Sin stock", color: "text-destructive" };
    if (product.reorderPoint && product.stock <= product.reorderPoint) {
      return { text: "Stock bajo", color: "text-warning" };
    }
    return { text: "En stock", color: "text-success" };
  };

  return (
    <div className="space-y-2" data-combobox>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Selected Product Display */}
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
                  <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {value.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    SKU: {value.sku}
                  </span>
                  <CategoryBadge category={value.category} size="sm" />
                  <span className={`font-medium ${getStockStatus(value).color}`}>
                    {value.stock} {value.unit}
                  </span>
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
                  {searchResults.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelect(product)}
                        className="w-full p-3 rounded-lg text-left transition-colors
                                 hover:bg-muted/50
                                 focus:outline-none focus:bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Icon/Image */}
                          <div
                            className="w-12 h-12 rounded-lg bg-muted 
                                     flex items-center justify-center flex-shrink-0"
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground mb-1 truncate">
                              {product.name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-muted-foreground">
                                SKU: {product.sku}
                              </span>
                              <CategoryBadge category={product.category} size="sm" />
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className={`font-medium ${stockStatus.color}`}>
                                {product.stock} {product.unit}
                              </span>
                              <span className="text-muted-foreground">
                                {stockStatus.text}
                              </span>
                              {product.price && (
                                <span className="text-foreground font-medium">
                                  {product.price.toFixed(2)}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {searchQuery
                      ? warehouseES.goodsReceipt.noProductsFound
                      : warehouseES.goodsReceipt.noProducts}
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
          {warehouseES.goodsReceipt.searchProductHelper}
        </p>
      )}
    </div>
  );
}

// Export helper for getting products (mock for now, replace with actual API)
export async function getWarehouseProducts(): Promise<WarehouseProduct[]> {
  // TODO: Replace with actual API call
  // This is a mock implementation
  return [];
}
