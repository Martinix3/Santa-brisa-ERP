import type { ProductionOrder, BillOfMaterial, OnHandView, Item } from "@/domain/ssot";
import { isSameDay, seriesDays } from "./utils";

type Input = { orders: ProductionOrder[]; recipes: BillOfMaterial[]; inventory: OnHandView[]; items: Item[] };

const sum = (a:number[]) => a.reduce((x,y)=>x+y,0);
const avg = (a:number[]) => a.length? sum(a)/a.length : 0;

export function computeKpis({ orders, recipes, inventory, items }: Input){
  const now = new Date();
  const last30 = new Date(now.getTime() - 30*24*60*60*1000);

  const count = (s: ProductionOrder["status"]) => orders.filter(o=>o.status===s).length;

  const doneLast30 = orders.filter(o=>o.status==='done' && o.execution?.finishedAt && new Date(o.execution.finishedAt) >= last30);
  const totalUnits30 = sum(doneLast30.map(o => o.execution?.goodUnits || 0));
  const avgCostUnit30 = avg(doneLast30.map(o => o.costing?.actual?.perUnit || 0));
  const avgYield30 = avg(doneLast30.map(o => o.costing?.actual?.yieldLossPct ? 100 - o.costing.actual.yieldLossPct : 100));

  // Shortages: logic would need to be re-implemented based on reservations and on-hand stock.
  const currentShortages: any[] = []; 

  // Inventario crítico
  const byItem: Record<string, number> = {};
  for(const it of inventory){
    if(!it?.itemId) continue;
    byItem[it.itemId] = (byItem[it.itemId]||0) + (it.qty || 0);
  }
  const criticalInventory = Object.entries(byItem)
    .map(([itemId, qty]) => {
        const item = items.find(m => m.id === itemId);
        if (!item) return null;
        let isCritical = false;
        if (item.category === 'raw' && qty <= 10) isCritical = true;
        if (item.category === 'pack' && qty <= 100) isCritical = true;
        return isCritical ? { sku: item.sku, name: item.name, qty } : null;
    })
    .filter(Boolean)
    .slice(0, 12) as { sku: string; name: string; qty: number }[];

  // Series para progress (unidades por día plan vs real)
  const daysBack = 30;
  const progressSeries = seriesDays(daysBack).map(d => {
    const plannedOrders = orders.filter(o=>o.scheduledFor && isSameDay(new Date(o.scheduledFor), d));
    const plannedUnits = sum(plannedOrders.map(po => {
        const recipe = recipes.find(r => r.id === po.bomId);
        if (!recipe) return 0;
        // This logic is simplified; a real version would calculate expected output units.
        return po.targetQuantity;
    }));
    const real = orders.filter(o=>o.status==='done' && o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d)).reduce((a,o)=>a+(o.execution?.goodUnits||0),0);
    return { date: d.toISOString().slice(5,10).replace('-', '/'), planned: plannedUnits, real };
  });

  // Series de eficiencia
  const laborSeries = seriesDays(daysBack).map(d => {
    const dayOrders = doneLast30.filter(o => o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d));
    const hours = sum(dayOrders.map(o => o.execution?.durationHours || 0));
    return { date: d.toISOString().slice(5,10).replace('-', '/'), hours };
  });
  const costPerUnitSeries = seriesDays(daysBack).map(d => {
    const dayOrders = doneLast30.filter(o => o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d));
    const cpu = avg(dayOrders.map(o => o.costing?.actual?.perUnit || 0));
    return { date: d.toISOString().slice(5,10).replace('-', '/'), cpu };
  });
  
  const overdueOrders = orders.filter(o => {
      const isLate = o.createdAt && new Date(o.createdAt) < new Date(Date.now() - 3 * 86400000); // >3 days old
      return (o.status === 'planned' || o.status === 'released') && isLate;
  }).length;
  
  const pendingQCLots = inventory.filter(l => l.quality?.qcStatus === 'hold').length;

  return {
    counters: {
      planned: count('planned'),
      released: count('released'),
      wip: count('wip'),
      done: count('done'),
      cancelled: count('cancelled')
    },
    doneLast30: doneLast30.length,
    overdueOrders,
    pendingQCLots,
    totalUnits30, avgCostUnit30, avgYield30,
    currentShortages, criticalInventory,
    progressSeries, laborSeries, costPerUnitSeries,
  };
}
