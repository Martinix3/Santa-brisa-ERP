
// domain/ssot.helpers.ts
import { mockSantaData } from './mock-data';
import type { SantaData, BillOfMaterial, Material, ProductionOrder, Lot, Creator, InfluencerCollab } from './ssot';

// --- INTERFAZ ADAPTADOR ---
export interface SSOTAdapter {
  getAccounts: () => Promise<any[]>;
  getProducts: () => Promise<any[]>;
  getOrders: () => Promise<any[]>;
  getUsers: () => Promise<any[]>;
  getDistributors: () => Promise<any[]>;
  getInteractions: () => Promise<any[]>;
  getFullDump: () => Promise<SantaData>;
  // Production
  getMaterials: () => Promise<Material[]>;
  getBoms: () => Promise<BillOfMaterial[]>;
  createRecipe: (recipe: BillOfMaterial) => Promise<void>;
  updateRecipe: (id: string, patch: Partial<BillOfMaterial>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getProductionOrders: () => Promise<ProductionOrder[]>;
  getLots: () => Promise<Lot[]>;
  getLotTrace: (lotId: string) => Promise<any>;
  // Marketing
  getMktEvents: () => Promise<any[]>;
  getOnlineCampaigns: () => Promise<any[]>;
  // Influencers
  getCreators: () => Promise<Creator[]>;
  getInfluencerCollabs: () => Promise<InfluencerCollab[]>;
}

export function traceBackFromLot(lotId: string, traceEvents: SantaData['trace']) {
  const finalProductEvent = traceEvents.find(e => e.type === 'produce' && e.meta?.toLot === lotId);
  if (!finalProductEvent) return null;

  const orderId = finalProductEvent.meta?.orderId;
  const consumedInOrder = traceEvents.filter(e => e.type === 'consume' && e.meta?.orderId === orderId);

  return {
    targetLotId: lotId,
    order: {
      id: orderId,
      at: finalProductEvent.at,
    },
    consumed: consumedInOrder.map(e => ({
      materialId: e.materialId,
      qty: e.qty,
      fromLot: e.meta?.fromLot,
    })),
  };
}


// --- IMPLEMENTACIÓN EN MEMORIA (para prototipado y tests) ---
export class MemoryAdapter implements SSOTAdapter {
  private data: SantaData;

  constructor(seed: Partial<SantaData> = {}) {
    this.data = { ...mockSantaData, ...seed };
  }

  async getAccounts() { return this.data.accounts; }
  async getProducts() { return this.data.products; }
  async getOrders() { return this.data.ordersSellOut; }
  async getUsers() { return this.data.users; }
  async getDistributors() { return this.data.distributors; }
  async getInteractions() { return this.data.interactions; }
  async getFullDump() { return this.data; }
  async getMaterials() { return this.data.materials; }
  async getBoms() { return this.data.billOfMaterials; }
  
  async createRecipe(recipe: BillOfMaterial): Promise<void> {
    this.data.billOfMaterials.unshift(recipe);
  }

  async updateRecipe(id: string, patch: Partial<BillOfMaterial>): Promise<void> {
    const index = this.data.billOfMaterials.findIndex(b => b.id === id);
    if (index !== -1) {
      this.data.billOfMaterials[index] = { ...this.data.billOfMaterials[index], ...patch } as BillOfMaterial;
    }
  }

  async deleteRecipe(id: string): Promise<void> {
    this.data.billOfMaterials = this.data.billOfMaterials.filter(b => b.id !== id);
  }

  async getProductionOrders() { return this.data.productionOrders; }
  async getLots(): Promise<Lot[]> { return this.data.lots; }
  async getLotTrace(lotId:string) { return traceBackFromLot(lotId, this.data.trace); }
  async getMktEvents() { return this.data.mktEvents || []; }
  async getOnlineCampaigns() { return this.data.onlineCampaigns || []; }
  async getCreators() { return this.data.creators || []; }
  async getInfluencerCollabs() { return this.data.influencerCollabs || []; }
}

// --- SMOKE TESTS ---
export function runSmokeTests() {
  const data = mockSantaData;
  const details = {} as any;
  let pass = true;

  const fkErrors: string[] = [];
  data.ordersSellOut.forEach(o => {
    if (!data.accounts.some(a => a.id === o.accountId)) fkErrors.push(`Order ${o.id} -> Account ${o.accountId} not found`);
    if (o.distributorId && !data.distributors.some(d => d.id === o.distributorId)) fkErrors.push(`Order ${o.id} -> Distributor ${o.distributorId} not found`);
    o.lines.forEach(l => {
      if (!data.products.some(p => p.sku === l.sku)) fkErrors.push(`Order ${o.id} -> Product SKU ${l.sku} not found`);
    });
  });
  details.fk_validation = { pass: fkErrors.length === 0, errors: fkErrors };

  const bom = data.billOfMaterials[0];
  if (bom && bom.items) {
    const cost = bom.items.reduce((acc, item) => {
      const mat = data.materials.find(m => m.id === item.materialId);
      return acc + (mat?.standardCost || 0) * item.quantity;
    }, 0);
    const costOk = cost > 100;
    details.bom_cost_rollup = { pass: costOk, message: `BOM cost for ${bom.sku} is ${cost.toFixed(2)}` };
  } else {
    details.bom_cost_rollup = { pass: false, message: `BOM or BOM items not found for ${bom?.sku}` };
  }
  
  const trace = traceBackFromLot('SB750-2024-09-10-A', data.trace);
  const traceOk = trace && trace.consumed.length > 0 && trace.order.id === 'MO-24-003';
  details.traceability = { pass: !!traceOk, message: traceOk ? `Trace OK: Found ${trace.consumed.length} consumed items for lot.` : 'Trace failed or incomplete.' };

  pass = Object.values(details).every((d: any) => d.pass);

  return { pass, details };
}
