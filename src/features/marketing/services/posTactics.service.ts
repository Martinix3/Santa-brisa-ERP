'use server';

// Tipo mínimo para satisfacer componentes (ajústalo luego a tu dominio real)
export interface PosTactic {
  id: string;
  accountId: string;
  actualCost: number;
  executionScore: number;
  title?: string;
  status?: 'OPEN'|'CLOSED'|'PLANNED';
}

export async function listPosCostCatalog(..._a:any[]): Promise<any[]> { return []; }
export async function listPlvInStock(..._a:any[]): Promise<any[]> { return []; }
export async function listPosTactics(..._a:any[]): Promise<PosTactic[]> { return []; }

export type UpsertPosTacticInput = Partial<PosTactic> & { accountId: string; title?: string };

export async function upsertPosTactic(input: UpsertPosTacticInput): Promise<PosTactic> {
  // Devuelve algo coherente con el componente (con id estable)
  return {
    id: input['id'] ?? `pt_${Math.random().toString(36).slice(2,8)}`,
    accountId: input.accountId,
    actualCost: 0,
    executionScore: 0,
    title: input.title ?? 'Nueva táctica',
    status: 'OPEN',
  };
}

export async function closePosTactic(id: string): Promise<PosTactic> {
  return {
    id,
    accountId: 'stub-account',
    actualCost: 0,
    executionScore: 0,
    title: 'Cerrada',
    status: 'CLOSED',
  };
}
