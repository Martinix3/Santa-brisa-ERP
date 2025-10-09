import type { Party, CommItem, Address } from '@/domain/ssot.v7';
import { normEmail } from '@/lib/norm/email';
import { normPhone } from '@/lib/norm/phone';
import { normVat } from '@/lib/norm/cif';

export type HoldedContact = {
  id: string;
  name?: string;          // legalName
  tradeName?: string;     // puede venir como display
  code?: string; // vat
  email?: string;
  phone?: string;
  billing?: { address?: string; city?: string; postalCode?: string; country?: string };
  shipping?: { address?: string; city?: string; postalCode?: string; country?: string };
  updatedAt?: string;
  // ...campos reales extra si los añades
};

function holdedAddressToAddress(holdedAddr?: { address?: string; city?: string; postalCode?: string; country?: string }): Address | undefined {
    if (!holdedAddr || (!holdedAddr.address && !holdedAddr.city)) return undefined;
    return {
        street: holdedAddr.address || '',
        city: holdedAddr.city || '',
        zip: holdedAddr.postalCode || '',
        country: holdedAddr.country || 'España',
    };
}

export function toPartyPartial(c: HoldedContact): Partial<Party> {
  const emails: CommItem[] = c.email ? [{ value: normEmail(c.email), source: 'HOLDED', verified: true, updatedAt: c.updatedAt }]: [];
  const phones: CommItem[] = c.phone ? [{ value: normPhone(c.phone), source: 'HOLDED', verified: true, updatedAt: c.updatedAt }]: [];
  return {
    legalName: c.name || c.tradeName || '',
    tradeName: c.tradeName,
    vat: c.code ? normVat(c.code) : undefined,
    emails,
    phones,
    billingAddress: holdedAddressToAddress(c.billing),
    shippingAddress: holdedAddressToAddress(c.shipping),
    external: { holdedContactId: c.id, holdedUpdatedAt: c.updatedAt },
  };
}
