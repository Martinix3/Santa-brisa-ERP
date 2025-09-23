import { holdedFetch } from './client';
import { toPartyPartial, type HoldedContact } from './mapContact';
import { upsertMany, getServerData } from '@/lib/dataprovider/server';
import { scorePartyMatch, SCORE_AUTO } from '@/features/contacts/matching/score';
import type { Party } from '@/domain/ssot';

export async function pullHoldedContacts({ since }:{ since?: string } = {}) {
  let page = 1; const limit = 200; let done = false;
  const upserts: Party[] = [];

  while (!done) {
    const url = new URL('/contacts', 'http://x');
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    if (since) url.searchParams.set('updatedFrom', since);

    const res = await holdedFetch(url.pathname + '?' + url.searchParams.toString());
    const data: HoldedContact[] = await res.json();

    for (const c of data) {
      const incoming = toPartyPartial(c);
      // candidatos: por VAT/phone/email (fetch simple demo; reemplaza por índices reales)
      const { parties } = await getServerData();
      const candidates = parties as Party[];
      const scored = candidates
        .map(p => ({ p, s: scorePartyMatch(incoming, p) }))
        .sort((a, b) => b.s - a.s);

      let target: Party | undefined = scored[0]?.s >= SCORE_AUTO ? scored[0].p : undefined;

      if (target) {
        // merge superficial: aquí sólo rellenamos campos faltantes
        upserts.push({
          ...target,
          legalName: target.legalName || incoming.legalName!,
          tradeName: target.tradeName || incoming.tradeName,
          vat: target.vat || incoming.vat,
          emails: [...(target.emails ?? []), ...(incoming.emails ?? [])],
          phones: [...(target.phones ?? []), ...(incoming.phones ?? [])],
          billingAddress: target.billingAddress ?? incoming.billingAddress,
          shippingAddress: target.shippingAddress ?? incoming.shippingAddress,
          external: { ...target.external, ...incoming.external },
          status: target.status ?? 'VINCULADO',
          updatedAt: new Date().toISOString(),
        } as Party);
      } else {
        // crear nuevo party mínimo
        upserts.push({
          id: crypto.randomUUID(),
          legalName: incoming.legalName || '(Sin nombre)',
          tradeName: incoming.tradeName,
          vat: incoming.vat,
          emails: incoming.emails,
          phones: incoming.phones,
          billingAddress: incoming.billingAddress,
          shippingAddress: incoming.shippingAddress,
          external: incoming.external,
          kind: 'ORG',
          name: incoming.legalName || incoming.tradeName || '(Sin nombre)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          roles: ['OTHER'],
          flags: {}, quality: {}, contacts: [], addresses: [],
        } as unknown as Party);
      }
    }

    done = data.length < limit; page++;
  }

  if (upserts.length) await upsertMany('parties', upserts);
  return { updated: upserts.length };
}
