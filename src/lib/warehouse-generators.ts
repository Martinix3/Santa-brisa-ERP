/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Warehouse Auto-Generation Utilities
 * 
 * Auto-generates SKUs, lot numbers, and other identifiers
 * according to BUSINESS_FLOWS_ARCHITECTURE.md standards.
 * 
 * Created: FASE 19.2 Phase 3
 */

import type { GoodsReceiptCategory } from "@/domain/ssot";

/**
 * Generate SKU for warehouse items
 * 
 * Format: {PREFIX}-{YEAR}-{RANDOM}
 * Example: RM-2025-3847
 * 
 * @param category - The goods receipt category
 * @returns Generated SKU string
 */
export function generateSKU(category: GoodsReceiptCategory): string {
  const year = new Date().getFullYear();
  
  const categoryPrefixes: any = {
    FINISHED: "FG",
    MERCHANDISE: "ME",
    RAW: "RM",
    INTERMEDIATE: "INT",
    PACKAGING: "PKG",
  };
  
  const prefix = categoryPrefixes[category] || "UK";
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  
  return `${prefix}-${year}-${randomNum}`;
}

/**
 * Generate Internal Lot Number
 * 
 * Format: LOT-{YYYYMMDD}-{SKU}-{SEQUENCE}
 * Example: LOT-20251017-RM-2025-3847-01
 * 
 * @param sku - The SKU to include in the lot number
 * @param date - The production/reception date (defaults to today)
 * @returns Generated internal lot number
 */
export function generateInternalLot(sku: string, date: Date = new Date()): string {
  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  
  // Generate 2-digit sequence number (in production, this should check DB for conflicts)
  const sequence = String(Math.floor(10 + Math.random() * 90)).padStart(2, "0");
  
  return `LOT-${dateStr}-${sku}-${sequence}`;
}

/**
 * Generate Receipt Number
 * 
 * Format: RCP-{YYYYMMDD}-{SEQUENCE}
 * Example: RCP-20251017-0042
 * 
 * @param date - The receipt date (defaults to today)
 * @returns Generated receipt number
 */
export function generateReceiptNumber(date: Date = new Date()): string {
  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  
  // Generate 4-digit sequence (in production, this should check DB for conflicts)
  const sequence = String(Math.floor(1 + Math.random() * 9999)).padStart(4, "0");
  
  return `RCP-${dateStr}-${sequence}`;
}

/**
 * Validate SKU format
 * 
 * @param sku - The SKU to validate
 * @returns true if valid, false otherwise
 */
export function isValidSKU(sku: string): boolean {
  // Format: PREFIX-YYYY-NNNN
  const skuPattern = /^(FG|ME|RM|INT|PKG)-\d{4}-\d{4}$/;
  return skuPattern.test(sku);
}

/**
 * Validate internal lot format
 * 
 * @param lot - The lot number to validate
 * @returns true if valid, false otherwise
 */
export function isValidInternalLot(lot: string): boolean {
  // Format: LOT-YYYYMMDD-SKU-NN
  const lotPattern = /^LOT-\d{8}-(FG|ME|RM|INT|PKG)-\d{4}-\d{4}-\d{2}$/;
  return lotPattern.test(lot);
}

/**
 * Extract date from internal lot number
 * 
 * @param lot - The internal lot number
 * @returns Date object or null if invalid format
 */
export function extractDateFromLot(lot: string): Date | null {
  const match = lot.match(/^LOT-(\d{4})(\d{2})(\d{2})-/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Extract SKU from internal lot number
 * 
 * @param lot - The internal lot number
 * @returns SKU string or null if invalid format
 */
export function extractSKUFromLot(lot: string): string | null {
  const match = lot.match(/^LOT-\d{8}-((FG|ME|RM|INT|PKG)-\d{4}-\d{4})-\d{2}$/);
  if (!match) return null;
  
  return match[1];
}
