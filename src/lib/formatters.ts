// src/lib/formatters.ts

/**
 * Utilidades de formato para la aplicación
 */

/**
 * Formatea un número como moneda EUR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha ISO a formato legible
 */
export function formatDate(isoString: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!isoString) return '-';
  
  const date = new Date(isoString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return new Intl.DateTimeFormat('es-ES', defaultOptions).format(date);
}

/**
 * Formatea una fecha a formato relativo (hace X días)
 */
export function formatRelativeDate(isoString: string | undefined): string {
  if (!isoString) return '-';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Formatea un número abreviado (1.5K, 2.3M, etc.)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Formatea un peso (kg, g)
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams.toFixed(0)} g`;
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
