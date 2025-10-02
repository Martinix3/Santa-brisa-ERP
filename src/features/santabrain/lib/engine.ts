import type { ParseResult } from './types';
import type { SantaData } from '@/domain/ssot';
import { RULES } from './rules';

export function parseNoteToAction(text: string, data: SantaData): ParseResult {
  const sorted = [...RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.condition(text, data)) {
      console.log(`[Santa Brain] Rule matched: ${rule.name}`);
      return rule.execute(text, data);
    }
  }
  return { kind: 'UNKNOWN', summary: text.trim() };
}
