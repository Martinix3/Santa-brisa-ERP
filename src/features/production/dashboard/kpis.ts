import type { Material, ProductionOrder, BillOfMaterial, InventoryItem, Lot } from "@/domain/ssot";
import { isSameDay, seriesDays } from "./utils";

type Input = { orders: ProductionOrder[]; recipes: BillOfMaterial[]; inventory: InventoryItem[]; lots: Lot[]; materials: Material[] };

const sum = (a:number[]) => a.reduce((x,y)=>x+y,0);
const avg = (a:number[]) => a.length? sum(a)/a.length : 0;

export function computeKpis({ orders, recipes, inventory, lots, materials }: Input){
  const now = new Date();
  const last30 = new Date(now.getTime() - 30*24*60*60*1000);

  const count = (s: ProductionOrder["status"]) => orders.filter(o=>o.status===s).length;

  const doneLast30 = orders.filter(o=>o.status==='done' && o.execution?.finishedAt && new Date(o.execution.finishedAt) >= last30);
  const totalBottles30 = sum(doneLast30.map(o => o.execution?.goodBottles || 0));
  const avgCostBottle30 = avg(doneLast30.map(o => o.costing?.actual?.perUnit || 0));
  const avgYield30 = avg(doneLast30.map(o => o.costing?.actual?.yieldLossPct ? 100 - o.costing.actual.yieldLossPct : 0));

  // Shortages: toma los planned con shortages
  const currentShortages = orders.filter(o => o.status==='planned' && (o.shortages?.length)).flatMap(o => o.shortages!.map(s => ({ orderId:o.id, ...s })));

  // Inventario crítico (heurística simple): materiales con qty total < minQty (o < X uom)
  const byMaterial: Record<string, number> = {};
  for(const it of inventory){
    if(!it?.sku) continue;
    byMaterial[it.sku] = (byMaterial[it.sku]||0) + (it.qty || 0);
  }
  const criticalInventory = Object.entries(byMaterial)
    .filter(([sku, qty]) => {
        const mat = materials.find(m => m.sku === sku);
        if (mat?.category === 'raw' && qty <= 10) return true;
        if (mat?.category === 'packaging' && qty <= 100) return true;
        return false;
    })
    .slice(0, 12)
    .map(([sku, qty]) => ({ sku, qty }));

  // Series para progress (botellas por día plan vs real)
  const daysBack = 30;
  const progressSeries = seriesDays(daysBack).map(d => {
    const plannedOrders = orders.filter(o=>o.scheduledFor && isSameDay(new Date(o.scheduledFor), d));
    const plannedBottles = sum(plannedOrders.map(po => {
        const recipe = recipes.find(r => r.id === po.bomId);
        if (!recipe) return 0;
        const bottleLine = recipe.items.find(i => {
            const material = materials.find(m => m.id === i.materialId);
            return material?.category === 'packaging' && material.name.toLowerCase().includes('botella');
        });
        if (!bottleLine) return 0;
        return Math.floor((po.targetQuantity / recipe.batchSize) * (bottleLine.quantity || 0));
    }));
    const real = orders.filter(o=>o.status==='done' && o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d)).reduce((a,o)=>a+(o.execution?.goodBottles||0),0);
    return { date: d.toISOString().slice(0,10), planned: plannedBottles, real };
  });

  // Series de eficiencia (MO horas y coste/botella en últimos 30 días)
  const laborSeries = seriesDays(daysBack).map(d => {
    const dayOrders = doneLast30.filter(o => o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d));
    const hours = sum(dayOrders.map(o => o.execution?.durationHours || 0));
    return { date: d.toISOString().slice(0,10), hours };
  });
  const costPerBottleSeries = seriesDays(daysBack).map(d => {
    const dayOrders = doneLast30.filter(o => o.execution?.finishedAt && isSameDay(new Date(o.execution.finishedAt), d));
    const cpb = avg(dayOrders.map(o => o.costing?.actual?.perUnit || 0));
    return { date: d.toISOString().slice(0,10), cpb };
  });

  return {
    counters: {
      planned: count('planned'), released: count('released'), wip: count('wip'), done: count('done'), cancelled: count('cancelled')
    },
    totalBottles30, avgCostBottle30, avgYield30,
    currentShortages, criticalInventory,
    progressSeries, laborSeries, costPerBottleSeries,
  };
}
