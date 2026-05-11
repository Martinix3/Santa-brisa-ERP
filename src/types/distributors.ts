/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Account } from "@/domain/ssot";

/**
 * Distributor with calculated KPIs
 * Extended from Account with segment='DISTRIBUIDOR'
 */
export interface DistributorWithKPIs extends Account {
  // Calculated KPIs
  totalAccounts: number;        // Cuentas asignadas
  activeAccounts: number;       // Cuentas con pedidos en últimos 90 días
  totalSellIn: number;          // Volumen sell-in YTD
  lastOrderDate?: string;       // Fecha último pedido
  avgOrderValue: number;        // Ticket promedio
  status: 'ACTIVO' | 'INACTIVO'; // Derivado de lastOrderDate
}

/**
 * Filters for distributors list
 */
export interface DistributorFilters {
  search?: string;
  status?: 'ACTIVO' | 'INACTIVO' | 'all';
  region?: string;
}
