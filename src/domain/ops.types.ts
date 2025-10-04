// This file is now obsoleto.
// Los tipos 'Task' y 'CalendarEvent' se han integrado en la entidad 'Interaction'
// en 'src/domain/ssot.ts' para tener una única fuente de verdad para la agenda.

// Puedes eliminar este archivo en un futuro refactor. Por ahora, se mantiene para
// evitar errores de importación en componentes que aún no se hayan actualizado.

export type { Department, TaskKind, TaskStatus, Interaction } from './ssot';

// Este tipo se puede mapear desde Interaction
export interface CalendarEvent {
  id: string;
  accountId?: string;
  accountName?: string;
  title: string;
  dept: 'VENTAS' | 'MARKETING' | 'CALIDAD' | 'FINANZAS' | 'PRODUCCION' | 'ALMACEN';
  startAt: string;      // ISO
  endAt: string;        // ISO
  externalRef?: { provider:'google'|'outlook', id:string } | null;
  createdById?: string;
  updatedAt?: string;
}

export interface Task {
    id: string;
    title: string;
    dueAt: string;
    status: TaskStatus;
}
