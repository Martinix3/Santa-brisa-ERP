
// src/domain/mock-data.ts
import type { SantaData, BillOfMaterial, GoodsReceipt } from './ssot';
import { isoDaysAgo } from './ssot';

// --- Users & Accounts (Proveedores, Clientes, Distribuidores) ---
export const USERS: SantaData['users'] = [
  { id: 'u_admin', name: 'Admin', email: 'admin@santabrisa.com', role: 'admin', active: true },
  { id: 'u_ana', name: 'Ana Ruiz', email: 'ana@santabrisa.com', role: 'comercial', active: true },
  { id: 'u_marcos', name: 'Marcos Gil', email: 'marcos@santabrisa.com', role: 'comercial', active: true },
  { id: 'u_sofia', name: 'Sofía Vega', email: 'ops@santabrisa.com', role: 'ops', active: true },
  { id: 'u_martin', name: 'Martín', email: 'mj@santabrisa.com', role: 'owner', active: true },
  { id: 'u_miguel', name: 'Miguel', email: 'mo@santabrisa.com', role: 'admin', active: true },
  { id: 'u_alfonso', name: 'Alfonso', email: 'alfonso@santabrisa.com', role: 'comercial', active: true },
  { id: 'u_patxi', name: 'Patxi', email: 'patxi@santabrisa.com', role: 'comercial', active: true },
  { id: 'u_nico', name: 'Nico', email: 'nico@santabrisa.com', role: 'comercial', active: true },
];

export const SUPPLIERS: SantaData['suppliers'] = [
    { id: 'SUP-001', name: 'Agave Spirits Inc.', country: 'MX' },
    { id: 'SUP-002', name: 'Citrus World', country: 'ES' },
    { id: 'SUP-003', name: 'VidrioForma', country: 'PT' },
];

export const DISTRIBUTORS: SantaData['distributors'] = [
  { id: 'd_rivera', name: 'Distribuciones Rivera', city: 'Barcelona' },
  { id: 'd_andes', name: 'Importadora Andes', city: 'Valencia' },
];

export const ACCOUNTS: SantaData['accounts'] = [
  { id: 'acc_1', name: 'Bares Paco S.L.', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_ana', biller: 'SB' }, salesRepId: 'u_ana', createdAt: isoDaysAgo(180) },
  { id: 'acc_2', name: 'Hotel Marítimo', city: 'Valencia', type: 'HORECA', stage: 'POTENCIAL', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_marcos', biller: 'SB' }, salesRepId: 'u_marcos', createdAt: isoDaysAgo(30) },
  { id: 'acc_3', name: 'Restaurante Roca', city: 'Girona', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'COLOCACION', ownerUserId: 'u_alfonso', billerPartnerId: 'd_rivera' }, distributorId: 'd_rivera', salesRepId: 'u_alfonso', createdAt: isoDaysAgo(45) },
  { id: 'acc_4', name: 'Coctelería Oasis', city: 'Marbella', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'COLOCACION', ownerUserId: 'u_patxi', billerPartnerId: 'd_andes' }, distributorId: 'd_andes', salesRepId: 'u_patxi', createdAt: isoDaysAgo(60) },
  { id: 'acc_5', name: 'Terraza del Mar', city: 'Ibiza', type: 'HORECA', stage: 'SEGUIMIENTO', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_nico', biller: 'SB' }, salesRepId: 'u_nico', createdAt: isoDaysAgo(15) },
  { id: 'acc_6', name: 'Supermercado Sol', city: 'Madrid', type: 'RETAIL', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_ana', biller: 'SB' }, salesRepId: 'u_ana', createdAt: isoDaysAgo(120) },
  { id: 'acc_7', name: 'Club Nocturno Eclipse', city: 'Barcelona', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'COLOCACION', ownerUserId: 'u_marcos', billerPartnerId: 'd_rivera' }, distributorId: 'd_rivera', salesRepId: 'u_marcos', createdAt: isoDaysAgo(80) },
  { id: 'acc_8', name: 'Tienda Gourmet Delicias', city: 'Bilbao', type: 'RETAIL', stage: 'SEGUIMIENTO', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_alfonso', biller: 'SB' }, salesRepId: 'u_alfonso', createdAt: isoDaysAgo(25) },
  { id: 'acc_9', name: 'Beach Club Arena', city: 'Formentera', type: 'HORECA', stage: 'FALLIDA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_nico', biller: 'SB' }, salesRepId: 'u_nico', createdAt: isoDaysAgo(50) },
  { id: 'acc_10', name: 'Bar de Tapas El Rincón', city: 'Sevilla', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_patxi', biller: 'SB' }, salesRepId: 'u_patxi', createdAt: isoDaysAgo(200) },
];


// --- Productos y Materiales ---
export const PRODUCTS: SantaData['products'] = [
  { id:'p_santabrisa', sku:'SB-750', name:'Santa Brisa 750ml', kind: 'FG', uom: 'bottle', bottleMl: 750, caseUnits: 6, active:true, materialId: 'mat_sb_750' },
  { id:'p_marg_classic', sku:'SB-MARG-CL-700', name:'Margarita Clásica 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_cl' },
  { id:'p_marg_spicy', sku:'SB-MARG-SP-700', name:'Margarita Picante 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_sp' },
  { id:'p_merch_vasos', sku:'MERCH-VAS', name:'Vasos Merchandising', kind: 'MERCH', uom: 'ud', active: true, materialId: 'mat_merch_vas' },
];

export const MATERIALS: SantaData['materials'] = [
  { id: 'mat_teq_base', sku: 'MP-TEQ-BASE', name: 'Tequila base', category: 'raw', unit: 'L', standardCost: 20 },
  { id: 'mat_lime_conc', sku: 'MP-LIME-CONC', name: 'Concentrado lima', category: 'raw', unit: 'L', standardCost: 5 },
  { id: 'mat_agave_syr', sku: 'MP-AGAVE-SYR', name: 'Sirope de agave (cocktail)', category: 'raw', unit: 'L', standardCost: 8 },
  { id: 'mat_sb_750', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'finished_good', unit: 'ud', standardCost: 8.5 },
  { id: 'mat_marg_cl', sku: 'SB-MARG-CL-700', name: 'Margarita Clásica 700ml', category: 'finished_good', unit: 'ud', standardCost: 9.2 },
  { id: 'mat_marg_sp', sku: 'SB-MARG-SP-700', name: 'Margarita Picante 700ml', category: 'finished_good', unit: 'ud', standardCost: 9.5 },
  { id: 'mat_merch_vas', sku: 'MERCH-VAS', name: 'Vasos Merchandising', category: 'merchandising', unit: 'ud', standardCost: 1.5 },
];

export const BOMS: BillOfMaterial[] = [
    { id: 'bom_marg_classic', sku: 'SB-MARG-CL-700', name: 'Receta Margarita Clásica', batchSize: 100, baseUnit: 'L', items: [
        { materialId: 'mat_teq_base', quantity: 45, unit: 'L' },
        { materialId: 'mat_lime_conc', quantity: 30, unit: 'L' },
        { materialId: 'mat_agave_syr', quantity: 25, unit: 'L' },
    ]},
    { id: 'bom_sb_750', sku: 'SB-750', name: 'Receta Santa Brisa 750ml', batchSize: 100, baseUnit: 'L', items: [] },
];

// --- Ventas y Marketing ---
export const ORDERS_SELL_OUT: SantaData['ordersSellOut'] = [
  // Pedidos de venta directa (PROPIA_SB)
  { id:'ORD-SB-240901-001', accountId:'acc_1', userId: 'u_ana', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(15), lines:[{ sku:'SB-750', qty:5, unit:'caja', priceUnit:90 }] },
  { id:'ORD-SB-240910-002', accountId:'acc_6', userId: 'u_ana', status:'shipped', currency:'EUR', createdAt: isoDaysAgo(6), lines:[{ sku:'SB-750', qty:20, unit:'caja', priceUnit:88 }] },
  { id:'ORD-SB-240912-003', accountId:'acc_10', userId: 'u_patxi', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(4), lines:[{ sku:'SB-MARG-CL-700', qty:3, unit:'caja', priceUnit:95 }] },
  { id:'ORD-SB-240914-004', accountId:'acc_5', userId: 'u_nico', status:'open', currency:'EUR', createdAt: isoDaysAgo(2), lines:[{ sku:'SB-750', qty:8, unit:'caja', priceUnit:92 }] },

  // Pedidos de colocación (COLOCACION)
  { id:'ORD-DST-240820-001', accountId:'acc_3', distributorId:'d_rivera', userId: 'u_alfonso', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(26), lines:[{ sku:'SB-750', qty:10, unit:'caja', priceUnit:85 }] },
  { id:'ORD-DST-240825-002', accountId:'acc_4', distributorId:'d_andes', userId: 'u_patxi', status:'shipped', currency:'EUR', createdAt: isoDaysAgo(21), lines:[{ sku:'SB-MARG-CL-700', qty:15, unit:'caja', priceUnit:90 }] },
  { id:'ORD-DST-240905-003', accountId:'acc_7', distributorId:'d_rivera', userId: 'u_marcos', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(11), lines:[{ sku:'SB-750', qty:25, unit:'caja', priceUnit:84 }] },
  { id:'ORD-DST-240913-004', accountId:'acc_3', distributorId:'d_rivera', userId: 'u_alfonso', status:'open', currency:'EUR', createdAt: isoDaysAgo(3), lines:[{ sku:'SB-MARG-SP-700', qty:5, unit:'caja', priceUnit:98 }] },
];

export const INTERACTIONS: SantaData['interactions'] = [
  { id:'int_1', accountId:'acc_1', userId:'u_ana',   kind:'VISITA', note:'Cliente contento, stock bajo.', createdAt: isoDaysAgo(16), dept:'VENTAS' },
  { id:'int_2', accountId:'acc_2', userId:'u_marcos', kind:'LLAMADA', note:'Llamada de seguimiento, agendada visita para la semana que viene.', createdAt: isoDaysAgo(4), dept:'VENTAS' },
  { id:'int_3', accountId:'acc_3', userId:'u_alfonso', kind:'VISITA', note:'Revisión de stock con el distribuidor. Todo OK.', createdAt: isoDaysAgo(27), dept:'VENTAS' },
  { id:'int_4', accountId:'acc_4', userId:'u_patxi', kind:'EMAIL', note:'Email confirmando recepción del último pedido.', createdAt: isoDaysAgo(20), dept:'VENTAS' },
  { id:'int_5', accountId:'acc_5', userId:'u_nico', kind:'VISITA', note:'Presentación de nuevos cocktails. Interesados en el picante.', createdAt: isoDaysAgo(3), dept:'VENTAS' },
  { id:'int_6', accountId:'acc_8', userId:'u_alfonso', kind:'VISITA', note:'Primera visita. Dejadas muestras. Potencial para entrar en 1 mes.', createdAt: isoDaysAgo(2), dept:'VENTAS' },
];

// --- Cadena de Trazabilidad Completa ---
export const GOODS_RECEIPTS: GoodsReceipt[] = [
    { id: 'GR-001', supplierId: 'SUP-001', expectedAt: isoDaysAgo(10), receivedAt: isoDaysAgo(9), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-001' }], externalRef: 'ALB-SUP1-100', createdAt: isoDaysAgo(10) },
    { id: 'GR-002', supplierId: 'SUP-001', expectedAt: isoDaysAgo(12), receivedAt: isoDaysAgo(11), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-002', supplierLotNumber: 'AGV-JAL-23-F1-A' }], externalRef: 'ALB-SUP1-105', createdAt: isoDaysAgo(12) },
    { id: 'GR-003', supplierId: 'SUP-002', expectedAt: isoDaysAgo(15), receivedAt: isoDaysAgo(14), lines: [{ materialId: 'mat_lime_conc', qty: 500, lotNumber: 'LOTE-LIMA-001' }], externalRef: 'ALB-SUP2-200', createdAt: isoDaysAgo(15) },
];

export const PRODUCTION_ORDERS: SantaData['productionOrders'] = [
  { id: 'MO-24-006', sku: 'SB-MARG-CL-700', bomId: 'bom_marg_classic', targetQuantity: 100, status: 'done', createdAt: isoDaysAgo(22), lotId: 'MARG-CL-240825-001', plannedQty: 100,
    protocolChecks: [ { id: 'temp_control', text: 'Control de Temperatura', done: true, checkedAt: isoDaysAgo(22), checkedBy: 'u_sofia' } ],
    incidents: [],
  },
  { id: 'MO-24-007', sku: 'SB-750', bomId: 'bom_sb_750', targetQuantity: 200, status: 'done', createdAt: isoDaysAgo(18), lotId: 'SB750-240828-001', plannedQty: 200 },
  { id: 'MO-24-008', sku: 'SB-MARG-SP-700', bomId: 'bom_marg_spicy', targetQuantity: 50, status: 'pending', createdAt: isoDaysAgo(1), plannedQty: 50 },
];

export const LOTS: SantaData['lots'] = [
    { id: 'LOTE-TEQ-001', sku: 'MP-TEQ-BASE', kind: 'RM', quantity: 1000, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(9) }, createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(9), quality: {qcStatus: 'release', results: {}} },
    { id: 'LOTE-TEQ-002', sku: 'MP-TEQ-BASE', kind: 'RM', quantity: 955, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(11) }, createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(11), quality: {qcStatus: 'release', results: {}} },
    { id: 'LOTE-LIMA-001', sku: 'MP-LIME-CONC', kind: 'RM', quantity: 470, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(14) }, createdAt: isoDaysAgo(14), updatedAt: isoDaysAgo(14), quality: {qcStatus: 'release', results: {}} },
    { id: 'MARG-CL-240825-001', sku: 'SB-MARG-CL-700', kind: 'FG', quantity: 140, status: 'APPROVED', dates: { producedAt: isoDaysAgo(22) }, trace: { parentBatchId: 'MO-24-006' }, createdAt: isoDaysAgo(22), updatedAt: isoDaysAgo(22), quality: {qcStatus: 'release', results: {ph: {value: 3.5, status: 'ok'}}} },
    { id: 'SB750-240828-001', sku: 'SB-750', kind: 'FG', quantity: 280, status: 'APPROVED', dates: { producedAt: isoDaysAgo(18) }, trace: { parentBatchId: 'MO-24-007' }, createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(18), quality: {qcStatus: 'release', results: {ph: {value: 3.4, status: 'ok'}}} },
    { id: 'SB750-240910-001', sku: 'SB-750', kind: 'FG', quantity: 150, status: 'QUARANTINE', dates: { producedAt: isoDaysAgo(6) }, trace: { parentBatchId: 'MO-24-009' }, createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(6), quality: {qcStatus: 'hold', results: {}} },
];

export const QC_TESTS: SantaData['qaChecks'] = [
  { id: 'qc1', lotId: 'MARG-CL-240825-001', scope: 'RELEASE', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(22), createdAt: isoDaysAgo(22), checklist: [ { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.5 } ]},
  { id: 'qc2', lotId: 'SB750-240828-001', scope: 'RELEASE', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(18), createdAt: isoDaysAgo(18), checklist: [ { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.4 } ]},
];

export const TRACE_EVENTS: SantaData['traceEvents'] = [];

export const INVENTORY: SantaData['inventory'] = [
    ...LOTS.filter(l => l.kind === 'RM').map(l => ({ id: `inv_${l.id}`, sku: l.sku, lotNumber: l.id, uom: 'L' as const, qty: l.quantity || 0, locationId: 'RM/MAIN', updatedAt: l.updatedAt || '', expDate: l.expDate })),
    ...LOTS.filter(l => l.kind === 'FG').map(l => ({ id: `inv_${l.id}`, sku: l.sku, lotNumber: l.id, uom: 'ud' as const, qty: l.quantity || 0, locationId: 'FG/MAIN', updatedAt: l.updatedAt || '', expDate: l.expDate })),
];

// --- Full SSOT Mock Object ---
export const mockSantaData: SantaData = {
  users: USERS,
  accounts: ACCOUNTS,
  products: PRODUCTS,
  materials: MATERIALS,
  distributors: DISTRIBUTORS,
  interactions: INTERACTIONS,
  ordersSellOut: ORDERS_SELL_OUT,
  billOfMaterials: BOMS,
  productionOrders: PRODUCTION_ORDERS,
  lots: LOTS,
  qaChecks: QC_TESTS,
  inventory: INVENTORY,
  goodsReceipts: GOODS_RECEIPTS,
  suppliers: SUPPLIERS,
  traceEvents: TRACE_EVENTS,
  receipts: [],
  priceLists: [],
  nonConformities: [],
  stockMoves: [],
  shipments: [],
  supplierBills: [],
  payments: [],
  mktEvents: [],
  onlineCampaigns: [],
  activations: [],
  creators: [],
  influencerCollabs: [],
  batches: [],
  packRuns: [],
  trace: [],
  qcTests: [],
  purchaseOrders: [],
};
