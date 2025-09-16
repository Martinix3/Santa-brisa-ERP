// domain/ssot.dataset.ts - SantaData (super-tipo) + helpers canónicos
export * from "./ssot.core";
export * from "./ssot.sales";
export * from "./ssot.production";
export * from "./ssot.inventory";
export * from "./ssot.procurement";
export * from "./ssot.marketing";

import type {
  User, Account, Product, PriceList, Material
} from "./ssot.core";
import type { Interaction, OrderSellOut } from './ssot.sales';
import type { Lot, QACheck, NonConformity, Batch, PackRun, TraceEvent } from './ssot.production';
import type { StockMove, Shipment } from './ssot.inventory';
import type { Receipt, SupplierBill, Payment } from './ssot.procurement';
import type { OnlineCampaign, Activation, EventMarketing } from './ssot.marketing';
import type { Creator, InfluencerCollab } from './influencers';


export type SantaData = {
  // Maestros
  users: User[];
  accounts: Account[];
  products: Product[];
  materials: Material[];
  priceLists: PriceList[];
  // Comercial/Ventas
  interactions: Interaction[];
  ordersSellOut: OrderSellOut[];
  // Producción & Calidad
  lots: Lot[];
  batches: Batch[];
  packRuns: PackRun[];
  qaChecks: QACheck[];
  nonConformities: NonConformity[];
  // Inventario/Logística
  stockMoves: StockMove[];
  shipments: Shipment[];
  // Compras/Proveedores/Finanzas
  receipts: Receipt[];
  supplierBills: SupplierBill[];
  payments: Payment[];
  // Marketing
  mktEvents: EventMarketing[];
  onlineCampaigns: OnlineCampaign[];
  activations: Activation[];
  // Influencers
  creators: Creator[];
  influencerCollabs: InfluencerCollab[];
  // Trazabilidad
  traceEvents: TraceEvent[];

  // DEPRECATED - to be removed
  distributors: any[];
  billOfMaterials: any[];
  productionOrders: any[];
  trace: any[];
  qcTests: any[];
  inventory: any[];
  goodsReceipts: any[];
  suppliers: any[];
  purchaseOrders: any[];
};

// Helpers canónicos que ya usas
export function inWindow(iso: string, start: number|Date, end: number|Date) {
  const t = +new Date(iso);
  const s = +new Date(start);
  const e = +new Date(end);
  return t >= s && t <= e;
}
export function orderTotal(o: { totalAmount?: number; lines: { priceUnit:number; qty:number; discount?:number }[] }) {
  if (typeof o.totalAmount === 'number') return o.totalAmount;
  if (!o || !o.lines) return 0;
  return o.lines.reduce((s, l) => s + l.priceUnit * l.qty * (1 - (l.discount || 0)), 0);
}
