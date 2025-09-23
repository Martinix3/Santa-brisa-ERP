
import type { Party } from '@/domain/ssot';
import { normText } from '@/lib/norm/text';

export function withDerived(p: Party): Party & { nameNorm?: string } {
  const legal = p.legalName ?? '';
  const trade = p.tradeName ?? '';
  const nameNorm = normText(legal || trade);
  return { ...p, nameNorm } as any;
}
