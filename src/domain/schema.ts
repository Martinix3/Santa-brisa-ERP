// src/domain/schema.ts
// Puente de compatibilidad: reexporta desde ssot y aporta mínimos que el UI espera.

// Reexporta tipos base del dominio consolidado:
export type {
  User,
  Account,
  Product,
  OrderSellOut,
  Interaction,
  SantaData,
  AccountType,
  Stage,
  AccountMode,
  UserRole,
} from './ssot';

// Alias usado en un import: `SantaData as SantaDataType`
export type { SantaData as SantaDataType } from './ssot';

// ---- Stubs / extras que usa el UI en agenda & brain ----

// Departamentos mínimos para agenda
export type Department =
  | 'VENTAS'
  | 'PRODUCCION'
  | 'ALMACEN'
  | 'MARKETING'
  | 'FINANZAS'
  | 'GENERAL';

// Metadatos de departamentos usados por la UI de Agenda
export const DEPT_META: Record<
  Department,
  { label: string; color: string; textColor: string }
> = {
  VENTAS: { label: 'Ventas', color: '#D7713E', textColor: '#40210f' },
  PRODUCCION: { label: 'Producción', color: '#618E8F', textColor: '#153235' },
  ALMACEN:    { label: 'Almacén',    color: '#A7D8D9', textColor: '#17383a' },
  MARKETING:  { label: 'Marketing',  color: '#F7D15F', textColor: '#3f3414' },
  FINANZAS:   { label: 'Finanzas',   color: '#CCCCCC', textColor: '#333333' },
  GENERAL:    { label: 'General',    color: '#A7D8D9', textColor: '#17383a' },
};

// Evento de marketing mínimo que espera santa-brain-flow
export interface EventMarketing {
  id: string;
  title: string;
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'POPUP' | 'OTRO';
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  startAt: string;
  city?: string;
}
