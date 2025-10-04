import type { ProductionOrder, BillOfMaterial, OnHandView, Item, ProductionStatus, QcStatus } from "@/domain/ssot";
import { isSameDay, seriesDays } from "./utils";

type Input = { orders: ProductionOrder[]; recipes: BillOfMaterial[]; onHand: OnHandView[]; items: Item[] };
type Shortage = { itemId: string; required: number; available: number; missing: number; uom: string };
type CriticalInventoryItem = { sku: string; name: string; qty: number };

// SOLUCIÓN: Se crea un tipo extendido localmente para manejar los estados faltantes.
// La solución permanente sería actualizar el tipo `QcStatus` en `src/domain/ssot.ts`.
type ExtendedQcStatus = QcStatus | 'PENDING' | 'HOLD';


// --- Constantes de Lógica de Negocio ---
// Mover estos valores a un archivo de configuración si es necesario.
const KPI_DAYS_BACK = 30;
const CRITICAL_RAW_THRESHOLD = 10;
const CRITICAL_PACK_THRESHOLD = 100;
const OVERDUE_DAYS_THRESHOLD = 3;


// --- Funciones de Utilidad ---
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => a.length ? sum(a) / a.length : 0;
const toISODate = (d: Date) => d.toISOString().split('T')[0];

export function computeKpis({ orders, recipes, onHand, items }: Input) {
  const now = new Date();
  const last30DaysDate = new Date(now.getTime() - KPI_DAYS_BACK * 24 * 60 * 60 * 1000);

  // --- Pre-cálculo de Mapas para Rendimiento (O(n)) ---
  const itemsMap = new Map(items.map(i => [i.id, i]));
  const recipesMap = new Map(recipes.map(r => [r.id, r]));
  const onHandByItem = onHand.reduce((acc, item) => {
    if (!acc.has(item.itemId)) acc.set(item.itemId, 0);
    acc.set(item.itemId, acc.get(item.itemId)! + (item.qty || 0));
    return acc;
  }, new Map<string, number>());
  
  // Agrupa órdenes por fecha para evitar filtrar repetidamente en los bucles de series
  const ordersByFinishedDate = new Map<string, ProductionOrder[]>();
  const ordersByScheduledDate = new Map<string, ProductionOrder[]>();
  for (const order of orders) {
    if (order.execution?.finishedAt) {
      const key = toISODate(new Date(order.execution.finishedAt));
      if (!ordersByFinishedDate.has(key)) ordersByFinishedDate.set(key, []);
      ordersByFinishedDate.get(key)!.push(order);
    }
    if (order.scheduledFor) {
      const key = toISODate(new Date(order.scheduledFor));
      if (!ordersByScheduledDate.has(key)) ordersByScheduledDate.set(key, []);
      ordersByScheduledDate.get(key)!.push(order);
    }
  }


  // --- Cálculos de KPIs ---
  const count = (s: ProductionStatus) => orders.filter(o => o.status === s).length;

  const doneLast30 = orders.filter(o => o.status === 'DONE' && o.execution?.finishedAt && new Date(o.execution.finishedAt) >= last30DaysDate);
  const totalUnits30 = sum(doneLast30.map(o => o.execution?.goodUnits || 0));
  const avgCostUnit30 = avg(doneLast30.map(o => o.costing?.actual?.perUnit || 0));
  const avgYield30 = avg(doneLast30.map(o => o.costing?.actual?.yieldLossPct ? 100 - o.costing.actual.yieldLossPct : 100));

  const currentShortages: Shortage[] = orders
    .filter(o => o.status === 'PLANNED')
    .flatMap(o => o.shortages || [])
    .filter((s): s is Shortage => !!s); // Filtro para asegurar el tipo

  const criticalInventory: CriticalInventoryItem[] = Array.from(onHandByItem.entries())
    .map(([itemId, qty]) => {
      const item = itemsMap.get(itemId);
      if (!item) return null;
      
      const isCriticalRaw = item.category === 'raw' && qty <= CRITICAL_RAW_THRESHOLD;
      const isCriticalPack = item.category === 'pack' && qty <= CRITICAL_PACK_THRESHOLD;
      
      return (isCriticalRaw || isCriticalPack) ? { sku: item.sku, name: item.name, qty } : null;
    })
    .filter((item): item is CriticalInventoryItem => !!item)
    .slice(0, 12);

  // --- Cálculos de Series (Ahora más eficientes usando los mapas pre-calculados) ---
  const dateSeries = seriesDays(KPI_DAYS_BACK);

  const progressSeries = dateSeries.map(d => {
    const key = toISODate(d);
    const plannedOrders = ordersByScheduledDate.get(key) || [];
    const finishedOrders = (ordersByFinishedDate.get(key) || []).filter(o => o.status === 'DONE');
    
    const plannedUnits = sum(plannedOrders.map(po => po.targetQuantity || 0));
    const realUnits = sum(finishedOrders.map(o => o.execution?.goodUnits || 0));
    
    return { date: d.toISOString().slice(5, 10).replace('-', '/'), planned: plannedUnits, real: realUnits };
  });

  const laborSeries = dateSeries.map(d => {
    const dayOrders = (ordersByFinishedDate.get(toISODate(d)) || []).filter(o => new Date(o.execution!.finishedAt!) >= last30DaysDate && o.status === 'DONE');
    const hours = sum(dayOrders.map(o => o.execution?.durationHours || 0));
    return { date: d.toISOString().slice(5, 10).replace('-', '/'), hours };
  });

  const costPerUnitSeries = dateSeries.map(d => {
    const dayOrders = (ordersByFinishedDate.get(toISODate(d)) || []).filter(o => new Date(o.execution!.finishedAt!) >= last30DaysDate && o.status === 'DONE');
    const cpu = avg(dayOrders.map(o => o.costing?.actual?.perUnit || 0));
    return { date: d.toISOString().slice(5, 10).replace('-', '/'), cpu };
  });
  
  const overdueOrders = orders.filter(o => {
      const isOverdue = o.createdAt && new Date(o.createdAt) < new Date(Date.now() - OVERDUE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
      return (o.status === 'PLANNED' || o.status === 'RELEASED') && isOverdue;
  }).length;
  
  const pendingQCLots = onHand.filter(l => {
    const status = l.qcStatus as ExtendedQcStatus;
    return (status === 'PENDING' || status === 'HOLD') && l.locationId && !l.locationId.startsWith('RM/');
  }).length;

  return {
    counters: {
      planned: count('PLANNED'),
      released: count('RELEASED'),
      wip: count('IN_PROGRESS'),
      done: count('DONE'),
      cancelled: count('CANCELLED')
    },
    doneLast30: doneLast30.length,
    overdueOrders,
    pendingQCLots,
    totalUnits30, avgCostUnit30, avgYield30,
    currentShortages, criticalInventory,
    progressSeries, laborSeries, costPerUnitSeries,
  };
}