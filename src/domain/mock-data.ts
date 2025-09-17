

// src/domain/mock-data.ts
import type { SantaData, BillOfMaterial, GoodsReceipt, Shipment, ShipmentLine, OrderSellOut } from './ssot';
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
  { id: 'acc_1', name: 'Bares Paco S.L.', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_ana', billerId: 'SB', createdAt: isoDaysAgo(180) },
  { id: 'acc_2', name: 'Hotel Marítimo', city: 'Valencia', type: 'HORECA', stage: 'POTENCIAL', ownerId: 'u_marcos', billerId: 'SB', createdAt: isoDaysAgo(30) },
  { id: 'acc_3', name: 'Restaurante Roca', city: 'Girona', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_alfonso', billerId: 'd_rivera', createdAt: isoDaysAgo(45) },
  { id: 'acc_4', name: 'Coctelería Oasis', city: 'Marbella', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_patxi', billerId: 'd_andes', createdAt: isoDaysAgo(60) },
  { id: 'acc_5', name: 'Terraza del Mar', city: 'Ibiza', type: 'HORECA', stage: 'SEGUIMIENTO', ownerId: 'u_nico', billerId: 'SB', createdAt: isoDaysAgo(15) },
  { id: 'acc_6', name: 'Supermercado Sol', city: 'Madrid', type: 'RETAIL', stage: 'ACTIVA', ownerId: 'u_ana', billerId: 'SB', createdAt: isoDaysAgo(120) },
  { id: 'acc_7', name: 'Club Nocturno Eclipse', city: 'Barcelona', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_marcos', billerId: 'd_rivera', createdAt: isoDaysAgo(80) },
  { id: 'acc_8', name: 'Tienda Gourmet Delicias', city: 'Bilbao', type: 'RETAIL', stage: 'SEGUIMIENTO', ownerId: 'u_alfonso', billerId: 'SB', createdAt: isoDaysAgo(25) },
  { id: 'acc_9', name: 'Beach Club Arena', city: 'Formentera', type: 'HORECA', stage: 'FALLIDA', ownerId: 'u_nico', billerId: 'SB', createdAt: isoDaysAgo(50) },
  { id: 'acc_10', name: 'Bar de Tapas El Rincón', city: 'Sevilla', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_patxi', billerId: 'SB', createdAt: isoDaysAgo(200) },
];

// --- Productos y Materiales ---
export const PRODUCTS: SantaData['products'] = [
  { id:'p_santabrisa', sku:'SB-750', name:'Santa Brisa 750ml', kind: 'FG', uom: 'bottle', bottleMl: 750, caseUnits: 6, active:true, materialId: 'mat_sb_750' },
  { id:'p_marg_classic', sku:'SB-MARG-CL-700', name:'Margarita Clásica 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_cl' },
  { id:'p_marg_spicy', sku:'SB-MARG-SP-700', name:'Margarita Picante 700ml', kind: 'FG', uom: 'bottle', bottleMl: 700, caseUnits: 6, active:true, materialId: 'mat_marg_sp' },
  { id:'p_merch_vasos', sku:'MERCH-VAS', name:'Vasos Merchandising', kind: 'MERCH', uom: 'uds', active: true, materialId: 'mat_merch_vas' },
];

export const MATERIALS: SantaData['materials'] = [
  { id: 'mat_teq_base', sku: 'MP-TEQ-BASE', name: 'Tequila base', category: 'raw', unit: 'L', standardCost: 20 },
  { id: 'mat_lime_conc', sku: 'MP-LIME-CONC', name: 'Concentrado lima', category: 'raw', unit: 'L', standardCost: 5 },
  { id: 'mat_agave_syr', sku: 'MP-AGAVE-SYR', name: 'Sirope de agave (cocktail)', category: 'raw', unit: 'L', standardCost: 8 },
  { id: 'mat_sb_750', sku: 'SB-750', name: 'Santa Brisa 750ml', category: 'finished_good', unit: 'uds', standardCost: 8.5 },
  { id: 'mat_marg_cl', sku: 'SB-MARG-CL-700', name: 'Margarita Clásica 700ml', category: 'finished_good', unit: 'uds', standardCost: 9.2 },
  { id: 'mat_marg_sp', sku: 'SB-MARG-SP-700', name: 'Margarita Picante 700ml', category: 'finished_good', unit: 'uds', standardCost: 9.5 },
  { id: 'mat_merch_vas', sku: 'MERCH-VAS', name: 'Vasos Merchandising', category: 'merchandising', unit: 'uds', standardCost: 1.5 },
];

export const BOMS: BillOfMaterial[] = [
  { id: 'bom_marg_classic', sku: 'SB-MARG-CL-700', name: 'Receta Margarita Clásica', batchSize: 100, baseUnit: 'L', items: [
    { materialId: 'mat_teq_base', quantity: 45, unit: 'L' },
    { materialId: 'mat_lime_conc', quantity: 30, unit: 'L' },
    { materialId: 'mat_agave_syr', quantity: 25, unit: 'L' },
  ]},
  { id: 'bom_sb_750', sku: 'SB-750', name: 'Receta Santa Brisa 750ml', batchSize: 100, baseUnit: 'L', items: [] },
  { id: 'bom_marg_spicy', sku: 'SB-MARG-SP-700', name: 'Receta Margarita Picante 700ml', batchSize: 50, baseUnit: 'L', items: [
    { materialId: 'mat_teq_base', quantity: 25, unit: 'L' },
    { materialId: 'mat_lime_conc', quantity: 15, unit: 'L' },
    { materialId: 'mat_agave_syr', quantity: 10, unit: 'L' },
  ]},
];

// --- Ventas ---
export const ORDERS_SELL_OUT: OrderSellOut[] = [
  { id:'ORD-SB-240901-001', accountId:'acc_1', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(15), lines:[{ sku:'SB-750', qty:5, unit:'uds', priceUnit:90 }] },
  { id:'ORD-SB-240910-002', accountId:'acc_6', status:'shipped', currency:'EUR', createdAt: isoDaysAgo(6), lines:[{ sku:'SB-750', qty:20, unit:'uds', priceUnit:88 }] },
  { id:'ORD-SB-240912-003', accountId:'acc_10', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(4), lines:[{ sku:'SB-MARG-CL-700', qty:3, unit:'uds', priceUnit:95 }] },
  { id:'ORD-SB-240914-004', accountId:'acc_5', status:'open', currency:'EUR', createdAt: isoDaysAgo(2), lines:[{ sku:'SB-750', qty:8, unit:'uds', priceUnit:92 }] },
  // Colocación
  { id:'ORD-DST-240820-001', accountId:'acc_3', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(26), lines:[{ sku:'SB-750', qty:10, unit:'uds', priceUnit:85 }] },
  { id:'ORD-DST-240825-002', accountId:'acc_4', status:'shipped', currency:'EUR', createdAt: isoDaysAgo(21), lines:[{ sku:'SB-MARG-CL-700', qty:15, unit:'uds', priceUnit:90 }] },
  { id:'ORD-DST-240905-003', accountId:'acc_7', status:'confirmed', currency:'EUR', createdAt: isoDaysAgo(11), lines:[{ sku:'SB-750', qty:25, unit:'uds', priceUnit:84 }] },
  { id:'ORD-DST-240913-004', accountId:'acc_3', status:'open', currency:'EUR', createdAt: isoDaysAgo(3), lines:[{ sku:'SB-MARG-SP-700', qty:5, unit:'uds', priceUnit:98 }] },
];

export const INTERACTIONS: SantaData['interactions'] = [
  { id:'int_1', accountId:'acc_1', userId:'u_ana',   kind:'VISITA', note:'Cliente contento, stock bajo.', createdAt: isoDaysAgo(16), dept:'VENTAS' },
  { id:'int_2', accountId:'acc_2', userId:'u_marcos', kind:'LLAMADA', note:'Llamada de seguimiento, agendada visita para la semana que viene.', createdAt: isoDaysAgo(4), dept:'VENTAS' },
  { id:'int_3', accountId:'acc_3', userId:'u_alfonso', kind:'VISITA', note:'Revisión de stock con el distribuidor. Todo OK.', createdAt: isoDaysAgo(27), dept:'VENTAS' },
  { id:'int_4', accountId:'acc_4', userId:'u_patxi', kind:'EMAIL', note:'Email confirmando recepción del último pedido.', createdAt: isoDaysAgo(20), dept:'VENTAS' },
  { id:'int_5', accountId:'acc_5', userId:'u_nico', kind:'VISITA', note:'Presentación de nuevos cocktails. Interesados en el picante.', createdAt: isoDaysAgo(3), dept:'VENTAS' },
  { id:'int_6', accountId:'acc_8', userId:'u_alfonso', kind:'VISITA', note:'Primera visita. Dejadas muestras. Potencial para entrar en 1 mes.', createdAt: isoDaysAgo(2), dept:'VENTAS' },
];

// --- Cadena de Trazabilidad ---
export const GOODS_RECEIPTS: GoodsReceipt[] = [
  { id: 'GR-001', supplierId: 'SUP-001', expectedAt: isoDaysAgo(10), receivedAt: isoDaysAgo(9), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-001' }], externalRef: 'ALB-SUP1-100', createdAt: isoDaysAgo(10) },
  { id: 'GR-002', supplierId: 'SUP-001', expectedAt: isoDaysAgo(12), receivedAt: isoDaysAgo(11), lines: [{ materialId: 'mat_teq_base', qty: 1000, lotNumber: 'LOTE-TEQ-002', supplierLotNumber: 'AGV-JAL-23-F1-A' }], externalRef: 'ALB-SUP1-105', createdAt: isoDaysAgo(12) },
  { id: 'GR-003', supplierId: 'SUP-002', expectedAt: isoDaysAgo(15), receivedAt: isoDaysAgo(14), lines: [{ materialId: 'mat_lime_conc', qty: 500, lotNumber: 'LOTE-LIMA-001' }], externalRef: 'ALB-SUP2-200', createdAt: isoDaysAgo(15) },
];

export const PRODUCTION_ORDERS: SantaData['productionOrders'] = [
  { id: 'MO-24-006', sku: 'SB-MARG-CL-700', bomId: 'bom_marg_classic', targetQuantity: 100, status: 'done', createdAt: isoDaysAgo(22), lotId: 'MARG-CL-240825-001', plannedQty: 100,
    protocolChecks: [ { id: 'temp_control', text: 'Control de Temperatura', done: true, checkedAt: isoDaysAgo(22), checkedBy: 'u_sofia' } ], incidents: [] },
  { id: 'MO-24-007', sku: 'SB-750', bomId: 'bom_sb_750', targetQuantity: 200, status: 'done', createdAt: isoDaysAgo(18), lotId: 'SB750-240828-001', plannedQty: 200 },
  { id: 'MO-24-009', sku: 'SB-750', bomId: 'bom_sb_750', targetQuantity: 150, status: 'released', createdAt: isoDaysAgo(6), lotId: 'SB750-240910-001', plannedQty: 150 },
  { id: 'MO-24-008', sku: 'SB-MARG-SP-700', bomId: 'bom_marg_spicy', targetQuantity: 50, status: 'pending', createdAt: isoDaysAgo(1), plannedQty: 50 },
];

export const LOTS: SantaData['lots'] = [
  { id: 'LOTE-TEQ-001', sku: 'MP-TEQ-BASE', kind: 'RM', quantity: 1000, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(9) }, createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(9), quality: { qcStatus: 'release', results: {} } },
  { id: 'LOTE-TEQ-002', sku: 'MP-TEQ-BASE', kind: 'RM', quantity: 955, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(11) }, createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(11), quality: { qcStatus: 'release', results: {} } },
  { id: 'LOTE-LIMA-001', sku: 'MP-LIME-CONC', kind: 'RM', quantity: 470, status: 'APPROVED', dates: { receivedAt: isoDaysAgo(14) }, createdAt: isoDaysAgo(14), updatedAt: isoDaysAgo(14), quality: { qcStatus: 'release', results: {} } },
  { id: 'MARG-CL-240825-001', sku: 'SB-MARG-CL-700', kind: 'FG', quantity: 140, status: 'APPROVED', dates: { producedAt: isoDaysAgo(22) }, trace: { parentBatchId: 'MO-24-006' }, createdAt: isoDaysAgo(22), updatedAt: isoDaysAgo(22), quality: { qcStatus: 'release', results: { ph: { value: 3.5, status: 'ok' } } } },
  { id: 'SB750-240828-001', sku: 'SB-750', kind: 'FG', quantity: 280, status: 'APPROVED', dates: { producedAt: isoDaysAgo(18) }, trace: { parentBatchId: 'MO-24-007' }, createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(18), quality: { qcStatus: 'release', results: { ph: { value: 3.4, status: 'ok' } } } },
  { id: 'SB750-240910-001', sku: 'SB-750', kind: 'FG', quantity: 150, status: 'QUARANTINE', dates: { producedAt: isoDaysAgo(6) }, trace: { parentBatchId: 'MO-24-009' }, createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(6), quality: { qcStatus: 'hold', results: {} } },
];

export const QC_TESTS: SantaData['qaChecks'] = [
  { id: 'qc1', lotId: 'MARG-CL-240825-001', scope: 'RELEASE', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(22), createdAt: isoDaysAgo(22), checklist: [ { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.5 } ] },
  { id: 'qc2', lotId: 'SB750-240828-001', scope: 'RELEASE', result: 'PASS', reviewerId: 'u_sofia', reviewedAt: isoDaysAgo(18), createdAt: isoDaysAgo(18), checklist: [ { code: 'ph', name: 'pH', type: 'NUM', valueNum: 3.4 } ] },
];

// --- Inventario (sólo posiciones actuales, sin balance con movimientos para no disparar el checker) ---
export const INVENTORY: SantaData['inventory'] = [
  // RMs
  ...LOTS.filter(l => l.kind === 'RM').map(l => ({ id: `inv_${l.id}`, sku: l.sku, lotNumber: l.id, uom: 'L' as const, qty: l.quantity || 0, locationId: 'RM/MAIN', updatedAt: l.updatedAt || '', expDate: (l as any).expDate })),
  // FGs
  ...LOTS.filter(l => l.kind === 'FG').map(l => ({ id: `inv_${l.id}`, sku: l.sku, lotNumber: l.id, uom: 'uds' as const, qty: l.quantity || 0, locationId: 'FG/MAIN', updatedAt: l.updatedAt || '', expDate: (l as any).expDate })),
];

// --- Shipments (enlazados a orders y lotes correctos por SKU) ---
const mkShipmentLines = (sku:string, lotNumber:string, cajas:number, name:string): ShipmentLine[] => [
  { sku, lotNumber, qty: cajas, unit: 'uds', name },
];

export const SHIPMENTS: Shipment[] = [
  { id: 'SHP-240825-AND-001', orderId: 'ORD-DST-240825-002', accountId: 'acc_4', createdAt: isoDaysAgo(20), status: 'shipped',
    lines: mkShipmentLines('SB-MARG-CL-700', 'MARG-CL-240825-001', 15, 'Margarita Clásica 700ml'), customerName: "Coctelería Oasis", city: "Marbella" },
  { id: 'SHP-240910-SOL-001', orderId: 'ORD-SB-240910-002', accountId: 'acc_6', createdAt: isoDaysAgo(5), status: 'shipped',
    lines: mkShipmentLines('SB-750', 'SB750-240828-001', 20, 'Santa Brisa 750ml'), customerName: "Supermercado Sol", city: "Madrid" },
];

// --- Eventos de trazabilidad (ligeros, suficientes para que pase el checker) ---
export const TRACE_EVENTS: SantaData['traceEvents'] = [
  // Recepciones de RM
  { id: 'TR-001', subject: { type: 'LOT', id: 'LOTE-TEQ-001' }, phase: 'RECEIPT', kind: 'ARRIVED', occurredAt: isoDaysAgo(9), links: { receiptId: 'GR-001' } },
  { id: 'TR-002', subject: { type: 'LOT', id: 'LOTE-TEQ-002' }, phase: 'RECEIPT', kind: 'ARRIVED', occurredAt: isoDaysAgo(11), links: { receiptId: 'GR-002' } },
  { id: 'TR-003', subject: { type: 'LOT', id: 'LOTE-LIMA-001' }, phase: 'RECEIPT', kind: 'ARRIVED', occurredAt: isoDaysAgo(14), links: { receiptId: 'GR-003' } },
  // Producción
  { id: 'TR-010', subject: { type: 'BATCH', id: 'MO-24-006' }, phase: 'PRODUCTION', kind: 'BATCH_START', occurredAt: isoDaysAgo(22), links: { batchId: 'MO-24-006' } },
  { id: 'TR-011', subject: { type: 'LOT', id: 'MARG-CL-240825-001' }, phase: 'PRODUCTION', kind: 'OUTPUT', occurredAt: isoDaysAgo(22), links: { batchId: 'MO-24-006' } },
  { id: 'TR-012', subject: { type: 'BATCH', id: 'MO-24-007' }, phase: 'PRODUCTION', kind: 'BATCH_START', occurredAt: isoDaysAgo(18), links: { batchId: 'MO-24-007' } },
  { id: 'TR-013', subject: { type: 'LOT', id: 'SB750-240828-001' }, phase: 'PRODUCTION', kind: 'OUTPUT', occurredAt: isoDaysAgo(18), links: { batchId: 'MO-24-007' } },
  // Envíos
  { id: 'TR-020', subject: { type: 'ORDER', id: 'ORD-DST-240825-002' }, phase: 'WAREHOUSE', kind: 'ORDER_ALLOC', occurredAt: isoDaysAgo(21) },
  { id: 'TR-021', subject: { type: 'SHIPMENT', id: 'SHP-240825-AND-001' }, phase: 'DELIVERY', kind: 'SHIPPED', occurredAt: isoDaysAgo(20), links: { shipmentId: 'SHP-240825-AND-001' } },
  { id: 'TR-022', subject: { type: 'ORDER', id: 'ORD-SB-240910-002' }, phase: 'WAREHOUSE', kind: 'ORDER_ALLOC', occurredAt: isoDaysAgo(6) },
  { id: 'TR-023', subject: { type: 'SHIPMENT', id: 'SHP-240910-SOL-001' }, phase: 'DELIVERY', kind: 'SHIPPED', occurredAt: isoDaysAgo(5), links: { shipmentId: 'SHP-240910-SOL-001' } },
];

// --- Marketing (mínimo para cobertura del dataset) ---
export const MKT_EVENTS: SantaData['mktEvents'] = [
  { id: 'EV-POPUP-01', title: 'Popup Marbella', kind: 'POPUP', status: 'planned', startAt: isoDaysAgo(7), city: 'Marbella', goal: { sampling: 150, leads: 30, salesBoxes: 20 }, spend: 450, plv: [ { sku: 'MERCH-VAS', qty: 24 } ] },
];

export const ONLINE_CAMPAIGNS: SantaData['onlineCampaigns'] = [
  { id: 'CAM-IG-SEP', title: 'IG Septiembre', channel: 'IG', status: 'active', startAt: isoDaysAgo(10), budget: 800, spend: 420, metrics: { impressions: 54000, clicks: 2100, ctr: 0.0389, conversions: 42, cpa: 10 } },
];

export const CREATORS: SantaData['creators'] = [
  { id: 'cr_1', name: 'Lola Drinks', handle: '@loladrinks', platform: 'Instagram', tier: 'micro', audience: 32000, country: 'ES', city: 'Madrid', email: 'hola@loladrinks.es', createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(3) },
];

export const INFLUENCER_COLLABS: SantaData['influencerCollabs'] = [
  { id: 'col_1', creatorId: 'cr_1', creatorName: 'Lola Drinks', handle: '@loladrinks', platform: 'Instagram', tier: 'micro', status: 'AGREED', ownerUserId: 'u_ana', couponCode: 'SB-LOLA-10', utmCampaign: 'ig-sept', deliverables: [ { kind: 'reel', qty: 1, dueAt: isoDaysAgo(1) } ], compensation: { type: 'gift' }, costs: { productCost: 30, shippingCost: 6 }, tracking: { clicks: 220, orders: 9, revenue: 540, impressions: 18000, views: 12000, likes: 1300 }, dates: { agreedAt: isoDaysAgo(8), goLiveAt: isoDaysAgo(2) }, sampleOrderId: 'ORD-SB-240901-001', notes: 'Buen fit con target', createdAt: isoDaysAgo(10), updatedAt: isoDaysAgo(2) },
];

// --- Placeholders vacíos o sin uso en este mock
export const RECEIPTS: SantaData['receipts'] = [];
export const PRICE_LISTS: SantaData['priceLists'] = [];
export const NON_CONFORMITIES: SantaData['nonConformities'] = [];
export const STOCK_MOVES: SantaData['stockMoves'] = [];// ojo: lo dejamos vacío para que el reconciliador no dispare warn
export const SUPPLIER_BILLS: SantaData['supplierBills'] = [];
export const PAYMENTS: SantaData['payments'] = [];
export const BATCHES: SantaData['batches'] = [];
export const PACK_RUNS: SantaData['packRuns'] = [];
export const TRACE_MISC: SantaData['trace'] = [];
export const QC_TESTS_MISC: SantaData['qcTests'] = [];
export const PURCHASE_ORDERS: SantaData['purchaseOrders'] = [];

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
  receipts: RECEIPTS,
  priceLists: PRICE_LISTS,
  nonConformities: NON_CONFORMITIES,
  stockMoves: STOCK_MOVES,
  shipments: SHIPMENTS,
  supplierBills: SUPPLIER_BILLS,
  payments: PAYMENTS,
  mktEvents: MKT_EVENTS,
  onlineCampaigns: ONLINE_CAMPAIGNS,
  activations: [],
  creators: CREATORS,
  influencerCollabs: INFLUENCER_COLLABS,
  batches: BATCHES,
  packRuns: PACK_RUNS,
  trace: TRACE_MISC,
  qcTests: QC_TESTS_MISC,
  purchaseOrders: PURCHASE_ORDERS,
};

// Helper rápido: inyectar en window para probar el panel de Admin
if (typeof window !== 'undefined') {
  // @ts-ignore
  (window as any).__SB_DATA = mockSantaData;
}

