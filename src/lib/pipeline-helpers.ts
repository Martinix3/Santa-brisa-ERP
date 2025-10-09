// src/lib/pipeline-helpers.ts
import { Account, Interaction, OrderSellOut, Stage } from '@/domain/ssot.v7';

export type PipelineStage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA';

export type PipelineData = {
  stage: PipelineStage;
  count: number;
  accounts: Account[];
  cajasTotal?: number;
};

export type PipelineAlert = {
  type: 'info' | 'warning';
  message: string;
  count: number;
};

/**
 * Calcula el pipeline global o de un comercial específico
 */
export function calculatePipeline(
  accounts: Account[],
  interactions: Interaction[],
  orders: OrderSellOut[],
  userId?: string
): PipelineData[] {
  // Filtrar cuentas del comercial si se especifica
  const filteredAccounts = userId
    ? accounts.filter((a) => a.ownerId === userId)
    : accounts;

  const stages: PipelineStage[] = ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'];

  return stages.map((stage) => {
    const accountsInStage = filteredAccounts.filter((a) => a.stage === stage);

    let cajasTotal: number | undefined;
    if (stage === 'ACTIVA') {
      // Calcular cajas solo para cuentas activas (flow PLACEMENT)
      const accountIds = accountsInStage.map((a) => a.id);
      cajasTotal = orders
        .filter((o) => o.flow === 'PLACEMENT' && accountIds.includes(o.accountId))
        .reduce((sum, o) => sum + sumCajasOrder(o), 0);
    }

    return {
      stage,
      count: accountsInStage.length,
      accounts: accountsInStage,
      cajasTotal,
    };
  });
}

/**
 * Detecta alertas del pipeline
 */
export function getPipelineAlerts(
  accounts: Account[],
  interactions: Interaction[]
): PipelineAlert[] {
  const alerts: PipelineAlert[] = [];

  // Cuentas potenciales sin interacción
  const sinInteraccion = accounts.filter(
    (a) =>
      a.stage === 'POTENCIAL' && !interactions.some((i) => i.accountId === a.id)
  );
  if (sinInteraccion.length > 0) {
    alerts.push({
      type: 'info',
      message: `${sinInteraccion.length} cuentas necesitan primera interacción`,
      count: sinInteraccion.length,
    });
  }

  // Cuentas sin contacto hace más de 30 días
  const sinContacto = accounts.filter((a) => {
    if (a.stage === 'FALLIDA' || a.stage === 'CERRADA') return false;
    const ultima = getUltimaInteraccion(a.id, interactions);
    return ultima && daysSince(ultima.createdAt) > 30;
  });
  if (sinContacto.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${sinContacto.length} cuentas sin contacto hace +30 días`,
      count: sinContacto.length,
    });
  }

  return alerts;
}

/**
 * Obtiene la última interacción de una cuenta
 */
export function getUltimaInteraccion(
  accountId: string,
  interactions: Interaction[]
): Interaction | null {
  const sorted = interactions
    .filter((i) => i.accountId === accountId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return sorted[0] || null;
}

/**
 * Calcula días desde una fecha
 */
export function daysSince(date: string): number {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Suma cajas de un pedido
 */
export function sumCajasOrder(order: OrderSellOut): number {
  return order.lines.reduce((sum, line) => sum + line.qty, 0);
}

/**
 * Obtiene el nombre de una cuenta por ID
 */
export function getAccountName(accountId: string, accounts: Account[]): string {
  return accounts.find((a) => a.id === accountId)?.name || 'Cuenta desconocida';
}

/**
 * Calcula el pipeline mini para un comercial (formato: P→S→A→F)
 */
export function getPipelineMini(
  accounts: Account[],
  userId: string
): { potencial: number; seguimiento: number; activa: number; fallida: number } {
  const userAccounts = accounts.filter((a) => a.ownerId === userId);

  return {
    potencial: userAccounts.filter((a) => a.stage === 'POTENCIAL').length,
    seguimiento: userAccounts.filter((a) => a.stage === 'SEGUIMIENTO').length,
    activa: userAccounts.filter((a) => a.stage === 'ACTIVA').length,
    fallida: userAccounts.filter((a) => a.stage === 'FALLIDA').length,
  };
}
