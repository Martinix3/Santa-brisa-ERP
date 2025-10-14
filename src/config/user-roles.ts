// src/config/user-roles.ts
import type { UserRole, PermissionConfig, ModulePermission } from '@/domain/ssot';

// Módulos del sistema
export const SYSTEM_MODULES = {
  // Dashboard
  'dashboard': 'Dashboard Principal',
  
  // Sales
  'sales.accounts': 'Cuentas',
  'sales.orders': 'Pedidos',
  'sales.pipeline': 'Pipeline de Ventas',
  
  // Warehouse
  'warehouse.inventory': 'Inventario',
  'warehouse.goods-receipt': 'Recepción de Mercancía',
  'warehouse.shipping': 'Envíos',
  
  // Production
  'production.dashboard': 'Dashboard Producción',
  'production.orders': 'Órdenes de Producción',
  'production.bom': 'Lista de Materiales',
  'production.execution': 'Ejecución de Producción',
  
  // Quality
  'quality.dashboard': 'Dashboard Calidad',
  'quality.tests': 'Tests de Calidad',
  'quality.traceability': 'Trazabilidad',
  'quality.lot-release': 'Liberación de Lotes',
  'quality.parameters': 'Parámetros de Calidad',
  
  // Finance
  'finance.dashboard': 'Dashboard Finanzas',
  'finance.invoices': 'Facturas',
  'finance.payments': 'Pagos',
  'finance.reports': 'Reportes Financieros',
  
  // Marketing
  'marketing.campaigns': 'Campañas',
  'marketing.events': 'Eventos',
  'marketing.social': 'Redes Sociales',
  
  // Admin
  'admin.users': 'Usuarios',
  'admin.settings': 'Configuración',
  'admin.integrations': 'Integraciones',
  'admin.variables': 'Variables del Sistema',
} as const;

// Helper para crear permisos completos
const fullAccess = (): ModulePermission => ({
  view: true,
  create: true,
  edit: true,
  delete: true,
  approve: true,
});

// Helper para permisos de solo lectura
const readOnly = (): ModulePermission => ({
  view: true,
  create: false,
  edit: false,
  delete: false,
  approve: false,
});

// Helper para sin acceso
const noAccess = (): ModulePermission => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
});

// Helper para acceso parcial (view + create + edit)
const partialAccess = (): ModulePermission => ({
  view: true,
  create: true,
  edit: true,
  delete: false,
  approve: false,
});

/**
 * Presets de permisos por rol
 */
export const ROLE_PERMISSION_PRESETS: Record<UserRole, PermissionConfig> = {
  // ========================================
  // OWNER - Acceso Total
  // ========================================
  owner: {
    modules: Object.fromEntries(
      Object.keys(SYSTEM_MODULES).map(mod => [mod, fullAccess()])
    ),
    specialAccess: ['all', 'manage_users', 'system_config', 'export_data', 'delete_data'],
    dataFilters: {
      accountFilter: 'all',
      orderFilter: 'all',
      itemFilter: 'all',
    },
  },
  
  // ========================================
  // ADMIN - Casi todo excepto algunas config críticas
  // ========================================
  admin: {
    modules: {
      // Dashboard - Full
      'dashboard': fullAccess(),
      
      // Sales - Full
      'sales.accounts': fullAccess(),
      'sales.orders': fullAccess(),
      'sales.pipeline': fullAccess(),
      
      // Warehouse - Full
      'warehouse.inventory': fullAccess(),
      'warehouse.goods-receipt': fullAccess(),
      'warehouse.shipping': fullAccess(),
      
      // Production - Full
      'production.dashboard': fullAccess(),
      'production.orders': fullAccess(),
      'production.bom': fullAccess(),
      'production.execution': fullAccess(),
      
      // Quality - Full
      'quality.dashboard': fullAccess(),
      'quality.tests': fullAccess(),
      'quality.traceability': fullAccess(),
      'quality.lot-release': fullAccess(),
      'quality.parameters': fullAccess(),
      
      // Finance - Full
      'finance.dashboard': fullAccess(),
      'finance.invoices': fullAccess(),
      'finance.payments': fullAccess(),
      'finance.reports': fullAccess(),
      
      // Marketing - Full
      'marketing.campaigns': fullAccess(),
      'marketing.events': fullAccess(),
      'marketing.social': fullAccess(),
      
      // Admin - Parcial (no puede delete)
      'admin.users': partialAccess(),
      'admin.settings': readOnly(),
      'admin.integrations': partialAccess(),
      'admin.variables': readOnly(),
    },
    specialAccess: ['manage_users', 'view_reports', 'export_data'],
    dataFilters: {
      accountFilter: 'all',
      orderFilter: 'all',
      itemFilter: 'all',
    },
  },
  
  // ========================================
  // COMERCIAL - Ventas completo + vistas de contexto
  // ========================================
  comercial: {
    modules: {
      // Dashboard - View
      'dashboard': readOnly(),
      
      // Sales - Full
      'sales.accounts': fullAccess(),
      'sales.orders': fullAccess(),
      'sales.pipeline': fullAccess(),
      
      // Warehouse - View (para contexto de stock)
      'warehouse.inventory': readOnly(),
      'warehouse.goods-receipt': readOnly(),
      'warehouse.shipping': readOnly(),
      
      // Production - No acceso
      'production.dashboard': noAccess(),
      'production.orders': noAccess(),
      'production.bom': noAccess(),
      'production.execution': noAccess(),
      
      // Quality - No acceso
      'quality.dashboard': noAccess(),
      'quality.tests': noAccess(),
      'quality.traceability': noAccess(),
      'quality.lot-release': noAccess(),
      'quality.parameters': noAccess(),
      
      // Finance - View (para contexto de pagos)
      'finance.dashboard': readOnly(),
      'finance.invoices': readOnly(),
      'finance.payments': readOnly(),
      'finance.reports': readOnly(),
      
      // Marketing - Parcial
      'marketing.campaigns': partialAccess(),
      'marketing.events': partialAccess(),
      'marketing.social': readOnly(),
      
      // Admin - No acceso
      'admin.users': noAccess(),
      'admin.settings': noAccess(),
      'admin.integrations': noAccess(),
      'admin.variables': noAccess(),
    },
    specialAccess: ['create_orders', 'view_own_kpis', 'export_own_data'],
    dataFilters: {
      accountFilter: 'assigned_territory',
      orderFilter: 'own_accounts_only',
      itemFilter: 'active_only',
    },
  },
  
  // ========================================
  // OPS - Operaciones (Producción, Almacén, Calidad)
  // ========================================
  ops: {
    modules: {
      // Dashboard - View
      'dashboard': readOnly(),
      
      // Sales - View (para contexto)
      'sales.accounts': readOnly(),
      'sales.orders': readOnly(),
      'sales.pipeline': readOnly(),
      
      // Warehouse - Full
      'warehouse.inventory': fullAccess(),
      'warehouse.goods-receipt': fullAccess(),
      'warehouse.shipping': fullAccess(),
      
      // Production - Full
      'production.dashboard': fullAccess(),
      'production.orders': fullAccess(),
      'production.bom': fullAccess(),
      'production.execution': fullAccess(),
      
      // Quality - Full
      'quality.dashboard': fullAccess(),
      'quality.tests': fullAccess(),
      'quality.traceability': fullAccess(),
      'quality.lot-release': fullAccess(),
      'quality.parameters': fullAccess(),
      
      // Finance - No acceso
      'finance.dashboard': noAccess(),
      'finance.invoices': noAccess(),
      'finance.payments': noAccess(),
      'finance.reports': noAccess(),
      
      // Marketing - No acceso
      'marketing.campaigns': noAccess(),
      'marketing.events': noAccess(),
      'marketing.social': noAccess(),
      
      // Admin - No acceso
      'admin.users': noAccess(),
      'admin.settings': noAccess(),
      'admin.integrations': noAccess(),
      'admin.variables': noAccess(),
    },
    specialAccess: ['manage_production', 'quality_approval', 'manage_inventory'],
    dataFilters: {
      accountFilter: 'all',
      orderFilter: 'all',
      itemFilter: 'all',
    },
  },
  
  // ========================================
  // INVERSOR - Read-Only Total
  // ========================================
  inversor: {
    modules: {
      // Dashboard - View
      'dashboard': readOnly(),
      
      // Sales - View
      'sales.accounts': readOnly(),
      'sales.orders': readOnly(),
      'sales.pipeline': readOnly(),
      
      // Warehouse - View
      'warehouse.inventory': readOnly(),
      'warehouse.goods-receipt': readOnly(),
      'warehouse.shipping': readOnly(),
      
      // Production - View
      'production.dashboard': readOnly(),
      'production.orders': readOnly(),
      'production.bom': readOnly(),
      'production.execution': readOnly(),
      
      // Quality - View
      'quality.dashboard': readOnly(),
      'quality.tests': readOnly(),
      'quality.traceability': readOnly(),
      'quality.lot-release': readOnly(),
      'quality.parameters': readOnly(),
      
      // Finance - View
      'finance.dashboard': readOnly(),
      'finance.invoices': readOnly(),
      'finance.payments': readOnly(),
      'finance.reports': readOnly(),
      
      // Marketing - View
      'marketing.campaigns': readOnly(),
      'marketing.events': readOnly(),
      'marketing.social': readOnly(),
      
      // Admin - No acceso
      'admin.users': noAccess(),
      'admin.settings': noAccess(),
      'admin.integrations': noAccess(),
      'admin.variables': noAccess(),
    },
    specialAccess: ['view_financial_reports', 'export_data'],
    dataFilters: {
      accountFilter: 'all',
      orderFilter: 'all',
      itemFilter: 'all',
      hideSensitiveData: true, // Ocultar costos unitarios, márgenes
    },
  },
  
  // ========================================
  // DISTRIBUIDOR - Acceso Limitado
  // ========================================
  distribuidor: {
    modules: {
      // Dashboard - View (sus métricas)
      'dashboard': readOnly(),
      
      // Sales - View limitado (solo sus cuentas)
      'sales.accounts': readOnly(),
      'sales.orders': readOnly(),
      'sales.pipeline': noAccess(),
      
      // Warehouse - View limitado (stock disponible)
      'warehouse.inventory': readOnly(),
      'warehouse.goods-receipt': noAccess(),
      'warehouse.shipping': readOnly(),
      
      // Production - No acceso
      'production.dashboard': noAccess(),
      'production.orders': noAccess(),
      'production.bom': noAccess(),
      'production.execution': noAccess(),
      
      // Quality - No acceso
      'quality.dashboard': noAccess(),
      'quality.tests': noAccess(),
      'quality.traceability': noAccess(),
      'quality.lot-release': noAccess(),
      'quality.parameters': noAccess(),
      
      // Finance - No acceso
      'finance.dashboard': noAccess(),
      'finance.invoices': noAccess(),
      'finance.payments': noAccess(),
      'finance.reports': noAccess(),
      
      // Marketing - No acceso
      'marketing.campaigns': noAccess(),
      'marketing.events': noAccess(),
      'marketing.social': noAccess(),
      
      // Admin - No acceso
      'admin.users': noAccess(),
      'admin.settings': noAccess(),
      'admin.integrations': noAccess(),
      'admin.variables': noAccess(),
    },
    specialAccess: [],
    dataFilters: {
      accountFilter: 'assigned_territory',
      orderFilter: 'own_accounts_only',
      itemFilter: 'active_only',
      hideFinancialData: true,
    },
  },
};

/**
 * Metadatos de roles para UI
 */
export const ROLE_META: Record<UserRole, {
  label: string;
  description: string;
  color: string;
  icon: string;
}> = {
  owner: {
    label: 'Propietario',
    description: 'Acceso total al sistema',
    color: 'bg-purple-100 text-purple-800',
    icon: '👑',
  },
  admin: {
    label: 'Administrador',
    description: 'Gestión completa del sistema',
    color: 'bg-purple-100 text-purple-800',
    icon: '⚙️',
  },
  comercial: {
    label: 'Comercial',
    description: 'Gestión de ventas y cuentas',
    color: 'bg-blue-100 text-blue-800',
    icon: '💼',
  },
  ops: {
    label: 'Operaciones',
    description: 'Producción, almacén y calidad',
    color: 'bg-green-100 text-green-800',
    icon: '🏭',
  },
  inversor: {
    label: 'Inversor',
    description: 'Solo lectura (reportes)',
    color: 'bg-amber-100 text-amber-800',
    icon: '👔',
  },
  distribuidor: {
    label: 'Distribuidor',
    description: 'Acceso limitado a su zona',
    color: 'bg-teal-100 text-teal-800',
    icon: '🚚',
  },
};

/**
 * Roles que tienen acceso a territorio
 */
export const SALES_ROLES: UserRole[] = ['comercial', 'distribuidor'];

/**
 * Helper para verificar si un rol tiene acceso a territorio
 */
export function roleHasTerritory(role: UserRole): boolean {
  return SALES_ROLES.includes(role);
}

/**
 * Helper para verificar si un rol puede tener distribuidores asignados
 */
export function roleCanHaveDistributors(role: UserRole): boolean {
  return role === 'comercial';
}

/**
 * Helper para obtener permisos por defecto de un rol
 */
export function getDefaultPermissionsForRole(role: UserRole): PermissionConfig {
  return ROLE_PERMISSION_PRESETS[role];
}
