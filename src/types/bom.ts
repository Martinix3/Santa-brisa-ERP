/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/types/bom.ts
// Tipos extendidos para el módulo de Bill of Materials (BOM)

import { Uom, BillOfMaterial, Item } from '@/domain/ssot';

/**
 * BOM extendido con KPIs calculados para la UI
 */
export interface BomWithKPIs extends BillOfMaterial {
  // Campos base (los que ahora te faltan en UI)
  id: string;
  name: string;
  stage?: 'PRODUCCION' | 'ENVASADO';
  baseUnit: Uom;
  batchSize: number;
  
  // KPIs calculados server-side
  totalCost?: number;
  costPerUnit?: number;
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
  lastUsed?: string;
  usageCount?: number;
  
  // Datos enriquecidos
  outputItemName?: string;
  outputItemSku?: string;
  
  // Validaciones
  stockOk?: boolean;
  balanceOk?: boolean;
  itemsCount?: number;
}

/**
 * Filtros para búsqueda y filtrado de BOMs
 */
export interface BomFilters {
  search: string;
  stage?: 'PRODUCCION' | 'ENVASADO' | 'ALL';
  outputCategory?: 'intermediate' | 'fg' | 'ALL';
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ALL';
}

/**
 * KPIs globales de BOMs
 */
export interface BomKPIs {
  total: number;
  produccion: number;
  envasado: number;
  avgComplexity: number;
  totalRecipes: number;
  recentlyUsed: number;
}

/**
 * Línea de componente con datos enriquecidos
 */
export interface BomLineWithDetails {
  sku: string;
  /** @deprecated usa sku */ itemId?: string;
  itemName: string;
  qty: number;
  uom: Uom;
  role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY';
  available?: number;
  stockOk?: boolean;
}

/**
 * Configuración de filtros para DataToolbar
 */
export const BOM_FILTER_CONFIG = {
  searchPlaceholder: 'Buscar por nombre, producto o SKU...',
  filters: [
    {
      key: 'stage' as const,
      label: 'Etapa',
      options: [
        { value: 'ALL', label: 'Todas' },
        { value: 'PRODUCCION', label: 'Producción' },
        { value: 'ENVASADO', label: 'Envasado' },
      ],
    },
    {
      key: 'outputCategory' as const,
      label: 'Categoría',
      options: [
        { value: 'ALL', label: 'Todas' },
        { value: 'intermediate', label: 'Intermedios' },
        { value: 'fg', label: 'Productos Finales' },
      ],
    },
  ],
};
