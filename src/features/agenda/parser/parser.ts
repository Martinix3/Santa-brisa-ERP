// /features/agenda/parser/parser.ts
import { RULES, type NoteKind } from './rules';

export type ParsedNoteAction = {
  kind: NoteKind;
  hasDate: boolean;
  account?: string;
  // ... add more parsed details as needed
};

// Simplified parser based on the mockup logic
export function parseNoteToAction(text: string): ParsedNoteAction {
    const t = text.toLowerCase();
    
    const accountMatch = t.match(/@([\p{L}\d_\-]+)/u);
    const account = accountMatch?.[1];

    const hasHour = /\b(\d{1,2}[:\.][0-5]\d)\b/.test(t);
    const hasDay = /(hoy|mañana|\b\d{1,2}[\/\-]\d{1,2})/.test(t);
    const hasDate = hasHour || hasDay;

    let detectedKind: NoteKind = 'NOTA'; // Default

    for (const rule of RULES) {
        if (rule.keywords.some(kw => t.includes(kw))) {
            detectedKind = rule.kind;
            break; 
        }
    }
    
    // Special override for VISITA
    if (detectedKind === 'NOTA' && !!account && hasDate) {
      detectedKind = 'VISITA';
    }
    
    return {
        kind: detectedKind,
        hasDate,
        account,
    };
}
