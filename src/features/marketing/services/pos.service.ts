
'use client';
import type { Interaction, SantaData, PosResult, OrderSellOut } from "@/domain";
import { useData } from "@/lib/dataprovider";

// Helper para obtener las ventas semanales de un local
async function fetchSelloutWeekly(
  accountId: string,
  from: string,
  to: string,
  orders: OrderSellOut[]
): Promise<Array<{ weekISO: string; units: number }>> {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const relevantOrders = orders.filter(o =>
    o.accountId === accountId &&
    new Date(o.createdAt) >= fromDate &&
    new Date(o.createdAt) <= toDate
  );

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

// Helper para obtener las ventas de las semanas de baseline
async function fetchBaselineWeeks(
  accountId: string,
  from: string,
  weeksBack: number,
  orders: OrderSellOut[]
): Promise<Array<{ weekISO: string; units: number; isPromo?: boolean }>> {
  const fromDate = new Date(from);
  const baselineStartDate = new Date(fromDate.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000);
  
  const weeklyData = await fetchSelloutWeekly(accountId, baselineStartDate.toISOString(), from, orders);
  
  // Aquí se podría añadir la lógica para marcar semanas con promoción si ese dato existiera
  return weeklyData.map(d => ({ ...d, isPromo: false }));
}


// Hook principal que encapsula la lógica de negocio
export function usePosTactics() {
  const { data, setData, saveCollection } = useData();

  const createOrUpdatePosTactic = async (
    interactionId: string,
    input: {
      tacticCode: string;
      startDate: string;
      endDate?: string;
      costTotal: number;
      executionScore: number;
      appliesToSkuIds?: string[];
      exposure?: { unitsGiven?: number; staffIncentivized?: number };
      photos?: string[];
    }
  ): Promise<Interaction> => {
    if (!data) throw new Error("Datos no disponibles");

    const interaction = data.interactions.find(i => i.id === interactionId);
    if (!interaction) throw new Error("Interacción no encontrada");

    const updatedInteraction = {
      ...interaction,
      posTactic: input,
      linkedEntity: { type: 'ACCOUNT', id: interaction.accountId! }
    } as Interaction;

    await saveCollection('interactions', data.interactions.map(i => i.id === interactionId ? updatedInteraction : i));

    return updatedInteraction;
  };

  const computePosResult = async (args: {
      accountId: string;
      startDate: string;
      endDate: string;
      costTotal: number;
      executionScore: number;
      marginPerUnit?: number;
      weeksBackBaseline?: number;
    }): Promise<PosResult> => {
      
      const { accountId, startDate, endDate, costTotal, executionScore, marginPerUnit = 8, weeksBackBaseline = 4 } = args;
      if (!data) throw new Error("Datos no disponibles");

      const baselineWeeksData = await fetchBaselineWeeks(accountId, startDate, weeksBackBaseline, data.ordersSellOut);
      const activeWeeksData = await fetchSelloutWeekly(accountId, startDate, endDate, data.ordersSellOut);
      
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
        windowWeeks,
        baselineUnits,
        actualUnits,
        upliftUnits,
        liftPct,
        marginPerUnit,
        upliftMargin,
        roi,
        confidence,
        computedAt: new Date().toISOString(),
      };
  };

  const closePosTactic = async (
    interactionId: string,
    opts: { marginPerUnit?: number; weeksBackBaseline?: number } = {}
  ): Promise<{ result: PosResult; interaction: Interaction }> => {
    if (!data) throw new Error("Datos no disponibles");

    const interaction = data.interactions.find(i => i.id === interactionId);
    if (!interaction?.posTactic) throw new Error("No es una táctica POS válida");

    const result = await computePosResult({
      accountId: interaction.accountId!,
      startDate: interaction.posTactic.startDate,
      endDate: interaction.posTactic.endDate || new Date().toISOString(),
      costTotal: interaction.posTactic.costTotal,
      executionScore: interaction.posTactic.executionScore,
      ...opts,
    });

    const updatedInteraction = {
      ...interaction,
      status: 'closed',
      posTacticResult: result,
    } as Interaction;

    await saveCollection('interactions', data.interactions.map(i => i.id === interactionId ? updatedInteraction : i));

    return { result, interaction: updatedInteraction };
  };

  return { createOrUpdatePosTactic, closePosTactic, computePosResult };
}
