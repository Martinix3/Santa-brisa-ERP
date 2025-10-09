import { SantaData, Account, OrderSellOut, TeamMember } from '@/domain/ssot';
import { getCajasSellOut } from './sales-helpers';

/**
 * Obtiene todos los distribuidores activos
 * Los distribuidores son cuentas con segment="DISTRIBUIDOR"
 */
export function getDistributors(data: SantaData): Account[] {
  return (data.accounts || [])
    .filter(a => a.accountType === 'DISTRIBUIDOR');
}

/**
 * Obtiene cuentas asignadas a un distribuidor
 */
export function getAccountsByDistributor(
  distributorId: string,
  accounts: Account[]
): Account[] {
  return accounts.filter(a => a.distributorId === distributorId);
}

/**
 * Obtiene pedidos de un distribuidor (PLACEMENT)
 * Busca pedidos donde la cuenta asociada tenga este distributorPartyId
 */
export function getOrdersByDistributor(
  distributorId: string,
  orders: OrderSellOut[],
  accounts: Account[]
): OrderSellOut[] {
  const accountIds = new Set(
    accounts
      .filter(a => a.distributorId === distributorId)
      .map(a => a.id)
  );
  
  return orders.filter(o => 
    o.flow === 'COLOCACION' && accountIds.has(o.accountId)
  );
}

/**
 * Calcula estadísticas de un distribuidor para un periodo
 */
export function calculateDistributorStats(
  distributor: Account,
  data: SantaData,
  filterDate: (date: string) => boolean
) {
  const accounts = getAccountsByDistributor(distributor.id, data.accounts || []);
  const orders = getOrdersByDistributor(distributor.id, data.ordersSellOut || [], data.accounts || []);
  
  // Filtrar pedidos por periodo
  const periodOrders = orders.filter(o => filterDate(o.createdAt));
  
  // Contar cuentas por stage
  const cuentasNegociacion = accounts.filter(a => a.stage === 'SEGUIMIENTO').length;
  const cuentasActivas = accounts.filter(a => a.stage === 'ACTIVA').length;
  
  // Calcular cajas
  const cajasPeriodo = getCajasSellOut(periodOrders);
  const cajasYTD = getCajasSellOut(orders.filter(o => {
    const year = new Date(o.createdAt).getFullYear();
    return year === new Date().getFullYear();
  }));
  
  // Obtener owners únicos
  const ownerIds = [...new Set(accounts.map(a => a.salesRepId))];
  const owners = ownerIds
    .map(id => data.teamMembers?.find(u => u.id === id))
    .filter((u): u is User => u !== undefined);
  
  return {
    distributor,
    accounts,
    cuentasNegociacion,
    cuentasActivas,
    cajasPeriodo,
    cajasYTD,
    owners,
  };
}

/**
 * Obtiene el distribuidor especial "Santa Brisa" (ventas directas)
 */
export function getSantaBrisaDistributor(data: SantaData): Party | null {
  const santaBrisa = (data.accounts || []).find(p => 
    p.name.toLowerCase().includes('santa brisa') ||
    p.tradeName?.toLowerCase().includes('santa brisa')
  );
  
  return santaBrisa || null;
}
