"use server";

import { adminDb as db } from "@/server/firebase";

/**
 * Server actions para gestionar la configuración de dashboards
 * Permite actualizar thresholds, targets y configuraciones desde la UI
 */

export interface DashboardConfigData {
  thresholds: {
    // Stock
    STOCK_CRITICAL: number;
    STOCK_LOW: number;
    STOCK_COVERAGE_MIN: number;
    STOCK_COVERAGE_OPTIMAL: number;
    
    // Cuentas
    ACCOUNT_INACTIVE_DAYS: number;
    ACCOUNT_CRITICAL_DAYS: number;
    
    // Pedidos
    ORDER_DELAYED_DAYS: number;
    ORDER_CRITICAL_DAYS: number;
    
    // Producción
    OEE_MIN: number;
    OEE_OPTIMAL: number;
    QC_PENDING_MAX_HOURS: number;
    
    // Finanzas
    INVOICE_DUE_DAYS: number;
    INVOICE_OVERDUE_DAYS: number;
    CREDIT_USAGE_WARNING: number;
    CREDIT_USAGE_CRITICAL: number;
    
    // Ventas
    CONVERSION_MIN: number;
    CONVERSION_OPTIMAL: number;
    MONTHLY_TARGET_MIN: number;
  };
  
  targets: {
    // Ventas
    MONTHLY_SALES: number;
    DAILY_VISITS: number;
    MONTHLY_VISITS: number;
    MONTHLY_ORDERS: number;
    CONVERSION_RATE: number;
    
    // Producción
    DAILY_PRODUCTION_ORDERS: number;
    OEE_TARGET: number;
    REJECT_RATE_MAX: number;
    
    // Inventario
    STOCK_ROTATION_DAYS: number;
    STOCK_ACCURACY: number;
    
    // Logística
    OTIF_TARGET: number;
    DELIVERY_TIME_DAYS: number;
    
    // Finanzas
    COLLECTION_RATE: number;
    OVERDUE_MAX: number;
  };
  
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Obtener configuración de dashboards desde Firestore
 * Si no existe, devuelve valores por defecto de dashboard-config.ts
 */
export async function getDashboardConfig() {
  try {
    const configDoc = await db.collection("_system").doc("dashboard-config").get();
    
    if (!configDoc.exists) {
      // Valores por defecto si no existe configuración
      return {
        ok: true,
        data: getDefaultConfig()
      };
    }
    
    const data = configDoc.data() as DashboardConfigData;
    
    return {
      ok: true,
      data
    };
    
  } catch (error: any) {
    console.error("[getDashboardConfig] Error:", error);
    return {
      ok: false,
      message: error.message || "Error al obtener configuración",
      data: getDefaultConfig() // Fallback a valores por defecto
    };
  }
}

/**
 * Actualizar configuración de dashboards
 */
export async function updateDashboardConfig(config: DashboardConfigData) {
  try {
    // Actualizar configuración
    await db.collection("_system").doc("dashboard-config").set({
      ...config,
      updatedAt: new Date(),
      updatedBy: "admin"
    });
    
    return {
      ok: true,
      message: "Configuración actualizada exitosamente"
    };
    
  } catch (error: any) {
    console.error("[updateDashboardConfig] Error:", error);
    return {
      ok: false,
      message: error.message || "Error al actualizar configuración"
    };
  }
}

/**
 * Resetear configuración a valores por defecto
 */
export async function resetDashboardConfig() {
  try {
    const defaultConfig = getDefaultConfig();
    
    await db.collection("_system").doc("dashboard-config").set({
      ...defaultConfig,
      updatedAt: new Date(),
      updatedBy: "admin"
    });
    
    return {
      ok: true,
      message: "Configuración reseteada a valores por defecto",
      data: defaultConfig
    };
    
  } catch (error: any) {
    console.error("[resetDashboardConfig] Error:", error);
    return {
      ok: false,
      message: error.message || "Error al resetear configuración"
    };
  }
}

/**
 * Obtener valores por defecto (sync con dashboard-config.ts)
 */
function getDefaultConfig(): DashboardConfigData {
  return {
    thresholds: {
      STOCK_CRITICAL: 50,
      STOCK_LOW: 100,
      STOCK_COVERAGE_MIN: 15,
      STOCK_COVERAGE_OPTIMAL: 30,
      ACCOUNT_INACTIVE_DAYS: 30,
      ACCOUNT_CRITICAL_DAYS: 60,
      ORDER_DELAYED_DAYS: 3,
      ORDER_CRITICAL_DAYS: 7,
      OEE_MIN: 75,
      OEE_OPTIMAL: 85,
      QC_PENDING_MAX_HOURS: 24,
      INVOICE_DUE_DAYS: 30,
      INVOICE_OVERDUE_DAYS: 15,
      CREDIT_USAGE_WARNING: 0.8,
      CREDIT_USAGE_CRITICAL: 0.95,
      CONVERSION_MIN: 40,
      CONVERSION_OPTIMAL: 60,
      MONTHLY_TARGET_MIN: 0.7,
    },
    targets: {
      MONTHLY_SALES: 50000,
      DAILY_VISITS: 3,
      MONTHLY_VISITS: 65,
      MONTHLY_ORDERS: 40,
      CONVERSION_RATE: 60,
      DAILY_PRODUCTION_ORDERS: 2,
      OEE_TARGET: 85,
      REJECT_RATE_MAX: 2,
      STOCK_ROTATION_DAYS: 45,
      STOCK_ACCURACY: 98,
      OTIF_TARGET: 95,
      DELIVERY_TIME_DAYS: 3,
      COLLECTION_RATE: 85,
      OVERDUE_MAX: 5,
    },
    updatedAt: new Date(),
    updatedBy: "system"
  };
}
