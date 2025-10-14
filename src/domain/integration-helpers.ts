// src/domain/integration-helpers.ts

/**
 * INTEGRATION HELPERS
 * 
 * Funciones de normalización y validación para datos provenientes
 * de integraciones externas (Holded, Shopify, Sendcloud, etc.)
 */

import type { ISODateString } from './ssot';

// =================================================================
// NORMALIZACIÓN DE CÓDIGOS DE BARRAS
// =================================================================

/**
 * Normaliza un código de barras a formato EAN-13 (13 dígitos sin separadores)
 * @param value - Código de barras crudo
 * @returns EAN-13 válido o undefined
 */
export function toEan13(value?: string | null): string | undefined {
  if (!value) return undefined;
  
  // Eliminar todo excepto dígitos
  const digits = value.replace(/\D/g, '');
  
  // Validar que tenga exactamente 13 dígitos
  return digits.length === 13 ? digits : undefined;
}

/**
 * Valida un código EAN-13 usando el dígito de control
 * @param ean13 - Código EAN-13 (13 dígitos)
 * @returns true si es válido
 */
export function validateEan13(ean13: string): boolean {
  if (!/^\d{13}$/.test(ean13)) return false;
  
  const digits = ean13.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  // Calcular dígito de control
  const sum = digits.reduce((acc, digit, i) => {
    return acc + digit * (i % 2 === 0 ? 1 : 3);
  }, 0);
  
  const calculatedCheck = (10 - (sum % 10)) % 10;
  
  return calculatedCheck === checkDigit;
}

// =================================================================
// NORMALIZACIÓN DE PESOS
// =================================================================

/**
 * Convierte pesos a gramos
 * @param value - Peso en string o number
 * @returns Peso en gramos o undefined
 * 
 * Heurística:
 * - Si < 10 → asume kg, convierte a g (*1000)
 * - Si >= 10 → asume ya es g
 */
export function toGrams(value?: string | number | null): number | undefined {
  if (value == null || value === '') return undefined;
  
  const num = typeof value === 'string' 
    ? Number(value.replace(',', '.')) 
    : value;
  
  if (!isFinite(num) || num < 0) return undefined;
  
  // Heurística simple: si es < 10, probablemente está en kg
  return num < 10 ? Math.round(num * 1000) : Math.round(num);
}

/**
 * Convierte kilos a gramos
 */
export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

/**
 * Convierte gramos a kilos
 */
export function gramsToKg(grams: number): number {
  return grams / 1000;
}

// =================================================================
// NORMALIZACIÓN DE FECHAS
// =================================================================

/**
 * Normaliza fechas a formato ISO string (UTC)
 * @param value - Fecha en diversos formatos
 * @returns ISO date string o current date si inválido
 */
export function normalizeDate(value?: string | number | Date | null): ISODateString {
  if (!value) return new Date().toISOString();
  
  try {
    if (typeof value === 'number') {
      // Epoch en segundos (Holded) → milisegundos
      const date = value < 10000000000 
        ? new Date(value * 1000) 
        : new Date(value);
      return date.toISOString();
    }
    
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
  } catch (e) {
    console.warn('Failed to normalize date:', value, e);
  }
  
  return new Date().toISOString();
}

/**
 * Convierte epoch (segundos) a ISO string
 */
export function epochToISO(epoch: number): ISODateString {
  return new Date(epoch * 1000).toISOString();
}

// =================================================================
// NORMALIZACIÓN DE PAÍSES
// =================================================================

const COUNTRY_CODES: Record<string, string> = {
  'ES': 'ES',
  'ESP': 'ES',
  'Spain': 'ES',
  'España': 'ES',
  'spain': 'ES',
  'españa': 'ES',
  'ESPAÑA': 'ES',
  'SPAIN': 'ES',
  'FR': 'FR',
  'France': 'FR',
  'Francia': 'FR',
  'DE': 'DE',
  'Germany': 'DE',
  'Alemania': 'DE',
  'IT': 'IT',
  'Italy': 'IT',
  'Italia': 'IT',
  'PT': 'PT',
  'Portugal': 'PT',
  'UK': 'GB',
  'GB': 'GB',
  'United Kingdom': 'GB',
  'Reino Unido': 'GB',
  'US': 'US',
  'USA': 'US',
  'United States': 'US',
  'Estados Unidos': 'US',
};

/**
 * Normaliza códigos de país a ISO 3166-1 alpha-2
 * @param value - Código o nombre de país
 * @returns Código ISO de 2 letras o valor original si no se reconoce
 */
export function normalizeCountry(value?: string | null): string {
  if (!value) return '';
  
  const trimmed = value.trim();
  return COUNTRY_CODES[trimmed] || trimmed.toUpperCase().substring(0, 2);
}

// =================================================================
// NORMALIZACIÓN DE TELÉFONOS
// =================================================================

/**
 * Intenta normalizar teléfono a formato E.164
 * @param value - Número de teléfono
 * @param defaultCountryCode - Código de país por defecto (ej: '+34')
 * @returns Teléfono normalizado o valor original
 */
export function normalizePhone(value?: string | null, defaultCountryCode: string = '+34'): string | undefined {
  if (!value) return undefined;
  
  // Eliminar todo excepto dígitos y +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // Si no empieza con +, añadir código de país por defecto
  if (!cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned;
  }
  
  return cleaned;
}

// =================================================================
// NORMALIZACIÓN DE CIF/VAT
// =================================================================

/**
 * Normaliza y valida CIF/NIF español
 * @param value - CIF/NIF
 * @returns CIF normalizado (mayúsculas, sin espacios) o undefined si inválido
 */
export function normalizeCIF(value?: string | null): string | undefined {
  if (!value) return undefined;
  
  const cleaned = value.toUpperCase().replace(/[\s-]/g, '');
  
  // Validación básica: Letra + 7-8 dígitos + (letra o dígito)
  if (!/^[A-Z]\d{7,8}[A-Z0-9]$/.test(cleaned)) {
    return undefined;
  }
  
  return cleaned;
}

/**
 * Valida formato básico de CIF español
 */
export function validateCIF(cif: string): boolean {
  return /^[A-Z]\d{7,8}[A-Z0-9]$/.test(cif);
}

// =================================================================
// NORMALIZACIÓN DE EMAILS
// =================================================================

/**
 * Normaliza email (lowercase, trim)
 * @param value - Email
 * @returns Email normalizado o undefined si inválido
 */
export function normalizeEmail(value?: string | null): string | undefined {
  if (!value) return undefined;
  
  const cleaned = value.trim().toLowerCase();
  
  // Validación básica
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return undefined;
  }
  
  return cleaned;
}

// =================================================================
// NORMALIZACIÓN DE CÓDIGOS POSTALES (ESPAÑA)
// =================================================================

/**
 * Normaliza código postal español a 5 dígitos
 * @param value - Código postal
 * @returns Código postal normalizado (5 dígitos) o undefined
 */
export function normalizePostalCodeES(value?: string | null): string | undefined {
  if (!value) return undefined;
  
  const cleaned = value.replace(/\D/g, '');
  
  // Códigos postales españoles son 5 dígitos
  if (cleaned.length !== 5) return undefined;
  
  return cleaned;
}

// =================================================================
// HELPERS DE CONVERSIÓN HOLDED
// =================================================================

/**
 * Mapea tipo de contacto Holded a AccountType
 */
export function mapHoldedContactType(holdedType?: string): 'HORECA' | 'RETAIL' | 'SUPPLIER' | 'OTRO' {
  if (!holdedType) return 'OTRO';
  
  const type = holdedType.toLowerCase();
  
  if (type === 'supplier' || type === 'proveedor') return 'SUPPLIER';
  if (type === 'client' || type === 'cliente') {
    // Aquí podrías aplicar heurísticas más complejas
    // Por ahora, asignamos OTRO y dejamos que se refine manualmente
    return 'OTRO';
  }
  
  return 'OTRO';
}

/**
 * Mapea método de pago Holded a nuestro enum
 */
export function mapPaymentMethod(holdedMethod?: string): 'TRANSFER' | 'CARD' | 'CASH' | 'CHECK' | 'OTHER' {
  if (!holdedMethod) return 'OTHER';
  
  const method = holdedMethod.toLowerCase();
  
  if (method.includes('transfer') || method.includes('transferencia')) return 'TRANSFER';
  if (method.includes('card') || method.includes('tarjeta')) return 'CARD';
  if (method.includes('cash') || method.includes('efectivo')) return 'CASH';
  if (method.includes('check') || method.includes('cheque')) return 'CHECK';
  
  return 'OTHER';
}

// =================================================================
// HELPERS DE VALIDACIÓN
// =================================================================

/**
 * Valida que un objeto tenga los campos mínimos requeridos
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  required: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(String(field));
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Calcula un hash simple para detectar cambios
 */
export function simpleHash(obj: any): string {
  return JSON.stringify(obj)
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
    .toString(36);
}

// =================================================================
// HELPERS DE IDEMPOTENCIA
// =================================================================

/**
 * Genera una clave natural para entidades de Holded
 */
export function holdedNaturalKey(entity: 'contact' | 'payment' | 'warehouse' | 'product', id: string): string {
  return `holded:${entity}:${id}`;
}

/**
 * Verifica si un evento ya fue procesado
 */
export function isEventProcessed(
  existing: { origin?: { eventId?: string } } | null,
  newEventId?: string
): boolean {
  return !!(existing?.origin?.eventId && existing.origin.eventId === newEventId);
}

/**
 * Verifica si los datos han cambiado (por updatedHash)
 */
export function hasDataChanged(
  existing: { raw?: { updatedHash?: string } } | null,
  newHash?: string
): boolean {
  if (!existing?.raw?.updatedHash || !newHash) return true;
  return existing.raw.updatedHash !== newHash;
}

// =================================================================
// EXPORTS AGRUPADOS
// =================================================================

export const IntegrationHelpers = {
  // Barcode
  toEan13,
  validateEan13,
  
  // Weight
  toGrams,
  kgToGrams,
  gramsToKg,
  
  // Date
  normalizeDate,
  epochToISO,
  
  // Location
  normalizeCountry,
  normalizePhone,
  normalizePostalCodeES,
  
  // Identity
  normalizeCIF,
  validateCIF,
  normalizeEmail,
  
  // Holded specific
  mapHoldedContactType,
  mapPaymentMethod,
  holdedNaturalKey,
  
  // Validation
  validateRequiredFields,
  simpleHash,
  isEventProcessed,
  hasDataChanged,
} as const;

export default IntegrationHelpers;
