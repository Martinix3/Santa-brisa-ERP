// /features/agenda/parser/rules.ts
export type NoteKind = 'PEDIDO' | 'VISITA' | 'POS_PLV' | 'POS_EVT' | 'POS_MKT' | 'NOTA';

type Rule = {
  kind: NoteKind;
  keywords: string[];
};

export const RULES: Rule[] = [
  { kind: 'PEDIDO', keywords: ['pedido', 'santa brisa', 'caja', 'cajas'] },
  { kind: 'POS_PLV', keywords: ['plv', 'cartel', 'roll-up', 'display', 'expositor'] },
  { kind: 'POS_MKT', keywords: ['mkt', 'marketing', 'promo'] },
  { kind: 'POS_EVT', keywords: ['pos', 'evento', 'activacion'] },
  { kind: 'VISITA', keywords: ['visita', 'reunion'] },
];
