import type { Party, CommItem } from '@/domain/ssot';

function mergeCommLists(a: CommItem[] = [], b: CommItem[] = []): CommItem[] {
  const map = new Map<string, CommItem>();
  const up = (x: CommItem) => {
    const key = x.value.toLowerCase();
    const prev = map.get(key);
    if (!prev) return map.set(key, x);
    // Mantener flags positivos y el updatedAt más reciente
    map.set(key, {
      value: prev.value,
      isPrimary: prev.isPrimary || x.isPrimary,
      verified: prev.verified || x.verified,
      source: x.updatedAt && prev.updatedAt && x.updatedAt > prev.updatedAt ? x.source : prev.source,
      updatedAt: [prev.updatedAt, x.updatedAt].filter(Boolean).sort()?.slice(-1)[0],
      optOut: prev.optOut || x.optOut,
    });
  };
  [...a, ...b].forEach(up);
  // Recalcular principal: el más reciente si ninguno marcado
  if (![...map.values()].some(v => v.isPrimary) && map.size) {
    const sorted = [...map.values()].sort((m, n) => (m.updatedAt ?? '') < (n.updatedAt ?? '') ? -1 : 1);
    sorted[sorted.length - 1].isPrimary = true;
  }
  return [...map.values()];
}

export function mergeParties(primary: Party, duplicate: Party): Party {
  return {
    ...primary,
    legalName: primary.legalName || duplicate.legalName,
    tradeName: primary.tradeName || duplicate.tradeName,
    vat: primary.vat || duplicate.vat,
    emails: mergeCommLists(primary.emails, duplicate.emails),
    phones: mergeCommLists(primary.phones, duplicate.phones),
    billingAddress: primary.billingAddress ?? duplicate.billingAddress,
    shippingAddress: primary.shippingAddress ?? duplicate.shippingAddress,
    external: {
      ...primary.external,
      holdedContactId: primary.external?.holdedContactId || duplicate.external?.holdedContactId,
      holdedUpdatedAt: primary.external?.holdedUpdatedAt ?? duplicate.external?.holdedUpdatedAt,
      shopifyCustomerId: primary.external?.shopifyCustomerId || duplicate.external?.shopifyCustomerId,
    },
    people: primary.people?.length ? primary.people : duplicate.people,
    flags: { ...primary.flags },
    quality: primary.quality ?? duplicate.quality,
    status: primary.status ?? duplicate.status,
    updatedAt: new Date().toISOString(),
  };
}
