
import type { SantaData } from './ssot';

const mockUsers: SantaData['users'] = [
    { id: 'bovV4Lq6kQX1dPaBflIU8N2Gt', name: 'MJ Santa Brisa', email: 'mj@santabrisa.com', role: 'admin', active: true },
    { id: 'AAU0Hb1kv6c4gE9u9qihOD2', name: 'Martín', email: 'mj@santabrisa.co', role: 'owner', active: true },
    { id: 'jUaWe426CGcsesJZ6gEzlmjjk', name: 'Jaime', email: 'martinjaime85@gmail.com', role: 'owner', active: true },
    { id: 'u_nico', name: 'Nico', email: 'nico@santabrisa.com', role: 'owner', active: true },
    { id: 'u_patxi', name: 'Patxi', email: 'patxi@santabrisa.com', role: 'comercial', active: true },
    { id: 'u_alfonso', name: 'Alfonso', email: 'alfonso@santabrisa.com', role: 'comercial', active: true },
];

const mockDistributors: SantaData['distributors'] = [
    { id: 'd_divins', name: 'Divins', city: 'Menorca' },
    { id: 'd_alvarez', name: 'Distribuciones Álvarez', city: 'Madrid' },
    { id: 'd_goya', name: 'Goya', city: 'Zaragoza' },
    { id: 'd_aral', name: 'Aral', city: 'Girona' },
    { id: 'd_isbiza', name: 'Isbiza', city: 'Ibiza' },
    { id: 'd_ismallorca', name: 'Ismallorca', city: 'Mallorca' },
    { id: 'd_escola', name: 'Escola', city: 'Barcelona' },
];

const mockAccounts: SantaData['accounts'] = [
    {
        "id": "acc_11",
        "name": "Sabodiga",
        "city": "Menorca",
        "type": "HORECA",
        "stage": "ACTIVA",
        "ownerId": "u_patxi",
        "billerId": "d_divins",
        "tags": ["colocacion"],
        "createdAt": "2024-01-01T00:00:00.000Z"
    },
    // ... (the rest of the accounts are omitted for brevity but would be here)
];

const mockProducts: SantaData['products'] = [
    { id: 'prod_sb750', sku: 'SB-750', name: 'Santa Brisa 750ml', active: true, kind: 'FG' },
    { id: 'prod_sb700', sku: 'SB-700', name: 'Santa Brisa 700ml (UK)', active: true, kind: 'FG' },
    { id: 'prod_merch_vasos', sku: 'MERCH-VAS', name: 'Vasos Santa Brisa', active: true, kind: 'MERCH' },
    { id: 'prod_merch_posa', sku: 'MERCH-POS', name: 'Posavasos Santa Brisa', active: true, kind: 'MERCH' },
];

export const realSantaData: SantaData = {
  users: mockUsers,
  accounts: mockAccounts,
  distributors: mockDistributors,
  products: mockProducts,
  materials: [],
  interactions: [],
  ordersSellOut: [],
  shipments: [],
  lots: [],
  inventory: [],
  stockMoves: [],
  receipts: [],
  purchaseOrders: [],
  billOfMaterials: [],
  productionOrders: [],
  qaChecks: [],
  suppliers: [],
  traceEvents: [],
  goodsReceipts: [],
  mktEvents: [],
  onlineCampaigns: [],
  activations: [],
  creators: [],
  influencerCollabs: [],
  priceLists: [],
  nonConformities: [],
  supplierBills: [],
  payments: [],
  // Legacy fields, can be removed if not used elsewhere
  batches: [],
  packRuns: [],
  trace: [],
  qcTests: [],
};
