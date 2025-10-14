/**
 * 📊 DASHBOARD CONFIGURATION
 * 
 * Configuración centralizada de todas las constantes, thresholds, fórmulas
 * y lógica de negocio para los dashboards.
 * 
 * ⚠️ IMPORTANTE: Cualquier cambio en esta configuración afecta a todos los dashboards.
 * Documentar cualquier modificación con el motivo y fecha.
 */

// ============================================================================
// 🎯 THRESHOLDS - UMBRALES DE ALERTA
// ============================================================================

export const THRESHOLDS = {
  // Stock
  STOCK_CRITICAL: 50,           // Unidades - Stock crítico (rojo)
  STOCK_LOW: 100,               // Unidades - Stock bajo (amarillo)
  STOCK_COVERAGE_MIN: 15,       // Días - Cobertura mínima aceptable
  STOCK_COVERAGE_OPTIMAL: 30,   // Días - Cobertura óptima

  // Cuentas
  ACCOUNT_INACTIVE_DAYS: 30,    // Días sin actividad → alerta
  ACCOUNT_CRITICAL_DAYS: 60,    // Días sin actividad → crítico

  // Pedidos
  ORDER_DELAYED_DAYS: 3,        // Días de retraso → alerta
  ORDER_CRITICAL_DAYS: 7,       // Días de retraso → crítico

  // Producción
  OEE_MIN: 75,                  // % mínimo OEE aceptable
  OEE_OPTIMAL: 85,              // % OEE óptimo
  QC_PENDING_MAX_HOURS: 24,     // Horas máximas en QC antes de alerta

  // Finanzas
  INVOICE_DUE_DAYS: 30,         // Días para vencimiento de factura
  INVOICE_OVERDUE_DAYS: 15,     // Días de mora → alerta
  CREDIT_USAGE_WARNING: 0.8,    // 80% de crédito usado → alerta
  CREDIT_USAGE_CRITICAL: 0.95,  // 95% de crédito usado → crítico

  // Ventas
  CONVERSION_MIN: 40,           // % mínimo conversión visita → pedido
  CONVERSION_OPTIMAL: 60,       // % óptimo conversión
  MONTHLY_TARGET_MIN: 0.7,      // 70% del objetivo mensual mínimo aceptable
} as const;

// ============================================================================
// 📐 FORMULAS - FÓRMULAS DE CÁLCULO
// ============================================================================

export const FORMULAS = {
  /**
   * Conversión de visitas a pedidos
   * @param orders - Número de pedidos
   * @param visits - Número de visitas
   * @returns Porcentaje de conversión (0-100)
   */
  conversionRate: (orders: number, visits: number): number => {
    return visits > 0 ? Math.round((orders / visits) * 100) : 0;
  },

  /**
   * Progreso hacia objetivo mensual
   * @param current - Ventas actuales
   * @param target - Objetivo mensual
   * @returns Porcentaje de progreso (0-100)
   */
  targetProgress: (current: number, target: number): number => {
    return target > 0 ? Math.round((current / target) * 100) : 0;
  },

  /**
   * Días de cobertura de stock
   * @param qtyOnHand - Cantidad en stock
   * @param avgDailyDemand - Demanda promedio diaria
   * @returns Días de cobertura
   */
  stockCoverage: (qtyOnHand: number, avgDailyDemand: number): number => {
    return avgDailyDemand > 0 ? Math.round(qtyOnHand / avgDailyDemand) : 999;
  },

  /**
   * OEE (Overall Equipment Effectiveness)
   * @param availability - Disponibilidad (0-1)
   * @param performance - Rendimiento (0-1)
   * @param quality - Calidad (0-1)
   * @returns OEE en porcentaje (0-100)
   */
  oee: (availability: number, performance: number, quality: number): number => {
    return Math.round(availability * performance * quality * 100);
  },

  /**
   * Margen bruto
   * @param revenue - Ingresos
   * @param cost - Costos
   * @returns Margen en porcentaje (0-100)
   */
  grossMargin: (revenue: number, cost: number): number => {
    return revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0;
  },

  /**
   * Tasa de cobro
   * @param collected - Monto cobrado
   * @param invoiced - Monto facturado
   * @returns Tasa en porcentaje (0-100)
   */
  collectionRate: (collected: number, invoiced: number): number => {
    return invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
  },

  /**
   * Días desde última actividad
   * @param lastActivityDate - Fecha última actividad
   * @returns Días transcurridos
   */
  daysSinceLastActivity: (lastActivityDate: Date): number => {
    const now = new Date();
    const diff = now.getTime() - lastActivityDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * OTIF (On Time In Full)
   * @param deliveredOnTime - Entregas a tiempo
   * @param totalDeliveries - Total entregas
   * @returns OTIF en porcentaje (0-100)
   */
  otif: (deliveredOnTime: number, totalDeliveries: number): number => {
    return totalDeliveries > 0 ? Math.round((deliveredOnTime / totalDeliveries) * 100) : 0;
  },

  /**
   * Uso de crédito
   * @param creditUsed - Crédito utilizado
   * @param creditLimit - Límite de crédito
   * @returns Porcentaje de uso (0-100)
   */
  creditUsage: (creditUsed: number, creditLimit: number): number => {
    return creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0;
  },

  /**
   * Rotación de inventario (días)
   * @param avgInventoryValue - Valor promedio inventario
   * @param cogs - Costo de ventas (COGS)
   * @param days - Días del período (default: 365)
   * @returns Días de rotación
   */
  inventoryTurnoverDays: (avgInventoryValue: number, cogs: number, days: number = 365): number => {
    return cogs > 0 ? Math.round((avgInventoryValue / cogs) * days) : 999;
  },
} as const;

// ============================================================================
// 🎨 STATUS COLORS - COLORES POR ESTADO
// ============================================================================

export const STATUS_COLORS = {
  // Stock levels
  stock: {
    critical: 'bg-destructive/10 text-destructive',      // < STOCK_CRITICAL
    low: 'bg-warning/10 text-warning',                   // < STOCK_LOW
    ok: 'bg-success/10 text-success',                    // >= STOCK_LOW
  },

  // Account stages
  account: {
    POTENCIAL: 'bg-gray-500/10 text-gray-700',
    ACTIVA: 'bg-primary/10 text-primary',
    SEGUIMIENTO: 'bg-warning/10 text-warning',
    INACTIVA: 'bg-muted/10 text-muted-foreground',
    PERDIDA: 'bg-destructive/10 text-destructive',
  },

  // Order status
  order: {
    open: 'bg-blue-500/10 text-blue-700',
    confirmed: 'bg-green-500/10 text-green-700',
    shipped: 'bg-purple-500/10 text-purple-700',
    invoiced: 'bg-indigo-500/10 text-indigo-700',
    paid: 'bg-emerald-500/10 text-emerald-700',
    cancelled: 'bg-red-500/10 text-red-700',
  },

  // QC status
  qc: {
    PENDING: 'bg-yellow-500/10 text-yellow-700',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-700',
    HOLD: 'bg-orange-500/10 text-orange-700',
    APPROVED: 'bg-green-500/10 text-green-700',
    REJECTED: 'bg-red-500/10 text-red-700',
  },

  // Production status
  production: {
    PENDING: 'bg-gray-500/10 text-gray-700',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-700',
    COMPLETED: 'bg-green-500/10 text-green-700',
    CANCELLED: 'bg-red-500/10 text-red-700',
  },

  // Alert types
  alert: {
    critical: 'bg-destructive/10 text-destructive border-destructive',
    warning: 'bg-warning/10 text-warning border-warning',
    info: 'bg-info/10 text-info border-info',
    success: 'bg-success/10 text-success border-success',
  },
} as const;

// ============================================================================
// 📊 KPI TARGETS - OBJETIVOS POR DEFECTO
// ============================================================================

export const DEFAULT_TARGETS = {
  // Ventas
  MONTHLY_SALES: 50000,           // € por comercial
  DAILY_VISITS: 3,                // Visitas por día
  MONTHLY_VISITS: 65,             // Visitas por mes (22 días hábiles)
  MONTHLY_ORDERS: 40,             // Pedidos por mes
  CONVERSION_RATE: 60,            // % conversión

  // Producción
  DAILY_PRODUCTION_ORDERS: 2,     // Órdenes por día
  OEE_TARGET: 85,                 // % OEE objetivo
  REJECT_RATE_MAX: 2,             // % máximo de rechazos

  // Inventario
  STOCK_ROTATION_DAYS: 45,        // Días rotación objetivo
  STOCK_ACCURACY: 98,             // % precisión de inventario

  // Logística
  OTIF_TARGET: 95,                // % OTIF objetivo
  DELIVERY_TIME_DAYS: 3,          // Días entrega estándar

  // Finanzas
  COLLECTION_RATE: 85,            // % tasa de cobro objetivo
  OVERDUE_MAX: 5,                 // % máximo facturación vencida
} as const;

// ============================================================================
// 🔔 ALERT RULES - REGLAS DE GENERACIÓN DE ALERTAS
// ============================================================================

export const ALERT_RULES = {
  /**
   * Evaluar si stock está crítico
   */
  isStockCritical: (qtyOnHand: number, minQty: number): boolean => {
    return qtyOnHand < minQty || qtyOnHand < THRESHOLDS.STOCK_CRITICAL;
  },

  /**
   * Evaluar si cuenta está inactiva
   */
  isAccountInactive: (lastActivityDate: Date): boolean => {
    const days = FORMULAS.daysSinceLastActivity(lastActivityDate);
    return days >= THRESHOLDS.ACCOUNT_INACTIVE_DAYS;
  },

  /**
   * Evaluar si cuenta está crítica
   */
  isAccountCritical: (lastActivityDate: Date): boolean => {
    const days = FORMULAS.daysSinceLastActivity(lastActivityDate);
    return days >= THRESHOLDS.ACCOUNT_CRITICAL_DAYS;
  },

  /**
   * Evaluar si factura está vencida
   */
  isInvoiceOverdue: (dueDate: Date): boolean => {
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0;
  },

  /**
   * Evaluar si factura está crítica (más de X días vencida)
   */
  isInvoiceCritical: (dueDate: Date): boolean => {
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue >= THRESHOLDS.INVOICE_OVERDUE_DAYS;
  },

  /**
   * Evaluar si uso de crédito es alto
   */
  isCreditUsageHigh: (creditUsed: number, creditLimit: number): boolean => {
    const usage = FORMULAS.creditUsage(creditUsed, creditLimit);
    return usage >= THRESHOLDS.CREDIT_USAGE_WARNING * 100;
  },

  /**
   * Evaluar si uso de crédito es crítico
   */
  isCreditUsageCritical: (creditUsed: number, creditLimit: number): boolean => {
    const usage = FORMULAS.creditUsage(creditUsed, creditLimit);
    return usage >= THRESHOLDS.CREDIT_USAGE_CRITICAL * 100;
  },

  /**
   * Evaluar si lote necesita atención en QC
   */
  isQCDelayed: (qcStartDate: Date): boolean => {
    const hoursInQC = (new Date().getTime() - qcStartDate.getTime()) / (1000 * 60 * 60);
    return hoursInQC >= THRESHOLDS.QC_PENDING_MAX_HOURS;
  },

  /**
   * Evaluar si OEE está por debajo del mínimo
   */
  isOEELow: (oee: number): boolean => {
    return oee < THRESHOLDS.OEE_MIN;
  },

  /**
   * Evaluar si conversión está por debajo del mínimo
   */
  isConversionLow: (orders: number, visits: number): boolean => {
    const conversion = FORMULAS.conversionRate(orders, visits);
    return conversion < THRESHOLDS.CONVERSION_MIN;
  },
} as const;

// ============================================================================
// 📅 DATE HELPERS - HELPERS DE FECHAS
// ============================================================================

export const DATE_HELPERS = {
  /**
   * Obtener inicio del mes actual
   */
  getStartOfMonth: (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  },

  /**
   * Obtener fin del mes actual
   */
  getEndOfMonth: (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  },

  /**
   * Obtener inicio del día actual
   */
  getStartOfDay: (): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  },

  /**
   * Obtener fecha X días atrás
   */
  getDaysAgo: (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },

  /**
   * Obtener días hábiles restantes del mes
   */
  getWorkingDaysRemainingInMonth: (): number => {
    const now = new Date();
    const endOfMonth = DATE_HELPERS.getEndOfMonth();
    let workingDays = 0;
    
    const current = new Date(now);
    while (current <= endOfMonth) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No sábado ni domingo
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  },
} as const;

// ============================================================================
// 💰 PRICING HELPERS - HELPERS DE PRECIOS
// ============================================================================

export const PRICING = {
  /**
   * Obtener precio según segmento de cuenta
   */
  getPriceBySegment: (basePrice: number, segment: string): number => {
    const discounts: Record<string, number> = {
      HORECA: 0.85,      // 15% descuento
      RETAIL: 1.0,       // Precio base
      DISTRIBUTOR: 0.70, // 30% descuento
      ONLINE: 0.90,      // 10% descuento
    };
    
    return basePrice * (discounts[segment] || 1.0);
  },

  /**
   * Calcular total con IVA
   */
  addVAT: (amount: number, vatRate: number = 0.21): number => {
    return amount * (1 + vatRate);
  },

  /**
   * Calcular precio sin IVA
   */
  removeVAT: (amount: number, vatRate: number = 0.21): number => {
    return amount / (1 + vatRate);
  },
} as const;

// ============================================================================
// 📝 EXPORT ALL
// ============================================================================

export const DASHBOARD_CONFIG = {
  THRESHOLDS,
  FORMULAS,
  STATUS_COLORS,
  DEFAULT_TARGETS,
  ALERT_RULES,
  DATE_HELPERS,
  PRICING,
} as const;

export default DASHBOARD_CONFIG;
