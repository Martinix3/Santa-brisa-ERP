// src/domain/ops.types.ts
// Contratos mínimos y canónicos para el Dashboard (Calendario/Agenda)

export type DepartmentStrict =
  | 'VENTAS'
  | 'MARKETING'
  | 'PRODUCCION'
  | 'ALMACEN'
  | 'FINANZAS'
  | 'CALIDAD';

export const EVENT_DEPARTMENTS: readonly DepartmentStrict[] = [
  'VENTAS',
  'MARKETING',
  'PRODUCCION',
  'ALMACEN',
  'FINANZAS',
  'CALIDAD',
] as const;

/**
 * Evento del calendario del dashboard.
 * Importado por WeekCalendar y page.tsx
 */
export interface CalendarEvent {
  id: string;
  title: string;
  dept: DepartmentStrict;
  startAt: string;            // ISO 8601
  endAt?: string;             // ISO 8601
  accountId?: string;
  accountName?: string;
  notes?: string;
}

/**
 * Convierte un valor Department (p.ej. puede venir 'PERSONAL' u 'OPS')
 * a uno de los 6 departamentos válidos del calendario.
 * Si no coincide, cae a 'VENTAS' por defecto.
 */
export function toEventDept(d: string): DepartmentStrict {
  if ((EVENT_DEPARTMENTS as readonly string[]).includes(d)) {
    return d as DepartmentStrict;
  }
  return 'VENTAS';
}

// Tipos legacy mantenidos por compatibilidad temporal
export type { Department, TaskKind, TaskStatus, Interaction } from './ssot';

export interface Task {
    id: string;
    title: string;
    dueAt: string;
    status: 'open' | 'done' | 'cancelled';
}
