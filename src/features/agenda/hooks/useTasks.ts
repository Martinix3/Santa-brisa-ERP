/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// Stub temporal para compilación
export type TaskLite = {
  id: string;
  title: string;
  dueAt?: string;
  // Campos adicionales para route.ts
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  accountId?: string;
  accountName?: string;
  assigneeName?: string;
  dept?: string;
};

export type Task = TaskLite; // Alias para compatibilidad

export async function listUserTasks(): Promise<TaskLite[]> { 
  return []; 
}

export async function createTask(_: Partial<TaskLite>): Promise<TaskLite> { 
  return { id: 'tmp', title: '' } as TaskLite; 
}
