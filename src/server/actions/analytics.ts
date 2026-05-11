"use server";

import { adminDb as db } from "@/server/firebase";
import type { 
  SellOutMetrics, 
  ShopifyMetrics, 
  ForecastData,
  SellOutRecord,
  AnalyticsFilters 
} from "@/types/analytics";
import { analyzeSales } from "./ai-insights";

/**
 * Get Sell-Out metrics (ventas desde distribuidores)
 */
export async function getSellOutMetrics(
  filters?: AnalyticsFilters
): Promise<{
  success: boolean;
  data?: SellOutMetrics;
  error?: string;
}> {
  try {
    // Query sell-out records from Firestore
    let query = db.collection("sellout_records");

    if (filters?.dateFrom) {
      query = query.where("date", ">=", filters.dateFrom) as any;
    }
    if (filters?.dateTo) {
      query = query.where("date", "<=", filters.dateTo) as any;
    }
    if (filters?.distributorId) {
      query = query.where("distributorId", "==", filters.distributorId) as any;
    }

    const snapshot = await query.get();
    const records: SellOutRecord[] = [];
    
    snapshot.forEach((doc: any) => {
      records.push({ id: doc.id, ...doc.data() } as SellOutRecord);
    });

    // Calculate metrics
    const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
    const totalUnits = records.reduce((sum, r) => sum + r.units, 0);
    const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;

    // Calculate growth (compare with previous period)
    // TODO: Implement proper growth calculation
    const growth = 0;

    // Top products
    const productMap = new Map<string, { name: string; units: number; revenue: number }>();
    records.forEach((r) => {
      const existing = productMap.get(r.productId) || { name: r.productName, units: 0, revenue: 0 };
      productMap.set(r.productId, {
        name: r.productName,
        units: existing.units + r.units,
        revenue: existing.revenue + r.revenue,
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        units: data.units,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // By distributor
    const distributorMap = new Map<string, { name: string; revenue: number; units: number }>();
    records.forEach((r) => {
      const existing = distributorMap.get(r.distributorId) || { 
        name: r.distributorName, 
        revenue: 0, 
        units: 0 
      };
      distributorMap.set(r.distributorId, {
        name: r.distributorName,
        revenue: existing.revenue + r.revenue,
        units: existing.units + r.units,
      });
    });

    const byDistributor = Array.from(distributorMap.entries())
      .map(([distributorId, data]) => ({
        distributorId,
        distributorName: data.name,
        revenue: data.revenue,
        units: data.units,
        growth: 0, // TODO: Calculate growth
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const metrics: SellOutMetrics = {
      totalRevenue,
      totalUnits,
      avgPrice,
      growth,
      topProducts,
      byDistributor,
    };

    return { success: true, data: metrics };
  } catch (error) {
    console.error("Error getting sell-out metrics:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get sell-out metrics" 
    };
  }
}

/**
 * Get Shopify metrics (ventas online)
 */
export async function getShopifyMetrics(
  filters?: AnalyticsFilters
): Promise<{
  success: boolean;
  data?: ShopifyMetrics;
  error?: string;
}> {
  try {
    // TODO: Implement Shopify API integration
    // For now, return placeholder data
    
    const metrics: ShopifyMetrics = {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      conversionRate: 0,
      topProducts: [],
      revenueByDay: [],
    };

    return { success: true, data: metrics };
  } catch (error) {
    console.error("Error getting Shopify metrics:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get Shopify metrics" 
    };
  }
}

/**
 * Get sales forecast using Gemini AI
 */
export async function getSalesForecast(
  period: 'next_month' | 'next_quarter' = 'next_month'
): Promise<{
  success: boolean;
  data?: ForecastData;
  error?: string;
}> {
  try {
    // Use existing analyzeSales function (pass 'all' for overall analysis)
    const result = await analyzeSales('all');
    
    if (!result.success || !result.forecast) {
      return { 
        success: false, 
        error: "Failed to generate forecast" 
      };
    }

    const forecastData = result.forecast;
    
    // Extract forecast data from analysis
    const forecast: ForecastData = {
      period,
      predictedRevenue: (forecastData as any).nextMonth || (forecastData as any).nextQuarter || 0,
      confidence: forecastData.confidence || 70,
      trend: forecastData.trend || 'stable',
      factors: [
        {
          name: "Seasonal trends",
          impact: 'neutral' as const,
          description: "Analyzing seasonal patterns in sales data",
        }
      ],
      recommendations: (forecastData.recommendations || []).map((rec: any) => ({
        action: typeof rec === 'string' ? rec : rec.action,
        priority: rec.priority || 'medium' as const,
        estimatedImpact: rec.estimatedImpact || 'N/A',
      })),
    };

    return { success: true, data: forecast };
  } catch (error) {
    console.error("Error getting sales forecast:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get sales forecast" 
    };
  }
}

/**
 * Upload sell-out data from CSV
 */
export async function uploadSellOutData(
  records: Omit<SellOutRecord, 'id' | 'uploadedAt' | 'uploadedBy' | 'source'>[],
  userId: string
): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    const batch = db.batch();
    const timestamp = new Date().toISOString();

    records.forEach((record) => {
      const docRef = db.collection("sellout_records").doc();
      batch.set(docRef, {
        ...record,
        uploadedAt: timestamp,
        uploadedBy: userId,
        source: 'csv_upload',
      });
    });

    await batch.commit();

    return { 
      success: true, 
      data: { count: records.length } 
    };
  } catch (error) {
    console.error("Error uploading sell-out data:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload sell-out data" 
    };
  }
}

/**
 * Get sell-out records with filters
 */
export async function getSellOutRecords(
  filters?: AnalyticsFilters,
  limit: number = 100
): Promise<{
  success: boolean;
  data?: SellOutRecord[];
  error?: string;
}> {
  try {
    let query = db.collection("sellout_records").orderBy("date", "desc").limit(limit);

    if (filters?.dateFrom) {
      query = query.where("date", ">=", filters.dateFrom) as any;
    }
    if (filters?.dateTo) {
      query = query.where("date", "<=", filters.dateTo) as any;
    }
    if (filters?.distributorId) {
      query = query.where("distributorId", "==", filters.distributorId) as any;
    }

    const snapshot = await query.get();
    const records: SellOutRecord[] = [];
    
    snapshot.forEach((doc: any) => {
      records.push({ id: doc.id, ...doc.data() } as SellOutRecord);
    });

    return { success: true, data: records };
  } catch (error) {
    console.error("Error getting sell-out records:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get sell-out records" 
    };
  }
}
