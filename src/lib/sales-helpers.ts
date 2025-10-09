// src/lib/sales-helpers.ts
import {
  Account,
  OrderSellOut,
  User,
  Interaction,
  Segment,
} from '@/domain/ssot.v7';
import { sumCajasOrder, getPipelineMini, getUltimaInteraccion } from './pipeline-helpers';

export type ComercialPerformance = {
  userId: string;
  nombre: string;
  objetivo: number;
  cajasYTD: number;
  porcentajeObjetivo: number;
  cuentasActivas: number;
  cuentasEnNegociacion: number;
  pipeline: {
    potencial: number;
    seguimiento: number;
    activa: number;
    fallida: number;
  };
};

export type MixFlujo = {
  direct: { value: number; percentage: number };
  placement: { value: number; percentage: number };
};

export type SegmentMix = {
  segment: Segment;
  cajas: number;
  percentage: number;
};

export type AccountWithContext = {
  account: Account;
  ultimaInteraccion: Interaction | null;
  diasDesdeUltimaInteraccion: number;
  potencialMensual: number;
  proximoPaso: string;
};

/**
 * Calcula cajas vendidas (Sell-Out) - Colocación
 */
export function getCajasSellOut(orders: OrderSellOut[]): number {
  return orders
    .filter((o) => o.flow === 'PLACEMENT')
    .reduce((sum, o) => sum + sumCajasOrder(o), 0);
}

/**
 * Calcula cajas vendidas (Sell-In) - Directas
 */
export function getCajasSellIn(orders: OrderSellOut[]): number {
  return orders
    .filter((o) => o.flow === 'DIRECT')
    .reduce((sum, o) => sum + sumCajasOrder(o), 0);
}

/**
 * Filtra órdenes por rango de fechas
 */
export function filterOrdersByDateRange(
  orders: OrderSellOut[],
  range: 'week' | 'month' | 'ytd'
): OrderSellOut[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let startDate: Date;
  switch (range) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'ytd':
      startDate = startOfYear;
      break;
  }

  return orders.filter((o) => new Date(o.createdAt) >= startDate);
}

/**
 * Calcula performance por comercial
 */
export function getPerformancePorComercial(
  users: User[],
  accounts: Account[],
  orders: OrderSellOut[]
): ComercialPerformance[] {
  return users
    .filter((u) => u.role === 'comercial' && u.active)
    .map((comercial) => {
      const cuentasDelComercial = accounts.filter(
        (a) => a.ownerId === comercial.id
      );
      const accountIds = cuentasDelComercial.map((a) => a.id);

      const pedidosColocacion = orders.filter(
        (o) => o.flow === 'PLACEMENT' && accountIds.includes(o.accountId)
      );

      const cajasYTD = pedidosColocacion.reduce(
        (sum, o) => sum + sumCajasOrder(o),
        0
      );

      const objetivo = comercial.kpiBaseline?.unitsSold || 0;
      const cuentasActivas = cuentasDelComercial.filter(
        (c) => c.stage === 'ACTIVA'
      ).length;

      return {
        userId: comercial.id,
        nombre: comercial.name,
        objetivo,
        cajasYTD,
        porcentajeObjetivo: objetivo > 0 ? (cajasYTD / objetivo) * 100 : 0,
        cuentasActivas,
        cuentasEnNegociacion: cuentasDelComercial.filter(
          (c) => c.stage === 'SEGUIMIENTO'
        ).length,
        pipeline: getPipelineMini(accounts, comercial.id),
      };
    })
    .sort((a, b) => b.cajasYTD - a.cajasYTD); // Top performers primero
}

/**
 * Obtiene cuentas avanzadas (cerca de cerrar)
 */
export function getCuentasAvanzadas(
  accounts: Account[],
  interactions: Interaction[],
  limit: number = 5
): AccountWithContext[] {
  return accounts
    .filter(
      (a) => a.stage === 'ACTIVA' || a.stage === 'SEGUIMIENTO'
    )
    .map((account) => {
      const ultimaInteraccion = getUltimaInteraccion(account.id, interactions);
      const diasDesdeUltimaInteraccion = ultimaInteraccion
        ? daysSince(ultimaInteraccion.createdAt)
        : 999;

      return {
        account,
        ultimaInteraccion,
        diasDesdeUltimaInteraccion,
        potencialMensual: estimarPotencialMensual(account),
        proximoPaso: getProximoPaso(account.id, interactions),
      };
    })
    .filter((a) => a.diasDesdeUltimaInteraccion <= 30) // Activas últimos 30 días
    .sort((a, b) => a.diasDesdeUltimaInteraccion - b.diasDesdeUltimaInteraccion)
    .slice(0, limit);
}

/**
 * Calcula mix por flujo (Direct vs Placement)
 */
export function getMixPorFlujo(orders: OrderSellOut[]): MixFlujo {
  const directas = getCajasSellIn(orders);
  const colocacion = getCajasSellOut(orders);
  const total = directas + colocacion;

  if (total === 0) {
    return {
      direct: { value: 0, percentage: 0 },
      placement: { value: 0, percentage: 0 },
    };
  }

  return {
    direct: { value: directas, percentage: (directas / total) * 100 },
    placement: { value: colocacion, percentage: (colocacion / total) * 100 },
  };
}

/**
 * Calcula mix por segmento
 */
export function getMixPorSegmento(
  accounts: Account[],
  orders: OrderSellOut[]
): SegmentMix[] {
  const segmentos: Segment[] = ['HORECA', 'RETAIL', 'ONLINE', 'PRIVADA', 'DISTRIBUIDOR'];

  const results = segmentos.map((segment) => {
    const cuentasSegmento = accounts.filter((a) => a.segment === segment);
    const accountIds = cuentasSegmento.map((a) => a.id);

    const pedidos = orders.filter((o) => accountIds.includes(o.accountId));
    const cajas = pedidos.reduce((sum, o) => sum + sumCajasOrder(o), 0);

    return { segment, cajas };
  });

  const total = results.reduce((sum, r) => sum + r.cajas, 0);

  return results.map((r) => ({
    ...r,
    percentage: total > 0 ? (r.cajas / total) * 100 : 0,
  }));
}

/**
 * Calcula ratio visita → pedido
 */
export function getRatioVisitaPedido(
  interactions: Interaction[],
  orders: OrderSellOut[]
): number {
  const visitas = interactions.filter((i) => i.kind === 'VISITA').length;
  const pedidos = orders.filter((o) => o.flow === 'PLACEMENT').length;

  if (visitas === 0) return 0;
  return (pedidos / visitas) * 100;
}

/**
 * Genera datos para sparkline (últimos N meses)
 */
export function getSparklineDataMensual(
  orders: OrderSellOut[],
  months: number = 6
): number[] {
  const now = new Date();
  const data: number[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cajasDelMes = orders
      .filter((o) => {
        const orderDate = new Date(o.createdAt);
        return (
          orderDate.getFullYear() === targetMonth.getFullYear() &&
          orderDate.getMonth() === targetMonth.getMonth()
        );
      })
      .reduce((sum, o) => sum + sumCajasOrder(o), 0);

    data.push(cajasDelMes);
  }

  return data;
}

/**
 * Calcula crecimiento porcentual
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ===== HELPERS AUXILIARES =====

function daysSince(date: string): number {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function estimarPotencialMensual(account: Account): number {
  // Lógica simple para estimar potencial
  // TODO: Mejorar con historial real de pedidos
  const basePorSegmento: Record<Segment, number> = {
    HORECA: 15,
    RETAIL: 25,
    ONLINE: 10,
    PRIVADA: 5,
    DISTRIBUIDOR: 50,
  };

  return basePorSegmento[account.segment] || 10;
}

function getProximoPaso(
  accountId: string,
  interactions: Interaction[]
): string {
  const proxima = interactions
    .filter((i) => i.accountId === accountId && i.status === 'open')
    .sort((a, b) => {
      const dateA = new Date(a.plannedFor || a.createdAt).getTime();
      const dateB = new Date(b.plannedFor || b.createdAt).getTime();
      return dateA - dateB;
    })[0];

  if (!proxima) return 'Sin próximo paso definido';

  const note = proxima.note || proxima.title || 'Interacción pendiente';
  return note.length > 50 ? note.substring(0, 47) + '...' : note;
}
