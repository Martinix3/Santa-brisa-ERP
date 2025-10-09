import type { Party } from '@/domain/ssot';

export function toHoldedPayload(p: Party) {
  const email = p.emails?.find(e => e.isPrimary)?.value || p.emails?.[0]?.value;
  const phone = p.phones?.find(t => t.isPrimary)?.value || p.phones?.[0]?.value;
  return {
    name: p.legalName || p.tradeName || 'Contacto',
    tradeName: p.tradeName,
    vat: p.vat,
    email,
    phone,
    billing: p.billingAddress,
    shipping: p.shippingAddress,
  };
}
