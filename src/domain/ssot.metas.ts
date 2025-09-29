
// src/domain/ssot.metas.ts
import type { AccountType, OrderStatus, ShipmentStatus, PartyRoleType, Department, TraceEventPhase, ItemCategory } from './ssot';

export const SB_COLORS = {
  brand: {
    sun:       '#fff5a9',
    sunStrong: '#fecb46',
    agua:      '#99d9d9',
    cobre:     '#c56a3c',
    naranja:   '#ed6a36',
    verdeMar:  '#5a9496',
    neutral50 : '#FAFAFA',
    neutral900: '#111111',
  },
  primary: {
    sun   : '#fff5a9',
    copper: '#c56a3c',
    aqua  : '#99d9d9',
    teal  : '#5a9496',
    neutral50 : '#FAFAFA',
    neutral900: '#111111',
  },
  state: {
    success: '#22c55e',
    warning: '#fecb46',
    danger : '#ef4444',
    info   : '#3b82f6',
  },
  dept: {
    VENTAS:     { bg: '#f2ca67', text: '#3f3414' },
    PRODUCCION: { bg: '#ea945e', text: '#ffffff' },
    ALMACEN:    { bg: '#996947', text: '#ffffff' },
    MARKETING:  { bg: '#9dd4d6', text: '#2F5D5D' },
    FINANZAS:   { bg: '#fecb46', text: '#412c00' },
    CALIDAD:    { bg: '#829fce', text: '#ffffff' },
    PERSONAL:   { bg: '#fbf5b8', text: '#3f3414' },
  },
  lotQC: {
    release: { label: 'LIBERADO',  bg: '#22c55e', text: '#ffffff' },
    hold:    { label: 'RETENIDO',  bg: '#fff5a9', text: '#111111' },
    reject:  { label: 'RECHAZADO', bg: '#ef4444', text: '#ffffff' },
  },
  tokens: {
    radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 4px rgba(0,0,0,0.08)',
      lg: '0 6px 12px rgba(0,0,0,0.08)',
      xl: '0 20px 25px rgba(0,0,0,0.08)',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  },
} as const;

export const SB_THEME = {
  chart: {
    line:  ['#c56a3c', '#ed6a36', '#5a9496', '#99d9d9', '#fecb46'],
    donut: ['#fecb46', '#c56a3c', '#5a9496', '#99d9d9', '#ed6a36'],
    grid:  'hsl(240 6% 90%)',
  },
} as const;

export const PARTY_ROLE_META: Record<PartyRoleType, { label: string; accent: string }> = {
  CUSTOMER: { label: 'Cliente',      accent: SB_COLORS.primary.copper },
  SUPPLIER: { label: 'Proveedor',    accent: SB_COLORS.primary.aqua   },
  DISTRIBUTOR: { label: 'Distribuidor', accent: SB_COLORS.primary.teal  },
  IMPORTER:    { label: 'Importador',   accent: SB_COLORS.primary.teal  },
  INFLUENCER:  { label: 'Influencer',   accent: '#f472b6' },
  CREATOR:     { label: 'Creator',      accent: '#ec4899' },
  EMPLOYEE:    { label: 'Empleado',     accent: '#6366f1' },
  BRAND_AMBASSADOR: { label: 'Brand Ambassador', accent: '#8b5cf6' },
  OTHER:       { label: 'Otro',          accent: '#9ca3af' },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; accent: string }> = {
  open:      { label: 'Abierto',    accent: SB_COLORS.state.info     },
  confirmed: { label: 'Confirmado', accent: SB_COLORS.primary.teal   },
  shipped:   { label: 'Enviado',    accent: SB_COLORS.state.success  },
  invoiced:  { label: 'Facturado',  accent: SB_COLORS.primary.copper },
  paid:      { label: 'Pagado',     accent: SB_COLORS.state.success  },
  cancelled: { label: 'Cancelado',  accent: SB_COLORS.state.danger   },
  lost:      { label: 'Perdido',    accent: SB_COLORS.state.danger   },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; accent: string }> = {
  pending:       { label: 'Pendiente',  accent: SB_COLORS.state.info    },
  picking:       { label: 'Picking',    accent: SB_COLORS.primary.teal  },
  ready_to_ship: { label: 'Validado',   accent: SB_COLORS.primary.teal  },
  shipped:       { label: 'Enviado',    accent: SB_COLORS.state.success },
  delivered:     { label: 'Entregado',  accent: SB_COLORS.state.success },
  cancelled:     { label: 'Cancelado',  accent: SB_COLORS.state.danger  },
  exception:     { label: 'Incidencia', accent: SB_COLORS.state.warning },
};

export const LOT_QC_META = SB_COLORS.lotQC;

export const PHASE_NAME_ES: Record<TraceEventPhase, string> = {
  SOURCE:    'Origen (Almacén)',
  RECEIPT:   'Recepción (Almacén)',
  QC:        'Calidad',
  PRODUCTION:'Producción',
  PACK:      'Embalaje',
  WAREHOUSE:  'Almacén',
  SALE:      'Venta',
  DELIVERY:  'Entrega (Almacén)',
};

export const PHASE_DEPT: Record<TraceEventPhase, Department> = {
  SOURCE:     'ALMACEN',
  RECEIPT:    'ALMACEN',
  QC:         'CALIDAD',
  PRODUCTION: 'PRODUCCION',
  PACK:       'PRODUCCION',
  WAREHOUSE:  'ALMACEN',
  SALE:       'VENTAS',
  DELIVERY:   'ALMACEN',
};

export const phaseStyle = (phase: TraceEventPhase) => {
  const dept = PHASE_DEPT[phase];
  const c = SB_COLORS.dept[dept];
  return { bg: c.bg, text: c.text };
};

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; accent: string }> = {
  HORECA:       { label: 'HORECA',       accent: SB_COLORS.primary.teal   },
  RETAIL:       { label: 'Retail',       accent: SB_COLORS.primary.copper },
  PRIVADA:      { label: 'Privada',      accent: SB_COLORS.state.info     },
  ONLINE:       { label: 'Online',       accent: SB_COLORS.state.info     },
  OTRO:         { label: 'Otro',         accent: '#9CA3AF'                },
  DISTRIBUIDOR: { label: 'Distribuidor', accent: SB_COLORS.primary.aqua   },
};

export const DEPT_META: Record<Department, { label: string; token: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     token: '--sb-accent-ventas',   color: '#ea945e', textColor: '#ffffff' },
  MARKETING:  { label: 'Marketing',  token: '--sb-accent-marketing',color: '#9dd4d6', textColor: '#2F5D5D' },
  PRODUCCION: { label: 'Producción', token: '--sb-accent-produc',   color: '#638c8d', textColor: '#ffffff' },
  CALIDAD:    { label: 'Calidad',    token: '--sb-accent-calidad',  color: '#829fce', textColor: '#ffffff' },
  ALMACEN:    { label: 'Almacén',    token: '--sb-accent-logistica',color: '#996947', textColor: '#ffffff' },
  FINANZAS:   { label: 'Finanzas',   token: '--sb-sun-strong',      color: '#fecb46', textColor: '#412c00' },
  PERSONAL:   { label: 'Personal',   token: '--sb-accent-personal', color: 'hsl(var(--sb-accent-personal))', textColor: 'hsl(var(--sb-neutral-900))' },
};

export const tokenToHsl = (token: string, alpha?: number) =>
  alpha == null ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;
