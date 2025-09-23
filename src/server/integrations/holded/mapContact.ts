import type { Party, CommItem } from '@/domain/ssot';
import { normEmail } from '@/lib/norm/email';
import { normPhone } from '@/lib/norm/phone';
import { normVat } from '@/lib/norm/cif';

export type HoldedContact = {
  id: string;
  name?: string;          // legalName
  tradeName?: string;     // puede venir como display
  vat?: string;
  email?: string;
  phone?: string;
  billing?: { address?: string; city?: string; zip?: string; country?: string };
  shipping?: { address?: string; city?: string; zip?: string; country?: string };
  updatedAt?: string;
  // ...campos reales extra si los añades
};

export function toPartyPartial(c: HoldedContact): Partial<Party> {
  const emails: CommItem[] = c.email ? [{ value: normEmail(c.email), source: 'HOLDED', verified: true, updatedAt: c.updatedAt }]: [];
  const phones: CommItem[] = c.phone ? [{ value: normPhone(c.phone), source: 'HOLDED', verified: true, updatedAt: c.updatedAt }]: [];
  return {
    legalName: c.name || c.tradeName || '',
    tradeName: c.tradeName,
    vat: c.vat ? normVat(c.vat) : undefined,
    emails,
    phones,
    billingAddress: c.billing,
    shippingAddress: c.shipping,
    external: { holdedContactId: c.id, holdedUpdatedAt: c.updatedAt },
  };
}
