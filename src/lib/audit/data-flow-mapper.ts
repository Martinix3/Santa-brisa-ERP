// src/lib/audit/data-flow-mapper.ts
/**
 * Sistema de mapeo y auditoría de flujo de datos
 * 
 * Mapea:
 * - Qué colecciones lee cada componente
 * - Qué campos usa cada KPI/dashboard
 * - Qué colecciones escriben los formularios
 * - Qué datos usan las funciones de cálculo
 */

import type { SantaData } from '@/domain/ssot';

export interface DataFlowNode {
  id: string;
  type: 'ui' | 'read' | 'write' | 'compute';
  component: string;
  collections: string[];
  fields: string[];
  description: string;
  file?: string;
  verified?: boolean;
}

export interface DataFlowIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'missing_collection' | 'missing_field' | 'wrong_collection' | 'outdated_calc' | 'orphan_data';
  title: string;
  description: string;
  component: string;
  expectedCollection?: string;
  actualCollection?: string;
  missingFields?: string[];
  fix: string;
}

// Mapeo estático de componentes → colecciones que usan
export const UI_DATA_FLOW: DataFlowNode[] = [
  // ===== DASHBOARDS =====
  {
    id: 'dashboard-admin',
    type: 'ui',
    component: 'AdminDashboardPage',
    collections: ['users', 'accounts', 'ordersSellOut', 'interactions'],
    fields: ['users.kpiBaseline', 'accounts.stage', 'ordersSellOut.totalAmount', 'interactions.status'],
    description: 'Dashboard Admin - KPIs por departamento',
    file: 'src/features/admin/components/AdminDashboardPage.tsx',
    verified: true
  },
  {
    id: 'dashboard-personal',
    type: 'ui',
    component: 'DashboardPersonal',
    collections: ['accounts', 'interactions', 'users', 'ordersSellOut'],
    fields: ['accounts.isTarget', 'interactions.plannedFor', 'interactions.status', 'users.kpiBaseline'],
    description: 'Dashboard Personal - KPIs, tareas, calendario',
    file: 'src/app/(app)/dashboard-personal/page.tsx',
    verified: true
  },
  {
    id: 'dashboard-ventas',
    type: 'ui',
    component: 'DashboardVentas',
    collections: ['accounts', 'ordersSellOut', 'users'],
    fields: ['ordersSellOut.totalAmount', 'ordersSellOut.lines', 'accounts.stage', 'accounts.salesRepId'],
    description: 'Dashboard Ventas - Pipeline, evolución',
    file: 'src/features/dashboard-ventas',
    verified: false
  },
  
  // ===== CUENTAS =====
  {
    id: 'accounts-page',
    type: 'ui',
    component: 'AccountsPage',
    collections: ['accounts', 'parties', 'users', 'ordersSellOut', 'interactions'],
    fields: ['accounts.*', 'parties.phones', 'parties.emails', 'users.name'],
    description: 'Página de cuentas - listado y pipeline',
    file: 'src/app/(app)/accounts/page.tsx',
    verified: true
  },
  {
    id: 'new-account-dialog',
    type: 'write',
    component: 'NewAccountDialog',
    collections: ['accounts', 'parties', 'partyRoles'],
    fields: [
      'accounts.id', 'accounts.name', 'accounts.accountType', 'accounts.stage', 
      'accounts.salesRepId', 'accounts.flow', 'accounts.distributorId', 'accounts.source',
      'parties.id', 'parties.name', 'parties.legalName', 'parties.taxId',
      'partyRoles.id', 'partyRoles.role', 'partyRoles.data'
    ],
    description: 'Diálogo crear cuenta - escribe en 3 colecciones',
    file: 'src/features/accounts/components/NewAccountDialog.tsx',
    verified: true
  },
  
  // ===== PEDIDOS =====
  {
    id: 'orders-table',
    type: 'ui',
    component: 'OrdersTable',
    collections: ['ordersSellOut', 'accounts', 'parties'],
    fields: ['ordersSellOut.*', 'accounts.name', 'parties.name'],
    description: 'Tabla de pedidos sell-out',
    file: 'src/features/orders/components/OrdersTable.tsx',
    verified: true
  },
  {
    id: 'quicklog-order',
    type: 'write',
    component: 'QuickLog (Pedido)',
    collections: ['ordersSellOut', 'interactions'],
    fields: [
      'ordersSellOut.id', 'ordersSellOut.accountId', 'ordersSellOut.distributorId',
      'ordersSellOut.lines', 'ordersSellOut.totalAmount', 'ordersSellOut.status',
      'interactions.id', 'interactions.accountId', 'interactions.kind'
    ],
    description: 'QuickLog tab Pedido - crea order + interaction',
    file: 'src/features/quicklog/QuickLogDialog.tsx',
    verified: true
  },
  
  // ===== INTERACCIONES =====
  {
    id: 'quicklog-interaction',
    type: 'write',
    component: 'QuickLog (Interacción)',
    collections: ['interactions', 'accounts'],
    fields: [
      'interactions.id', 'interactions.userId', 'interactions.accountId', 
      'interactions.kind', 'interactions.note', 'interactions.plannedFor',
      'interactions.posItems', 'accounts.lastInteractionAt'
    ],
    description: 'QuickLog tab Interacción - crea interaction, actualiza account',
    file: 'src/features/quicklog/QuickLogDialog.tsx',
    verified: true
  },
  
  // ===== MARKETING POS =====
  {
    id: 'pos-tactics-page',
    type: 'ui',
    component: 'PosTacticsPage',
    collections: ['posTactics', 'accounts', 'posCostCatalog', 'plv_material'],
    fields: [
      'posTactics.*', 'accounts.name', 
      'posCostCatalog.name', 'posCostCatalog.defaultCost',
      'plv_material.name', 'plv_material.cost'
    ],
    description: 'Tácticas POS - lectura de tácticas y catálogo',
    file: 'src/features/marketing/components/PosTacticsClientPage.tsx',
    verified: true
  },
  {
    id: 'pos-catalog-dialog',
    type: 'write',
    component: 'CatalogManagementDialog',
    collections: ['posCostCatalog'],
    fields: [
      'posCostCatalog.id', 'posCostCatalog.name', 'posCostCatalog.family',
      'posCostCatalog.fulfillmentMode', 'posCostCatalog.defaultCost'
    ],
    description: 'Gestión de catálogo POS - escribe materiales/servicios/promos',
    file: 'src/features/marketing/components/PosTacticsClientPage.tsx',
    verified: true
  },
  
  // ===== PRODUCCIÓN =====
  {
    id: 'production-orders',
    type: 'ui',
    component: 'ProductionOrders',
    collections: ['productionOrders', 'billOfMaterials', 'items', 'lots'],
    fields: [
      'productionOrders.*', 'billOfMaterials.items', 
      'items.stdCost', 'lots.lotNumber'
    ],
    description: 'Órdenes de producción - lectura de BOMs y lotes',
    file: 'src/features/production',
    verified: false
  },
  
  // ===== INVENTARIO =====
  {
    id: 'inventory-view',
    type: 'ui',
    component: 'InventoryView',
    collections: ['onHand', 'lots', 'items', 'stockMoves'],
    fields: [
      'onHand.qty', 'onHand.locationId', 'onHand.qcStatus',
      'lots.lotNumber', 'lots.expDate', 'items.name'
    ],
    description: 'Vista de inventario - stock disponible',
    file: 'src/features/warehouse',
    verified: false
  },
  
  // ===== IMPORTACIÓN CSV =====
  {
    id: 'csv-import-accounts',
    type: 'write',
    component: 'CSV Import (Accounts)',
    collections: ['accounts', 'parties', 'partyRoles'],
    fields: [
      'accounts.id', 'accounts.name', 'accounts.accountType', 'accounts.stage',
      'accounts.salesRepId', 'accounts.flow', 'accounts.source',
      'parties.id', 'parties.legalName', 'parties.tradeName', 'parties.taxId',
      'partyRoles.id', 'partyRoles.role'
    ],
    description: 'Importación CSV de cuentas',
    file: 'scripts/import-from-csvs.ts',
    verified: true
  },
  {
    id: 'csv-import-orders',
    type: 'write',
    component: 'CSV Import (Orders)',
    collections: ['ordersSellOut'],
    fields: [
      'ordersSellOut.id', 'ordersSellOut.accountId', 'ordersSellOut.totalAmount',
      'ordersSellOut.status', 'ordersSellOut.flow', 'ordersSellOut.source',
      'ordersSellOut.lines'
    ],
    description: 'Importación CSV de pedidos',
    file: 'scripts/import-from-csvs.ts',
    verified: true
  }
];

// Mapeo de funciones de cálculo
export const COMPUTE_FUNCTIONS: DataFlowNode[] = [
  {
    id: 'calc-pipeline-alerts',
    type: 'compute',
    component: 'getPipelineAlerts',
    collections: ['accounts', 'interactions'],
    fields: [
      'accounts.stage', 'accounts.lastInteractionAt', 'accounts.createdAt',
      'interactions.accountId', 'interactions.createdAt', 'interactions.status'
    ],
    description: 'Calcula alertas de pipeline (días sin contacto, etc.)',
    file: 'src/lib/pipeline-helpers.ts'
  },
  {
    id: 'calc-kpis-ventas',
    type: 'compute',
    component: 'calculateSalesKPIs',
    collections: ['ordersSellOut', 'accounts', 'users'],
    fields: [
      'ordersSellOut.totalAmount', 'ordersSellOut.lines', 'ordersSellOut.createdAt',
      'accounts.salesRepId', 'users.kpiBaseline'
    ],
    description: 'Calcula KPIs de ventas por usuario',
    file: 'src/lib/dashboard-helpers.ts'
  },
  {
    id: 'calc-mix-comercial',
    type: 'compute',
    component: 'calculateMixComercial',
    collections: ['ordersSellOut', 'accounts'],
    fields: [
      'ordersSellOut.flow', 'ordersSellOut.totalAmount',
      'accounts.flow', 'accounts.accountType'
    ],
    description: 'Calcula mix comercial (DIRECT vs PLACEMENT)',
    file: 'src/lib/sales-helpers.ts'
  },
  {
    id: 'calc-inventory',
    type: 'compute',
    component: 'calculateInventoryValue',
    collections: ['onHand', 'items', 'lots'],
    fields: [
      'onHand.qty', 'onHand.itemId', 'onHand.qcStatus',
      'items.stdCost', 'lots.lotNumber'
    ],
    description: 'Calcula valor total de inventario',
    file: 'src/lib/inventory.ts'
  },
  {
    id: 'calc-distributor-performance',
    type: 'compute',
    component: 'getDistributorStats',
    collections: ['ordersSellOut', 'parties', 'partyRoles'],
    fields: [
      'ordersSellOut.distributorId', 'ordersSellOut.totalAmount',
      'parties.serviceArea', 'partyRoles.role'
    ],
    description: 'Estadísticas por distribuidor',
    file: 'src/lib/distributor-helpers.ts'
  }
];

/**
 * Verifica que los datos en SantaData coincidan con lo que esperan los componentes
 */
export function auditDataFlow(data: SantaData): DataFlowIssue[] {
  const issues: DataFlowIssue[] = [];

  // Verificar cada nodo del flujo
  [...UI_DATA_FLOW, ...COMPUTE_FUNCTIONS].forEach(node => {
    // Verificar que las colecciones existen en SantaData
    node.collections.forEach(collectionName => {
      if (!(collectionName in data)) {
        issues.push({
          id: `${node.id}-missing-col-${collectionName}`,
          severity: 'critical',
          category: 'missing_collection',
          title: `Colección "${collectionName}" no existe`,
          description: `${node.component} intenta leer de "${collectionName}" pero no está en SantaData`,
          component: node.component,
          expectedCollection: collectionName,
          fix: `Añadir "${collectionName}" a SantaData en src/domain/ssot.ts y al dataprovider`
        });
      }
    });
  });

  return issues;
}

/**
 * Genera un mapa visual del flujo de datos
 */
export function generateDataFlowMap() {
  return {
    ui: UI_DATA_FLOW.filter(n => n.type === 'ui'),
    write: UI_DATA_FLOW.filter(n => n.type === 'write'),
    compute: COMPUTE_FUNCTIONS
  };
}
