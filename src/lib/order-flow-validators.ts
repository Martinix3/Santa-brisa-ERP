// src/lib/order-flow-validators.ts

import type { Order, OrderChannel, OrderSellOut, TeamMember } from '@/domain/ssot';

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
  order: Partial<Order>,
  createdByUser?: TeamMember
): ValidationResult {
  const warnings: string[] = [];

  // REGLA 1: Online (Shopify) siempre DIRECT
  if (order.source === 'SHOPIFY') {
    if (order.channel && order.channel !== 'DIRECT') {
      return {
        valid: false,
        error: 'Pedidos online (Shopify) deben tener channel=DIRECT',
      };
    }

    if (order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos online (Shopify) no deben tener distributorId',
      };
    }

    // Auto-corregir si no tiene channel definido
    if (!order.channel) {
      warnings.push('Pedido online sin channel definido, debería ser DIRECT');
    }
  }

  // REGLA 2: Comerciales solo DISTRIBUTOR
  if (createdByUser?.role === 'comercial') {
    if (order.channel === 'DIRECT') {
      return {
        valid: false,
        error: 'Comerciales no pueden crear pedidos con channel=DIRECT (no tienen capacidad de facturar)',
      };
    }

    if (order.channel === 'DISTRIBUTOR' && !order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos de comerciales requieren distributorId (debe ser Santa Brisa o distribuidor externo)',
      };
    }

    // Warning si no tiene channel definido
    if (!order.channel) {
      warnings.push('Pedido de comercial sin channel definido, debería ser DISTRIBUTOR');
    }
  }

  // REGLA 3: DISTRIBUTOR requiere distributor
  if (order.channel === 'DISTRIBUTOR') {
    if (!order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos con channel=DISTRIBUTOR requieren distributorId',
      };
    }
  }

  // REGLA 4: DIRECT no debe tener distributor
  if (order.channel === 'DIRECT') {
    if (order.distributorId) {
      return {
        valid: false,
        error: 'Pedidos con channel=DIRECT no deben tener distributorId',
      };
    }
  }

  // Validación adicional: channel debe estar definido
  if (!order.channel) {
    warnings.push('Pedido sin channel definido (debería ser DISTRIBUTOR o DIRECT)');
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
  order: Partial<Order>,
  createdByUser?: TeamMember
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
export function inferOrderChannel(
  source?: Order['source'],
  userRole?: TeamMember['role']
): OrderChannel {
  // Online siempre DIRECT
  if (source === 'SHOPIFY') {
    return 'DIRECT';
  }

  // Comerciales siempre DISTRIBUTOR
  if (userRole === 'comercial') {
    return 'DISTRIBUTOR';
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
export function findInvalidOrders(orders: Order[]): Array<{
  order: Order;
  errors: string[];
}> {
  const invalid: Array<{ order: Order; errors: string[] }> = [];

  for (const order of orders) {
    const errors: string[] = [];

    // Online debe ser DIRECT
    if (order.source === 'SHOPIFY' && order.channel !== 'DIRECT') {
      errors.push(`Online debe tener channel=DIRECT (tiene ${order.channel})`);
    }

    // DISTRIBUTOR sin distributor
    if (order.channel === 'DISTRIBUTOR' && !order.distributorId) {
      errors.push('DISTRIBUTOR sin distributorId');
    }

    // DIRECT con distributor
    if (order.channel === 'DIRECT' && order.distributorId) {
      errors.push('DIRECT con distributorId (debería ser null)');
    }

    // Sin channel definido
    if (!order.channel) {
      errors.push('Sin channel definido');
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
export function getOrderFlowHealthReport(orders: Order[]): {
  total: number;
  valid: number;
  invalid: number;
  invalidPercentage: number;
  bySource: Record<string, { total: number; invalid: number }>;
  byChannel: Record<string, { total: number; invalid: number }>;
  invalidOrders: Array<{ order: Order; errors: string[] }>;
} {
  const invalidOrders = findInvalidOrders(orders);
  const bySource: Record<string, { total: number; invalid: number }> = {};
  const byChannel: Record<string, { total: number; invalid: number }> = {};

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

  // Calcular estadísticas por channel
  for (const order of orders) {
    const channel = order.channel || 'UNKNOWN';
    if (!byChannel[channel]) {
      byChannel[channel] = { total: 0, invalid: 0 };
    }
    byChannel[channel].total++;
  }

  for (const { order } of invalidOrders) {
    const channel = order.channel || 'UNKNOWN';
    if (byChannel[channel]) {
      byChannel[channel].invalid++;
    }
  }

  return {
    total: orders.length,
    valid: orders.length - invalidOrders.length,
    invalid: invalidOrders.length,
    invalidPercentage: (invalidOrders.length / orders.length) * 100,
    bySource,
    byChannel,
    invalidOrders,
  };
}
