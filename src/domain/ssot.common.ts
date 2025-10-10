// Tipos comunes compartidos
export interface Interaction {
  id: string;
  userId: string;
  accountId: string;
  kind: string;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  status: string;
}
