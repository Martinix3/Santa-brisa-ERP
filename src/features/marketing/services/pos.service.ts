// src/features/marketing/services/pos.service.ts
'use server';

import type { OrderSellOut, PosResult } from "@/domain/ssot";
import { adminDb as db } from '@/server/firebase';

// Esta función ahora es una 'server action' que puede ser llamada desde el servidor.

/**
 * Fetches weekly sales data for a specific account within a date range.
 * @param accountId The ID of the account.
 * @param from The start date of the range (ISO string).
 * @param to The end date of the range (ISO string).
 * @returns A promise that resolves to an array of weekly sales data.
 */
async function fetchSelloutWeekly(
  accountId: string,
  from: string,
  to: string,
): Promise<Array<{ weekISO: string; units: number }>> {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const ordersSnap = await db.collection('ordersSellOut')
    .where('accountId', '==', accountId)
    .where('createdAt', '>=', fromDate.toISOString())
    .where('createdAt', '<=', toDate.toISOString())
    .get();

  const relevantOrders = ordersSnap.docs.map(doc => doc.data() as OrderSellOut);

  const weeklySales: Record<string, number> = {};

  relevantOrders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dayOfWeek = orderDate.getUTCDay();
    const firstDayOfWeek = new Date(orderDate.setUTCDate(orderDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));
    firstDayOfWeek.setUTCHours(0, 0, 0, 0);
    const weekISO = firstDayOfWeek.toISOString().split('T')[0];

    const totalUnits = (order.lines || []).reduce((sum, line) => sum + line.qty, 0);
    weeklySales[weekISO] = (weeklySales[weekISO] || 0) + totalUnits;
  });

  return Object.entries(weeklySales).map(([weekISO, units]) => ({ weekISO, units }));
}

/**
 * Fetches baseline sales data for a specified number of weeks prior to a given date.
 * @param accountId The ID of the account.
 * @param from The start date for the baseline calculation period (ISO string).
 * @param weeksBack The number of weeks to look back for the baseline.
 * @returns A promise that resolves to an array of baseline weekly sales data.
 */
async function fetchBaselineWeeks(
  accountId: string,
  from: string,
  weeksBack: number,
): Promise<Array<{ weekISO: string; units: number; isPromo?: boolean }>> {
  const fromDate = new Date(from);
  const baselineStartDate = new Date(fromDate.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000);
  
  const weeklyData = await fetchSelloutWeekly(accountId, baselineStartDate.toISOString(), from);
  
  // Placeholder for promo week logic
  return weeklyData.map(d => ({ ...d, isPromo: false }));
}

/**
 * Computes the result of a Point of Sale (POS) tactic.
 * @param args - The arguments for computing the POS result.
 * @returns A promise that resolves to the computed POS result.
 */
export async function computePosResult(args: {
      accountId: string;
      startDate: string;
      endDate: string;
      costTotal: number;
      executionScore: number;
      marginPerUnit?: number;
      weeksBackBaseline?: number;
    }): Promise<PosResult> {
      
      const { accountId, startDate, endDate, costTotal, executionScore, marginPerUnit = 8, weeksBackBaseline = 4 } = args;

      const baselineWeeksData = await fetchBaselineWeeks(accountId, startDate, weeksBackBaseline);
      const activeWeeksData = await fetchSelloutWeekly(accountId, startDate, endDate);
      
      const baselineWeeks = baselineWeeksData.filter(w => !w.isPromo);
      const baselinePerWeek = baselineWeeks.length > 0
        ? baselineWeeks.reduce((sum, w) => sum + w.units, 0) / baselineWeeks.length
        : 0;

      const windowWeeks = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const actualUnits = activeWeeksData.reduce((sum, w) => sum + w.units, 0);
      const baselineUnits = baselinePerWeek * windowWeeks;
      const upliftUnits = actualUnits - baselineUnits;
      const liftPct = baselineUnits > 0 ? upliftUnits / baselineUnits : (actualUnits > 0 ? Infinity : 0);
      
      const upliftMargin = upliftUnits * marginPerUnit;
      const roi = costTotal > 0 ? upliftMargin / costTotal : (upliftMargin > 0 ? Infinity : 0);

      let confidence: 'LOW'|'MEDIUM'|'HIGH' = 'LOW';
      if (windowWeeks >= 2 && upliftUnits >= 20 && executionScore >= 80) {
        confidence = 'HIGH';
      } else if (windowWeeks >= 1 && upliftUnits >= 10) {
        confidence = 'MEDIUM';
      }

      return {
        upliftUnits,
        liftPct,
        roi,
        confidence,
        revenueAttributed: upliftMargin,
      };
}

// Re-exportamos para mantener consistencia con la versión anterior que usaba un hook.
export const getAttributedRevenue = async (accountId: string, startISO: string, endISO: string, windowDays: number, appliesToSkuIds?: string[]) => {
  // Esta función debe ser implementada según la lógica de negocio
  return { revenue: 0, ordersCount: 0 };
};

export const estimateLiftPct = async (accountId: string, startISO: string, endISO: string, lookbackDays: number) => {
  // Esta función debe ser implementada
  return { liftPct: 0, confidence: 'LOW' };
};
