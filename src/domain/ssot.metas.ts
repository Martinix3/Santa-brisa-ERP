// Metadatos y constantes para UI
export const SB_COLORS = {
  brand: {
    sun: '#fff5a9',
    sunStrong: '#fecb46',
    agua: '#99d9d9',
    cobre: '#c56a3c',
    naranja: '#ed6a36',
    verdeMar: '#5a9496',
  },
};

export const DEPT_META = {
  VENTAS: { label: 'Ventas', color: '#ea945e', textColor: '#ffffff' },
  MARKETING: { label: 'Marketing', color: '#9dd4d6', textColor: '#2F5D5D' },
  PRODUCCION: { label: 'Producción', color: '#638c8d', textColor: '#ffffff' },
  CALIDAD: { label: 'Calidad', color: '#829fce', textColor: '#ffffff' },
  ALMACEN: { label: 'Almacén', color: '#996947', textColor: '#ffffff' },
  FINANZAS: { label: 'Finanzas', color: '#fecb46', textColor: '#412c00' },
  PERSONAL: { label: 'Personal', color: '#a78bfa', textColor: '#ffffff' },
};

export const MODULE_ACCENTS: Record<string, string> = {
  personal: 'var(--sb-accent-personal)',
  sales: 'var(--sb-accent-ventas)',
  marketing: 'var(--sb-accent-marketing)',
  production: 'var(--sb-accent-produccion)',
  quality: 'var(--sb-accent-calidad)',
  warehouse: 'var(--sb-accent-logistica)',
  finance: 'var(--sb-accent-finance)',
};
