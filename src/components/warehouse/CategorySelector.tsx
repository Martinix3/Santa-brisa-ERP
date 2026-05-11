"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from "react";
import { Package, ShoppingBag, Wheat, Settings, Box } from "lucide-react";
import { warehouseES } from "@/i18n/warehouse.es";

type CategoryVariant = "success" | "info" | "warning" | "accent" | "muted";

interface CategoryConfig {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  variant: CategoryVariant;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  finalGood: {
    icon: Package,
    label: warehouseES.goodsReceipt.categories.finalGood,
    variant: "success",
  },
  merchandise: {
    icon: ShoppingBag,
    label: warehouseES.goodsReceipt.categories.merchandise,
    variant: "info",
  },
  raw: {
    icon: Wheat,
    label: warehouseES.goodsReceipt.categories.raw,
    variant: "warning",
  },
  intermediate: {
    icon: Settings,
    label: warehouseES.goodsReceipt.categories.intermediate,
    variant: "accent",
  },
  packaging: {
    icon: Box,
    label: warehouseES.goodsReceipt.categories.packaging,
    variant: "muted",
  },
} as const;

export type ProductCategory = keyof typeof CATEGORY_CONFIG;

// Helper function to get variant classes
function getVariantClasses(variant: CategoryVariant, isSelected: boolean) {
  const baseClasses = {
    success: {
      text: "text-success",
      bg: "bg-success/10 dark:bg-success/5",
      border: "border-success",
      hover: "hover:bg-success/20",
    },
    info: {
      text: "text-info",
      bg: "bg-info/10 dark:bg-info/5",
      border: "border-info",
      hover: "hover:bg-info/20",
    },
    warning: {
      text: "text-warning",
      bg: "bg-warning/10 dark:bg-warning/5",
      border: "border-warning",
      hover: "hover:bg-warning/20",
    },
    accent: {
      text: "text-accent",
      bg: "bg-accent/10 dark:bg-accent/5",
      border: "border-accent",
      hover: "hover:bg-accent/20",
    },
    muted: {
      text: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-border",
      hover: "hover:bg-muted",
    },
  };

  const classes = baseClasses[variant];
  
  return {
    text: isSelected ? classes.text : "text-foreground",
    bg: isSelected ? classes.bg : "bg-background",
    border: isSelected ? classes.border : "border-border",
    hover: classes.hover,
  };
}

interface CategorySelectorProps {
  value: ProductCategory | null;
  onChange: (category: ProductCategory) => void;
  error?: string;
  className?: string;
}

/**
 * CategorySelector Component
 * 
 * Selector visual de categorías de productos optimizado para móvil.
 * 
 * Features:
 * - Iconos visuales para cada categoría
 * - Touch targets grandes (min 44x44px)
 * - Grid responsive (2 cols mobile, 3 cols tablet+)
 * - Visual feedback al seleccionar
 * - Soporte para errores de validación
 * - Usa tokens.css para colores
 * 
 * @example
 * ```tsx
 * <CategorySelector
 *   value={selectedCategory}
 *   onChange={(cat) => setSelectedCategory(cat)}
 *   error={errors.category}
 * />
 * ```
 */
export function CategorySelector({
  value,
  onChange,
  error,
  className = "",
}: CategorySelectorProps) {
  return (
    <div className={className}>
      {/* Label */}
      <label className="block text-sm font-medium text-foreground mb-2">
        {warehouseES.goodsReceipt.category}
        <span className="text-destructive ml-1">*</span>
      </label>

      {/* Hint */}
      <p className="text-xs text-muted-foreground mb-3">
        {warehouseES.goodsReceipt.tips.category}
      </p>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.keys(CATEGORY_CONFIG) as ProductCategory[]).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isSelected = value === category;
          const variantClasses = getVariantClasses(config.variant, isSelected);

          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[88px] p-4 rounded-lg
                border-2 transition-all duration-200
                ${variantClasses.text}
                ${variantClasses.bg}
                ${variantClasses.border}
                ${variantClasses.hover}
                hover:shadow-md hover:-translate-y-0.5
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${isSelected ? "shadow-md scale-105" : ""}
              `}
              aria-pressed={isSelected}
              aria-label={config.label}
            >
              {/* Icono */}
              <Icon
                size={32}
                className={`mb-2 transition-transform ${
                  isSelected ? "scale-110" : ""
                }`}
                strokeWidth={isSelected ? 2.5 : 2}
              />

              {/* Label */}
              <span
                className={`text-xs font-medium text-center leading-tight ${
                  isSelected ? "font-semibold" : ""
                }`}
              >
                {config.label}
              </span>

              {/* Checkmark cuando seleccionado */}
              {isSelected && (
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${variantClasses.bg}`}
                >
                  <svg
                    className={`w-3 h-3 ${variantClasses.text}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-destructive flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Helper: Get category config
 */
export function getCategoryConfig(category: ProductCategory) {
  return CATEGORY_CONFIG[category];
}

/**
 * Helper: Get category icon component
 */
export function getCategoryIcon(category: ProductCategory) {
  return CATEGORY_CONFIG[category].icon;
}

/**
 * Helper: Get category label
 */
export function getCategoryLabel(category: ProductCategory) {
  return CATEGORY_CONFIG[category].label;
}

/**
 * CategoryBadge Component
 * 
 * Badge pequeño para mostrar categoría en listas/cards
 * 
 * @example
 * ```tsx
 * <CategoryBadge category="raw" size="sm" />
 * ```
 */
interface CategoryBadgeProps {
  category: ProductCategory;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  size = "md",
  showIcon = true,
  className = "",
}: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  
  // Safety check: if category doesn't exist in config, return null or default badge
  if (!config) {
    console.warn(`CategoryBadge: Unknown category "${category}"`);
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium
          px-3 py-1.5 text-sm
          text-muted-foreground bg-muted/50
          ${className}
        `}
      >
        {category}
      </span>
    );
  }
  
  const Icon = config.icon;
  const variantClasses = getVariantClasses(config.variant, true);

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses.text}
        ${variantClasses.bg}
        ${className}
      `}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
