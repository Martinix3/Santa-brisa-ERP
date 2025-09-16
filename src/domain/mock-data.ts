
// src/domain/mock-data.ts
import type { SantaData, BillOfMaterial, GoodsReceipt } from './ssot';
import { isoDaysAgo } from './schema';

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
  // Clientes HORECA, etc.
  { id:'a1', name:'Bar Pepe', city:'Barcelona', type:'HORECA', stage:'ACTIVA', mode: { mode: 'DISTRIB_PARTNER', ownerPartnerId: 'd_rivera', billerPartnerId: 'd_rivera' }, distributorId:'d_rivera', salesRepId: 'u_ana', createdAt: isoDaysAgo(90), lastInteractionAt: isoDaysAgo(2) },
  { id: 'acc_1', name: 'Bares Paco S.L.', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_ana', biller: 'SB' }, distributorId: undefined, salesRepId: 'u_ana', createdAt: isoDaysAgo(180) },
  { id:'a2', name:'Hotel Mar', city:'Valencia', type:'HORECA', stage:'POTENCIAL', mode: { mode: 'PROPIA_SB', ownerUserId: 'u_marcos', biller: 'SB' }, distributorId: undefined, salesRepId: 'u_marcos', createdAt: isoDaysAgo(30) },
  { id:'a3', name:'Restaurante Roca', city:'Girona', type:'HORECA', stage:'ACTIVA', mode: { mode: 'COLOCACION', ownerUserId: 'u_alfonso', billerPartnerId: 'd_rivera' }, distributorId: 'd_rivera', salesRepId: 'u_alfonso', createdAt: isoDaysAgo(45) },
  { id:'a4', name:'Coctelería Oasis', city:'Marbella', type:'HORECA', stage:'ACTIVA', mode: { mode: 'COLOCACION', ownerUserId: 'u_patxi', billerPartnerId: 'd_andes' }, distributorId: 'd_andes', salesRepId: 'u_patxi', createdAt: isoDaysAgo(60) },
  { id:'a5', name:'Terraza del Mar', city:'Ibiza', type:'HORECA', stage:'SEGUIMIENTO', mode: { mode: 'COLOCACION', ownerUserId: 'u_nico', billerPartnerId: 'd_rivera' }, distributorId: 'd_rivera', salesRepId: 'u_nico', createdAt: isoDaysAgo(15) },
];


// --- Productos y Materiales ---
export const PRODUCTS: SantaData['products'] = [
  { id:'p_santabrisa', sku:'SB-750', name:'Santa Brisa 750ml', kind: 'FG', uom: 'bottle', bottleMl: 750, caseUnits: 6, active:true, materialId: 'mat_sb_750' },
  { id:'p_marg_classic', sku:'SB-MARG-CL-700', name:'Margarita Clásica 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_cl' },
  { id:'p_marg_spicy', sku:'SB-MARG-SP-700', name:'Margarita Picante 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_sp' },
  { id:'p_merch_vasos', sku:'MERCH-VAS', name:'Vasos Merchandising', kind: 'FG', uom: 'ud', active: true, materialId: 'mat_merch_vas' },
];

export const MATERIALS: SantaData['materials'] = [
  { id: 'mat_teq_base', sku: 'MP-TEQ-BASE', name: 'Tequila base', category: 'raw', unit: 'L', standardCost: 20 },
  { id: 'mat_lime_conc', sku: 'MP-LIME-CONC', name: 'Concentrado lima', category: 'raw', unit: 'L', standardCost: 5 },
  { id: 'mat_agave_syr', sku: 'MP-AGAVE-SYR', name: 'Sirope de agave (cocktail)', category: 'raw', unit: 'L', standardCost: 8 },
  { id: 'mat_sb_750', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'finished_good', unit: 'ud' },
  { id: 'mat_marg_cl', sku: 'SB-MARG-CL-700', name: 'Margarita Clásica 700ml', category: 'finished_good', unit: 'ud' },
  { id: 'mat_marg_sp', sku: 'SB-MARG-SP-700', name: 'Margarita Picante 700ml', category: 'finished_good', unit: 'ud' },
  { id: 'mat_merch_vas', sku: 'MERCH-VAS', name: 'Vasos Merchandising', category: 'merchandising', unit: 'ud' },
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
  { id:'o1', accountId:'a1', distributorId:'d_rivera', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(2), lines:[{ sku:'SB-750', qty:10, unit:'caja', priceUnit:12.5, lotIds: ['SB750-240926-001'] }] },
  { id:'o6', accountId:'acc_1', distributorId: 'd_rivera', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(1), lines:[{ sku:'SB-MARG-CL-700', qty:10, unit:'caja', priceUnit:14, lotIds: ['MARG-CL-240925-001'] }] },
  { id:'o7', accountId:'a3', distributorId: 'd_rivera', userId: 'u_alfonso', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(10), lines:[{ sku:'SB-750', qty:5, unit:'caja', priceUnit:13.0 }] },
  { id:'o8', accountId:'a4', distributorId: 'd_andes', userId: 'u_patxi', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(22), lines:[{ sku:'SB-MARG-CL-700', qty:8, unit:'caja', priceUnit:15.0 }] },
  { id:'o9', accountId:'a5', distributorId: 'd_rivera', userId: 'u_nico', status:'open', currency:'EUR', createdAt: isoDaysAgo(5), lines:[{ sku:'SB-750', qty:12, unit:'caja', priceUnit:12.8 }] },
  { id:'o10', accountId:'a3', distributorId: 'd_rivera', userId: 'u_alfonso', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(3), lines:[{ sku:'SB-750', qty:7, unit:'caja', priceUnit:13.0 }] },
  { id:'o11', accountId:'a4', distributorId: 'd_andes', userId: 'u_patxi', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(15), lines:[{ sku:'SB-MARG-CL-700', qty:10, unit:'caja', priceUnit:15.0 }] },
  { id:'o12', accountId:'a5', distributorId: 'd_rivera', userId: 'u_nico', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(2), lines:[{ sku:'SB-750', qty:15, unit:'caja', priceUnit:12.8 }] },
];

export const INTERACTIONS: SantaData['interactions'] = [
  { id:'i_a1_1', accountId:'a1', userId:'u_ana',   kind:'VISITA', note:'Resultado: OK', createdAt: isoDaysAgo(2), dept:'VENTAS' },
  { id:'i_a3_1', accountId:'a3', userId:'u_alfonso', kind:'VISITA', note:'Cliente contento, posible aumento de pedido.', createdAt: isoDaysAgo(11), dept:'VENTAS' },
  { id:'i_a4_1', accountId:'a4', userId:'u_patxi', kind:'VISITA', note:'Realizada demo de producto. Interesados en Margarita Picante.', createdAt: isoDaysAgo(16), dept:'VENTAS' },
  { id:'i_a5_1', accountId:'a5', userId:'u_nico', kind:'LLAMADA', note:'Seguimiento del pedido. Todo correcto.', createdAt: isoDaysAgo(3), dept:'VENTAS' },
];

// --- Cadena de Trazabilidad Completa ---
export const GOODS_RECEIPTS: GoodsReceipt[] = [
    { id: 'GR-001', supplierId: 'SUP-001', expectedAt: isoDaysAgo(10), receivedAt: isoDaysAgo(9), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-001' }], externalRef: 'ALB-SUP1-100' },
    { id: 'GR-002', supplierId: 'SUP-001', expectedAt: isoDaysAgo(12), receivedAt: isoDaysAgo(11), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-002', supplierLotNumber: 'AGV-JAL-23-F1-A' }], externalRef: 'ALB-SUP1-105' },
    { id: 'GR-003', supplierId: 'SUP-002', expectedAt: isoDaysAgo(15), receivedAt: isoDaysAgo(14), lines: [{ materialId: 'mat_lime_conc', qty: 500, lotNumber: 'LOTE-LIMA-001' }], externalRef: 'ALB-SUP2-200' },
];

export const PRODUCTION_ORDERS: SantaData['productionOrders'] = [
  { id: 'MO-24-006', sku: 'SB-MARG-CL-700', bomId: 'bom_marg_classic', targetQuantity: 100, status: 'done', createdAt: isoDaysAgo(5), lotId: 'MARG-CL-240925-001',
    protocolChecks: [
      { id: 'temp_control', text: 'Control de Temperatura', done: true, checkedAt: isoDaysAgo(5), checkedBy: 'u_sofia' },
      { id: 'ph_check', text: 'Verificación de pH', done: true, checkedAt: isoDaysAgo(5), checkedBy: 'u_sofia' }
    ],
    incidents: [
      { id: 'inc_1', when: isoDaysAgo(5), severity: 'MINOR', text: 'Pequeña fuga en la válvula de mezcla, solucionada.' }
    ]
  },
  { id: 'MO-24-007', sku: 'SB-750', bomId: 'bom_sb_750', targetQuantity: 200, status: 'done', createdAt: isoDaysAgo(4), lotId: 'SB750-240926-001' },
];

export const LOTS: SantaData['lots'] = [
    { id: 'LOTE-TEQ-001', sku: 'MP-TEQ-BASE', kind: 'RM', qty: { onHand: 1000, reserved: 0, uom: 'L' }, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(9) }, createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(9) },
    { id: 'LOTE-TEQ-002', sku: 'MP-TEQ-BASE', kind: 'RM', qty: { onHand: 955, reserved: 0, uom: 'L' }, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(11) }, createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(11) },
    { id: 'LOTE-LIMA-001', sku: 'MP-LIME-CONC', kind: 'RM', qty: { onHand: 470, reserved: 0, uom: 'L' }, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(14) }, createdAt: isoDaysAgo(14), updatedAt: isoDaysAgo(14) },
    { id: 'MARG-CL-240925-001', sku: 'SB-MARG-CL-700', kind: 'FG', qty: { onHand: 70, reserved: 0, uom: 'ud' }, status: 'APPROVED', dates: { producedAt: isoDaysAgo(5) }, trace: { parentBatchId: 'MO-24-006' }, createdAt: isoDaysAgo(5), updatedAt: isoDaysAgo(5) },
    { id: 'SB750-240926-001', sku: 'SB-750', kind: 'FG', qty: { onHand: 440, reserved: 0, uom: 'ud' }, status: 'QUARANTINE', dates: { producedAt: isoDaysAgo(4) }, trace: { parentBatchId: 'MO-24-007' }, createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4) },
];

export const QC_TESTS: SantaData['qaChecks'] = [
  { id: 'qc1', lotId: 'MARG-CL-240925-001', scope: 'RELEASE', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(5), createdAt: isoDaysAgo(5), checklist: [
    { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.5 },
    { code: 'abv', name: 'Alcohol', type: 'NUM', valueNum: 14.9, uom: '%' },
  ]},
  { id: 'qc2', lotId: 'SB750-240926-001', scope: 'RELEASE', result: 'FAIL', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(3), createdAt: isoDaysAgo(3), checklist: []},
  { id: 'qc3', lotId: 'MARG-CL-240925-001', scope: 'RETEST', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(4), createdAt: isoDaysAgo(4), checklist: [
     { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.45 },
  ]},
];

export const TRACE_EVENTS: SantaData['traceEvents'] = [
  { id: 'evt1', subject: { type: 'LOT', id: 'LOTE-LIMA-001'}, phase: 'RECEIPT', kind: 'BOOKED', occurredAt: isoDaysAgo(14), links: { lotId: 'LOTE-LIMA-001', receiptId: 'GR-003'}, data: { qty: 500, uom: 'L', supplier: 'SUP-002'} },
  { id: 'evt2', subject: { type: 'LOT', id: 'LOTE-LIMA-001'}, phase: 'QC', kind: 'CHECK_PASS', occurredAt: isoDaysAgo(13), links: { lotId: 'LOTE-LIMA-001'} },
  { id: 'evt3', subject: { type: 'LOT', id: 'LOTE-TEQ-002'}, phase: 'RECEIPT', kind: 'BOOKED', occurredAt: isoDaysAgo(11), links: { lotId: 'LOTE-TEQ-002', receiptId: 'GR-002'}, data: { qty: 1000, uom: 'L', supplier: 'SUP-001'} },
  { id: 'evt4', subject: { type: 'LOT', id: 'LOTE-TEQ-002'}, phase: 'QC', kind: 'CHECK_PASS', occurredAt: isoDaysAgo(10), links: { lotId: 'LOTE-TEQ-002'} },
  { id: 'evt5', subject: { type: 'BATCH', id: 'MO-24-006'}, phase: 'PRODUCTION', kind: 'BATCH_START', occurredAt: isoDaysAgo(5), links: { batchId: 'MO-24-006'} },
  { id: 'evt6', subject: { type: 'BATCH', id: 'MO-24-006'}, phase: 'PRODUCTION', kind: 'CONSUME', occurredAt: isoDaysAgo(5), links: { batchId: 'MO-24-006', lotId: 'LOTE-TEQ-002'}, data: { qty: 45, uom: 'L'} },
  { id: 'evt7', subject: { type: 'BATCH', id: 'MO-24-006'}, phase: 'PRODUCTION', kind: 'CONSUME', occurredAt: isoDaysAgo(5), links: { batchId: 'MO-24-006', lotId: 'LOTE-LIMA-001'}, data: { qty: 30, uom: 'L'} },
  { id: 'evt8', subject: { type: 'BATCH', id: 'MO-24-006'}, phase: 'PRODUCTION', kind: 'OUTPUT', occurredAt: isoDaysAgo(5), links: { batchId: 'MO-24-006', lotId: 'MARG-CL-240925-001'}, data: { qty: 140, uom: 'ud'} },
  { id: 'evt9', subject: { type: 'BATCH', id: 'MO-24-006'}, phase: 'PRODUCTION', kind: 'BATCH_END', occurredAt: isoDaysAgo(5), links: { batchId: 'MO-24-006'} },
  { id: 'evt10', subject: { type: 'LOT', id: 'MARG-CL-240925-001'}, phase: 'QC', kind: 'CHECK_PASS', occurredAt: isoDaysAgo(5), links: { lotId: 'MARG-CL-240925-001', qaCheckId: 'qc3'} },
  { id: 'evt11', subject: { type: 'ORDER', id: 'o6'}, phase: 'SALE', kind: 'ORDER_ALLOC', occurredAt: isoDaysAgo(1), links: { orderId: 'o6', lotId: 'MARG-CL-240925-001'} },
  { id: 'evt12', subject: { type: 'ORDER', id: 'o6'}, phase: 'DELIVERY', kind: 'SHIPPED', occurredAt: isoDaysAgo(1), links: { orderId: 'o6', lotId: 'MARG-CL-240925-001'} },
  { id: 'evt13', subject: { type: 'BATCH', id: 'MO-24-007'}, phase: 'PRODUCTION', kind: 'BATCH_START', occurredAt: isoDaysAgo(4), links: { batchId: 'MO-24-007'} },
  { id: 'evt14', subject: { type: 'BATCH', id: 'MO-24-007'}, phase: 'PRODUCTION', kind: 'OUTPUT', occurredAt: isoDaysAgo(4), links: { batchId: 'MO-24-007', lotId: 'SB750-240926-001'} },
  { id: 'evt15', subject: { type: 'LOT', id: 'SB750-240926-001'}, phase: 'QC', kind: 'CHECK_FAIL', occurredAt: isoDaysAgo(3), links: { lotId: 'SB750-240926-001'} },
  { id: 'evt16', subject: { type: 'ORDER', id: 'o1'}, phase: 'SALE', kind: 'ORDER_ALLOC', occurredAt: isoDaysAgo(2), links: { orderId: 'o1', lotId: 'SB750-240926-001'} },
];


export const INVENTORY: SantaData['inventory'] = [
    ...LOTS.filter(l => l.kind === 'RM').map(l => ({ id: `inv_${l.id}`, sku: l.sku, lotNumber: l.id, uom: l.qty.uom, qty: l.qty.onHand, locationId: 'RM/MAIN', updatedAt: l.updatedAt, expDate: l.dates.expDate })),
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
  // Empty arrays for other properties
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
  // Legacy - should be removed
  batches: [],
  packRuns: [],
  trace: [],
  qcTests: [], // now qaChecks
  purchaseOrders: [],
};
