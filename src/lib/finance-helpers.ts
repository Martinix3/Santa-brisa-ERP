// src/lib/finance-helpers.ts

import { FinanceLink, PaymentLink } from '@/domain/ssot.v7';

/**
 * Calcula las métricas de cashflow para un periodo específico
 */
export function calculateCashflowMetrics(
  financeLinks: FinanceLink[],
  paymentLinks: PaymentLink[],
  days: number = 30
) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Calcular ingresos (pagos recibidos en el periodo)
  const inflow = paymentLinks
    .filter(p => new Date(p.date) >= cutoffDate)
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Calcular salidas (facturas con vencimiento en el periodo, aún pendientes)
  const outflow = financeLinks
    .filter(f => {
      const dueDate = new Date(f.dueDate);
      return dueDate >= cutoffDate && f.status !== 'paid';
    })
    .reduce((sum, f) => sum + f.grossAmount, 0);
  
  // Calcular saldo actual (todos los pagos - todas las facturas)
  const allPayments = paymentLinks.reduce((sum, p) => sum + p.amount, 0);
  const allInvoices = financeLinks.reduce((sum, f) => sum + f.grossAmount, 0);
  const currentBalance = allPayments - allInvoices;
  
  return {
    currentBalance,
    inflow,
    outflow,
    netCashflow: inflow - outflow
  };
}

/**
 * Genera un forecast de cashflow para las próximas semanas
 */
export function getCashflowForecast(
  financeLinks: FinanceLink[],
  weeks: number = 4
): Array<{ name: string; inflow: number; outflow: number }> {
  const forecast: Array<{ name: string; inflow: number; outflow: number }> = [];
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekInvoices = financeLinks.filter(f => {
      const dueDate = new Date(f.dueDate);
      return dueDate >= weekStart && dueDate < weekEnd;
    });
    
    forecast.push({
      name: `Sem ${i + 1}`,
      inflow: weekInvoices
        .filter(f => f.status === 'paid')
        .reduce((sum, f) => sum + f.grossAmount, 0),
      outflow: weekInvoices
        .filter(f => f.status === 'pending')
        .reduce((sum, f) => sum + f.grossAmount, 0)
    });
  }
  
  return forecast;
}

/**
 * Obtiene el total de cuentas por cobrar
 */
export function getAccountsReceivable(financeLinks: FinanceLink[]) {
  const receivables = financeLinks.filter(f => 
    f.docType === 'invoice' && 
    (f.status === 'pending' || f.status === 'overdue')
  );
  
  const total = receivables.reduce((sum, f) => sum + f.grossAmount, 0);
  
  const overdue = receivables
    .filter(f => {
      const dueDate = new Date(f.dueDate);
      const daysPast = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysPast > 30;
    })
    .reduce((sum, f) => sum + f.grossAmount, 0);
  
  return { total, overdue };
}

/**
 * Obtiene el total de cuentas por pagar
 */
export function getAccountsPayable(financeLinks: FinanceLink[]) {
  const payables = financeLinks.filter(f => 
    f.docType !== 'invoice' && 
    f.status === 'pending'
  );
  
  const total = payables.reduce((sum, f) => sum + f.grossAmount, 0);
  
  // Próximo vencimiento (facturas con vencimiento en los próximos 7 días)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const nextDue = payables
    .filter(f => {
      const dueDate = new Date(f.dueDate);
      return dueDate <= nextWeek;
    })
    .reduce((sum, f) => sum + f.grossAmount, 0);
  
  return { total, nextDue };
}
