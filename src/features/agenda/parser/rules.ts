// features/agenda/parser/rules.ts
import { Department } from '@/domain/ssot';

export const DEPT_RULES: Array<{dept: Department; keywords: RegExp}> = [
  { dept: 'VENTAS',    keywords: /\b(visita|pedido|cliente|llamar|cerrar|seguimiento)\b/i },
  { dept: 'MARKETING', keywords: /\b(degustaci[oó]n|flyers|evento|plv|cartel|activaci[oó]n|kpi)\b/i },
  { dept: 'ALMACEN',   keywords: /\b(inventario|picking|palet|caja|stock)\b/i },
  { dept: 'PRODUCCION',keywords: /\b(producci[oó]n|lote|envasado|maceraci[oó]n|mezcla)\b/i },
];
