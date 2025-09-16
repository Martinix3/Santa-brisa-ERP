// domain/schema.ts
import type { LucideIcon } from 'lucide-react';
import { Factory, Boxes, Megaphone, Briefcase, Banknote, Calendar } from 'lucide-react';
// Re-export all types from ssot.ts
export * from './ssot';
import type { Department as Dept } from './ssot';

// --- Mock Data & Placeholders ---
export const DEPT_META: Record<Dept | 'GENERAL', { label: string; color: string; textColor: string; icon: LucideIcon }> = {
  PRODUCCION: { label: 'Producción', color: '#618E8F', textColor: '#153235', icon: Factory },
  ALMACEN:    { label: 'Almacén',    color: '#A7D8D9', textColor: '#17383a', icon: Boxes },
  MARKETING:  { label: 'Marketing',  color: '#F7D15F', textColor: '#3f3414', icon: Megaphone },
  VENTAS:     { label: 'Ventas',     color: '#D7713E', textColor: '#40210f', icon: Briefcase },
  FINANZAS:   { label: 'Finanzas',   color: '#CCCCCC', textColor: '#333333', icon: Banknote },
  GENERAL:    { label: 'General',    color: '#A7D8D9', textColor: '#17383a', icon: Calendar },
};

/** Devuelve la fecha de hace n días en formato ISO. */
export function isoDaysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}
