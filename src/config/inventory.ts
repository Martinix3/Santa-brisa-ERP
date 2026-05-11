/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/config/inventory.ts
/**
 * Configuración centralizada del módulo de inventario
 * Siguiendo convenciones SSOT
 */

import type { Item } from '@/domain/ssot';

/**
 * Opciones de unidades de medida (UOM) disponibles
 */
export const UOM_OPTIONS = [
  { value: 'unit', label: 'Unidad' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Gramos' },
  { value: 'L', label: 'Litros' },
  { value: 'mL', label: 'mL' },
  { value: 'case', label: 'Caja' },
  { value: 'bottle', label: 'Botella' },
  { value: 'pallet', label: 'Palé' },
] as const;

/**
 * Categorías de items disponibles
 */
export const ITEM_CATEGORY_OPTIONS: Array<{ value: Item['category']; label: string }> = [
  { value: 'fg', label: 'Producto Terminado' },
  { value: 'raw', label: 'Materia Prima' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'pack', label: 'Packaging' },
  { value: 'label', label: 'Etiqueta' },
  { value: 'merch', label: 'Merchandising' },
  { value: 'consumable', label: 'Consumible' },
] as const;

/**
 * Ubicaciones de almacén por defecto
 */
export const DEFAULT_WAREHOUSE_LOCATIONS = [
  'ALMACEN_PRINCIPAL',
  'PRODUCCION',
  'CUARENTENA_QC',
  'EXPEDICIONES',
  'MERMAS',
] as const;

/**
 * Configuración de alertas de stock
 */
export const INVENTORY_ALERT_CONFIG = {
  /**
   * Días de antelación para alertar de caducidad próxima
   */
  nearExpiryDays: 45,
  
  /**
   * Días de inactividad en QC antes de considerar "stuck"
   */
  qcStuckDays: 14,
  
  /**
   * Stock mínimo por defecto (días de cobertura)
   */
  defaultMinStockDays: 30,
  
  /**
   * Stock de seguridad por defecto (días de cobertura)
   */
  defaultSafetyStockDays: 7,
} as const;

/**
 * Configuración de paginación y rendimiento
 */
export const INVENTORY_PERFORMANCE_CONFIG = {
  /**
   * Número de registros a mostrar por página
   */
  pageSize: 50,
  
  /**
   * Tamaño de batch para escrituras en Firestore
   */
  batchSize: 450,
  
  /**
   * Límite de registros para activar virtualización
   */
  virtualizationThreshold: 100,
} as const;

/**
 * Monedas soportadas
 */
export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
] as const;

/**
 * Obtiene el label de una categoría de item
 */
export function getItemCategoryLabel(category?: Item['category']): string {
  if (!category) return 'Sin categoría';
  const option = ITEM_CATEGORY_OPTIONS.find(opt => opt.value === category);
  return option?.label ?? category;
}

/**
 * Obtiene el label de una UOM
 */
export function getUomLabel(uom?: string): string {
  if (!uom) return 'Sin unidad';
  const option = UOM_OPTIONS.find(opt => opt.value === uom);
  return option?.label ?? uom;
}

/**
 * Obtiene el símbolo de una moneda
 */
export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '€';
  const option = CURRENCY_OPTIONS.find(opt => opt.value === currency);
  return option?.symbol ?? currency;
}
