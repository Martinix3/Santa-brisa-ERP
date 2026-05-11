/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// Types for Sales Analytics Module

export interface SellOutMetrics {
  totalRevenue: number;
  totalUnits: number;
  avgPrice: number;
  growth: number; // percentage
  topProducts: Array<{
    productId: string;
    productName: string;
    units: number;
    revenue: number;
  }>;
  byDistributor: Array<{
    distributorId: string;
    distributorName: string;
    revenue: number;
    units: number;
    growth: number;
  }>;
}

export interface ShopifyMetrics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    orders: number;
    revenue: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface ForecastData {
  period: string; // 'next_month' | 'next_quarter'
  predictedRevenue: number;
  confidence: number; // 0-100
  trend: 'growing' | 'stable' | 'declining';
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }>;
}

export interface SellOutRecord {
  id: string;
  distributorId: string;
  distributorName: string;
  productId: string;
  productName: string;
  units: number;
  revenue: number;
  date: string; // ISO date
  uploadedAt: string; // ISO timestamp
  uploadedBy: string;
  source: 'csv_upload' | 'api' | 'manual';
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  distributorId?: string;
  productId?: string;
}
