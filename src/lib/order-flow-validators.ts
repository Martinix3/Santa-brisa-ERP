// src/lib/order-flow-validators.ts

import { OrderSellOut, User, CommercialFlow } from '@/domain/ssot.v7';

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Valida que un pedido cumpla las reglas de flow según el modelo de distribución.
 * 
 * Reglas:
 * 1. Online (Shopify) siempre DIRECT
 * 2. Comerciales solo PLACEMENT
 * 3. PLACEMENT requiere distributorId
 * 4. DIRECT no debe tener distributorId
 * 
 * @param order - Pedido a validar
 * @param createdByUser - Usuario que creó el pedido (opcional)
 * @returns Resultado de validación con errores si los hay
 * 
 * @see DISTRIBUTOR_FLOW_MODEL.md
 */
export function validateOrderFlow(
  order: Partial<OrderSellOut>,
  createdByUser?: User
): ValidationResult {
  const warnings: string[] = [];

  // REGLA 1: Online (Shopify) siempre DIRECT
  if (order.source === 'SHOPIFY') {
    if (order.flow && order.flow !== 'DIRECT') {
      return {
        valid: false,
        error: 'Pedidos online (Shopify) deben tener flow=DIRECT',
      };
    }

    if (order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos online (Shopify) no deben tener distributorId',
      };
    }

    // Auto-corregir si no tiene flow definido
    if (!order.flow) {
      warnings.push('Pedido online sin flow definido, debería ser DIRECT');
    }
  }

  // REGLA 2: Comerciales solo PLACEMENT
  if (createdByUser?.role === 'comercial') {
    if (order.flow === 'DIRECT') {
      return {
        valid: false,
        error: 'Comerciales no pueden crear pedidos con flow=DIRECT (no tienen capacidad de facturar)',
      };
    }

    if (order.flow === 'PLACEMENT' && !order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos de comerciales requieren distributorId (debe ser Santa Brisa o distribuidor externo)',
      };
    }

    // Warning si no tiene flow definido
    if (!order.flow) {
      warnings.push('Pedido de comercial sin flow definido, debería ser PLACEMENT');
    }
  }

  // REGLA 3: PLACEMENT requiere distributor
  if (order.flow === 'PLACEMENT') {
    if (!order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos con flow=PLACEMENT requieren distributorId',
      };
    }
  }

  // REGLA 4: DIRECT no debe tener distributor
  if (order.flow === 'DIRECT') {
    if (order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos con flow=DIRECT no deben tener distributorId',
      };
    }
  }

  // Validación adicional: flow debe estar definido
  if (!order.flow) {
    warnings.push('Pedido sin flow definido (debería ser PLACEMENT o DIRECT)');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Valida que un pedido cumpla las reglas y lanza error si no es válido.
 * Útil para usar en server actions o mutations.
 * 
 * @param order - Pedido a validar
 * @param createdByUser - Usuario que creó el pedido
 * @throws Error si la validación falla
 */
export function assertValidOrderFlow(
  order: Partial<OrderSellOut>,
  createdByUser?: User
): void {
  const result = validateOrderFlow(order, createdByUser);
  
  if (!result.valid) {
    throw new Error(`Validación de pedido falló: ${result.error}`);
  }

  // Log warnings
  if (result.warnings && result.warnings.length > 0) {
    console.warn('⚠️ Advertencias en validación de pedido:', result.warnings);
  }
}

/**
 * Infiere el flow correcto basado en el origen y usuario.
 * Útil para auto-completar pedidos al crearlos.
 * 
 * @param source - Origen del pedido
 * @param userRole - Rol del usuario que crea el pedido
 * @returns Flow recomendado
 */
export function inferOrderFlow(
  source?: OrderSellOut['source'],
  userRole?: User['role']
): CommercialFlow {
  // Online siempre DIRECT
  if (source === 'SHOPIFY') {
    return 'DIRECT';
  }

  // Comerciales siempre PLACEMENT
  if (userRole === 'comercial') {
    return 'PLACEMENT';
  }

  // Por defecto, admin puede elegir, pero sugerimos DIRECT
  return 'DIRECT';
}

/**
 * Detecta pedidos que probablemente sean inválidos en la base de datos.
 * Útil para auditorías y limpieza de datos.
 * 
 * @param orders - Lista de pedidos a analizar
 * @returns Pedidos con problemas de validación
 */
export function findInvalidOrders(orders: OrderSellOut[]): Array<{
  order: OrderSellOut;
  errors: string[];
}> {
  const invalid: Array<{ order: OrderSellOut; errors: string[] }> = [];

  for (const order of orders) {
    const errors: string[] = [];

    // Online debe ser DIRECT
    if (order.source === 'SHOPIFY' && order.flow !== 'DIRECT') {
      errors.push(`Online debe tener flow=DIRECT (tiene ${order.flow})`);
    }

    // PLACEMENT sin distributor
    if (order.flow === 'PLACEMENT' && !order.distributorId) {
      errors.push('PLACEMENT sin distributorId');
    }

    // DIRECT con distributor
    if (order.flow === 'DIRECT' && order.distributorId) {
      errors.push('DIRECT con distributorId (debería ser null)');
    }

    // Sin flow definido
    if (!order.flow) {
      errors.push('Sin flow definido');
    }

    if (errors.length > 0) {
      invalid.push({ order, errors });
    }
  }

  return invalid;
}

/**
 * Genera un reporte de salud de los flujos de pedidos.
 * 
 * @param orders - Lista de todos los pedidos
 * @returns Estadísticas de validación
 */
export function getOrderFlowHealthReport(orders: OrderSellOut[]): {
  total: number;
  valid: number;
  invalid: number;
  invalidPercentage: number;
  bySource: Record<string, { total: number; invalid: number }>;
  byFlow: Record<string, { total: number; invalid: number }>;
  invalidOrders: Array<{ order: OrderSellOut; errors: string[] }>;
} {
  const invalidOrders = findInvalidOrders(orders);
  const bySource: Record<string, { total: number; invalid: number }> = {};
  const byFlow: Record<string, { total: number; invalid: number }> = {};

  // Calcular estadísticas por source
  for (const order of orders) {
    const source = order.source || 'UNKNOWN';
    if (!bySource[source]) {
      bySource[source] = { total: 0, invalid: 0 };
    }
    bySource[source].total++;
  }

  for (const { order } of invalidOrders) {
    const source = order.source || 'UNKNOWN';
    if (bySource[source]) {
      bySource[source].invalid++;
    }
  }

  // Calcular estadísticas por flow
  for (const order of orders) {
    const flow = order.flow || 'UNKNOWN';
    if (!byFlow[flow]) {
      byFlow[flow] = { total: 0, invalid: 0 };
    }
    byFlow[flow].total++;
  }

  for (const { order } of invalidOrders) {
    const flow = order.flow || 'UNKNOWN';
    if (byFlow[flow]) {
      byFlow[flow].invalid++;
    }
  }

  return {
    total: orders.length,
    valid: orders.length - invalidOrders.length,
    invalid: invalidOrders.length,
    invalidPercentage: (invalidOrders.length / orders.length) * 100,
    bySource,
    byFlow,
    invalidOrders,
  };
}
