
import type { SantaData } from '@/domain/ssot';

export const INITIAL_MOCK_DATA: SantaData = {
  users: [
    { id: 'u_admin', name: 'Nico', email: 'nico@santabrisa.es', role: 'admin', active: true },
    { id: 'u_comercial_1', name: 'Marta', email: 'marta@santabrisa.es', role: 'comercial', active: true },
    { id: 'u_comercial_2', name: 'Carlos', email: 'carlos@santabrisa.es', role: 'comercial', active: true },
    { id: 'u_ops', name: 'Laura', email: 'laura@santabrisa.es', role: 'ops', active: true },
  ],
  accounts: [
    { id: 'acc_1', name: 'Bar Terraza Sol', city: 'Barcelona', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_comercial_1', billerId: 'SB', createdAt: '2023-01-15T10:00:00Z' },
    { id: 'acc_2', name: 'Coctelería Luna', city: 'Madrid', type: 'HORECA', stage: 'ACTIVA', ownerId: 'u_comercial_2', billerId: 'SB', createdAt: '2023-02-20T11:30:00Z' },
    { id: 'acc_3', name: 'Supermercado Fresco', city: 'Valencia', type: 'RETAIL', stage: 'SEGUIMIENTO', ownerId: 'u_comercial_1', billerId: 'SB', createdAt: '2023-03-10T09:00:00Z' },
    { id: 'acc_4', name: 'Distribuciones del Sur', city: 'Sevilla', type: 'DISTRIBUIDOR', stage: 'ACTIVA', ownerId: 'd_1', billerId: 'd_1', createdAt: '2022-11-05T15:00:00Z' },
    { id: 'acc_5', name: 'Hotel Vista Mar', city: 'Málaga', type: 'HORECA', stage: 'POTENCIAL', ownerId: 'u_comercial_2', billerId: 'SB', createdAt: '2023-05-01T12:00:00Z' },
  ],
  distributors: [
    { id: 'd_1', name: 'Distribuciones del Sur', city: 'Sevilla', country: 'España' }
  ],
  products: [
    { id: 'prod_1', sku: 'SB-750', name: 'Santa Brisa 750ml', kind: 'FG', bottleMl: 750, active: true },
    { id: 'prod_2', sku: 'SB-200', name: 'Santa Brisa 200ml', kind: 'FG', bottleMl: 200, active: true },
    { id: 'prod_3', sku: 'MERCH-VAS', name: 'Vaso Santa Brisa', kind: 'MERCH', active: true },
  ],
  materials: [
    { id: 'mat_1', sku: 'RM-AGAVE', name: 'Agave Concentrado', uom: 'kg', standardCost: 10, category: 'raw' },
    { id: 'mat_2', sku: 'RM-LEMON', name: 'Zumo de Limón', uom: 'L', standardCost: 2, category: 'raw' },
    { id: 'mat_3', sku: 'PKG-BOTTLE-750', name: 'Botella 750ml', uom: 'uds', standardCost: 0.5, category: 'packaging' },
    { id: 'mat_4', sku: 'PKG-BOTTLE-200', name: 'Botella 200ml', uom: 'uds', standardCost: 0.2, category: 'packaging' },
    { id: 'mat_5', sku: 'PKG-LABEL-SB750', name: 'Etiqueta SB 750', uom: 'uds', standardCost: 0.05, category: 'label' },
    { id: 'mat_6', sku: 'MERCH-VAS', name: 'Vaso Santa Brisa', uom: 'uds', standardCost: 1.5, category: 'merchandising' },
  ],
  billOfMaterials: [
    { 
      id: 'bom_1', 
      sku: 'SB-750', 
      name: 'Receta Santa Brisa 750ml',
      batchSize: 100,
      baseUnit: 'L',
      items: [
        { materialId: 'mat_1', quantity: 20, unit: 'kg' },
        { materialId: 'mat_2', quantity: 80, unit: 'L' },
      ]
    }
  ],
  interactions: [
    { id: 'int_1', userId: 'u_comercial_1', accountId: 'acc_1', kind: 'VISITA', note: 'Presentación de producto. Interesados.', plannedFor: '2023-01-15T10:00:00Z', createdAt: '2023-01-15T10:30:00Z', dept: 'VENTAS', status: 'done' },
    { id: 'int_2', userId: 'u_comercial_2', accountId: 'acc_2', kind: 'LLAMADA', note: 'Confirmar asistencia a evento.', createdAt: '2023-02-22T16:00:00Z', dept: 'VENTAS', status: 'done' },
    { id: 'int_3', userId: 'u_comercial_1', accountId: 'acc_3', kind: 'VISITA', note: 'Seguimiento. Pendiente de decisión.', plannedFor: '2023-06-10T11:00:00Z', createdAt: '2023-06-10T11:00:00Z', dept: 'VENTAS', status: 'open' },
    { id: 'int_4', userId: 'u_ops', involvedUserIds: ['u_ops'], kind: 'OTRO', note: 'Revisar stock de botellas', dept: 'PRODUCCION', status: 'open', plannedFor: '2023-08-01T09:00:00Z', createdAt: '2023-07-30T15:00:00Z' },
  ],
  ordersSellOut: [
    { id: 'ord_1', accountId: 'acc_1', source: 'Direct', lines: [{ sku: 'SB-750', qty: 12, uom: 'uds', priceUnit: 15 }], createdAt: '2023-01-20T14:00:00Z', status: 'paid', currency: 'EUR', totalAmount: 180 },
    { id: 'ord_2', accountId: 'acc_2', source: 'Direct', lines: [{ sku: 'SB-750', qty: 24, uom: 'uds', priceUnit: 14.5 }, { sku: 'MERCH-VAS', qty: 50, uom: 'uds', priceUnit: 0 }], createdAt: '2023-03-01T12:00:00Z', status: 'paid', currency: 'EUR', totalAmount: 348 },
    { id: 'ord_3', accountId: 'acc_1', source: 'Direct', lines: [{ sku: 'SB-750', qty: 6, uom: 'uds', priceUnit: 15 }], createdAt: '2023-05-15T18:00:00Z', status: 'invoiced', currency: 'EUR', totalAmount: 90 },
  ],
  shipments: [
    { id: 'shp_1', orderId: 'ord_1', accountId: 'acc_1', createdAt: '2023-01-21T09:00:00Z', status: 'delivered', lines: [{ sku: 'SB-750', qty: 12, name: 'Santa Brisa 750ml' }], customerName: 'Bar Terraza Sol', city: 'Barcelona' },
    { id: 'shp_2', orderId: 'ord_2', accountId: 'acc_2', createdAt: '2023-03-02T10:00:00Z', status: 'delivered', lines: [{ sku: 'SB-750', qty: 24, name: 'Santa Brisa 750ml' }, { sku: 'MERCH-VAS', qty: 50, name: 'Vaso Santa Brisa' }], customerName: 'Coctelería Luna', city: 'Madrid' },
    { id: 'shp_3', orderId: 'ord_3', accountId: 'acc_1', createdAt: '2023-05-16T11:00:00Z', status: 'shipped', lines: [{ sku: 'SB-750', qty: 6, name: 'Santa Brisa 750ml' }], customerName: 'Bar Terraza Sol', city: 'Barcelona' },
  ],
  lots: [
    { id: '230110-SB-750-01', sku: 'SB-750', createdAt: '2023-01-10T08:00:00Z', quantity: 200, quality: { qcStatus: 'release', results: {} }, status: 'CLOSED' },
    { id: '230215-SB-750-01', sku: 'SB-750', createdAt: '2023-02-15T08:00:00Z', quantity: 150, quality: { qcStatus: 'release', results: {} }, status: 'OPEN' },
    { id: '230105-RM-AGAVE-01', sku: 'RM-AGAVE', createdAt: '2023-01-05T09:00:00Z', quantity: 500, quality: { qcStatus: 'release', results: {} }, status: 'OPEN' },
    { id: '230105-RM-LEMON-01', sku: 'RM-LEMON', createdAt: '2023-01-05T09:00:00Z', quantity: 1000, quality: { qcStatus: 'release', results: {} }, status: 'OPEN' },
  ],
  inventory: [
    { id: 'inv_1', sku: 'SB-750', lotNumber: '230215-SB-750-01', uom: 'uds', qty: 150, locationId: 'FG/MAIN', updatedAt: '2023-02-15T09:00:00Z' },
    { id: 'inv_2', sku: 'RM-AGAVE', lotNumber: '230105-RM-AGAVE-01', uom: 'kg', qty: 500, locationId: 'RM/MAIN', updatedAt: '2023-01-05T10:00:00Z' },
    { id: 'inv_3', sku: 'RM-LEMON', lotNumber: '230105-RM-LEMON-01', uom: 'L', qty: 1000, locationId: 'RM/MAIN', updatedAt: '2023-01-05T10:00:00Z' },
    { id: 'inv_4', sku: 'PKG-BOTTLE-750', uom: 'uds', qty: 2000, locationId: 'PKG/MAIN', updatedAt: '2023-01-01T10:00:00Z' },
  ],
  stockMoves: [],
  productionOrders: [
    { id: 'po_1', sku: 'SB-750', bomId: 'bom_1', targetQuantity: 100, status: 'done', createdAt: '2023-01-10T08:00:00Z', lotId: '230110-SB-750-01' },
    { id: 'po_2', sku: 'SB-750', bomId: 'bom_1', targetQuantity: 150, status: 'wip', createdAt: '2023-02-15T08:00:00Z', lotId: '230215-SB-750-01' },
  ],
  qaChecks: [],
  mktEvents: [],
  onlineCampaigns: [],
  activations: [],
  creators: [],
  influencerCollabs: [],
  suppliers: [],
  goodsReceipts: [],
  traceEvents: [],
  receipts: [],
  purchaseOrders: [],
  priceLists: [],
  nonConformities: [],
  supplierBills: [],
  payments: [],
};
