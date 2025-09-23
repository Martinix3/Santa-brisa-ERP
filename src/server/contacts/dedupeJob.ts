
import { db } from '@/lib/firebase/admin';
import type { Party, PartyDuplicate } from '@/domain/ssot';
import { normEmail } from '@/lib/norm/email';
import { normPhone } from '@/lib/norm/phone';
import { normText } from '@/lib/norm/text';

export async function buildDuplicatesCandidates() {
  const qs = await db.collection('parties').limit(2000).get();
  const items = qs.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Party));

  const byVat = new Map<string, string>();
  const seen = new Set<string>();

  for (const p of items) {
    if (p.vat) {
      const key = p.vat;
      if (byVat.has(key)) {
        const a = byVat.get(key)!;
        const b = p.id;
        const id = `dup_${a}_${b}`;
        if (!seen.has(id)) {
          await db.collection('partyDuplicates').doc(id).set({
            id,
            primaryPartyId: a,
            duplicatePartyId: b,
            reason: 'SAME_VAT',
            score: 1,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          } as PartyDuplicate, { merge: true });
          seen.add(id);
        }
      } else byVat.set(key, p.id);
    }
    for (const e of p.emails ?? []) {
      const key = 'E:' + normEmail(typeof e === 'string' ? e : e.value);
      // similar a VAT: omito por brevedad, misma lógica para SAME_EMAIL
    }
    for (const t of p.phones ?? []) {
      const key = 'T:' + normPhone(typeof t === 'string' ? t : t.value);
      // similar a VAT: omito por brevedad, misma lógica para SAME_PHONE
    }
  }
}
