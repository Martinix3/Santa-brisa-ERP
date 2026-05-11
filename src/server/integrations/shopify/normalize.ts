/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/shopify/normalize.ts

type AnyObj = Record<string, any>;

export function normStr(v: any): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function normPhone(v: any): string | undefined {
  const digits = (v ?? '').toString().replace(/\D/g, '');
  return digits || undefined;
}

export type NormalizedAddress = {
  kind: 'BILLING' | 'SHIPPING' | 'OTHER';
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  attention?: string;
  phone?: string;
  email?: string;
};

function pickShopifyAddress(addr: AnyObj, kind: 'BILLING' | 'SHIPPING' | 'OTHER'): NormalizedAddress {
  const street = [
    normStr(addr.address1),
    normStr(addr.address2)
  ].filter(Boolean).join(', ') || undefined;

  return {
    kind,
    street,
    city: normStr(addr.city),
    province: normStr(addr.province) ?? normStr(addr.province_code),
    postalCode: normStr(addr.zip),
    country: normStr(addr.country),
    countryCode: normStr(addr.country_code) ?? normStr(addr.country_code_v2),
    attention: [normStr(addr.name), normStr(addr.company)].filter(Boolean).join(' · ') || undefined,
    phone: normPhone(addr.phone),
    email: normStr(addr.email),
  };
}

export function normalizeShopifyAddresses(order: AnyObj): NormalizedAddress[] {
  const addresses: NormalizedAddress[] = [];

  // Shipping address (principal)
  if (order.shipping_address) {
    const addr = pickShopifyAddress(order.shipping_address, 'SHIPPING');
    if (Object.values(addr).some((v: any) => v !== undefined && v !== 'SHIPPING')) {
      addresses.push(addr);
    }
  }

  // Billing address (si existe y es diferente)
  if (order.billing_address) {
    const addr = pickShopifyAddress(order.billing_address, 'BILLING');
    if (Object.values(addr).some((v: any) => v !== undefined && v !== 'BILLING')) {
      // Check si es diferente a shipping
      const isDifferent = !addresses.some(a => 
        a.street === addr.street && 
        a.city === addr.city && 
        a.postalCode === addr.postalCode
      );
      if (isDifferent) {
        addresses.push(addr);
      }
    }
  }

  return addresses;
}

export function buildCustomerEmails(customer: AnyObj): string[] {
  const emails = new Set<string>();
  const main = normStr(customer.email);
  if (main) emails.add(main.toLowerCase());
  return Array.from(emails);
}

export function buildCustomerPhones(customer: AnyObj, order?: AnyObj): string[] {
  const phones = new Set<string>();
  
  const mainPhone = normPhone(customer.phone);
  if (mainPhone) phones.add(mainPhone);
  
  // Phone del customer
  if (customer.phone) {
    const p = normPhone(customer.phone);
    if (p) phones.add(p);
  }
  
  // Phones de addresses si existen
  if (order?.shipping_address?.phone) {
    const p = normPhone(order.shipping_address.phone);
    if (p) phones.add(p);
  }
  
  if (order?.billing_address?.phone) {
    const p = normPhone(order.billing_address.phone);
    if (p) phones.add(p);
  }
  
  return Array.from(phones);
}

export function trimRaw(obj: AnyObj, maxBytes = 32000): any {
  try {
    const raw = JSON.stringify(obj);
    if (raw.length <= maxBytes) return obj;
    
    // Truncate arrays if too large
    const clone = { ...obj };
    for (const k of Object.keys(clone)) {
      if (Array.isArray(clone[k]) && clone[k].length > 20) {
        clone[k] = clone[k].slice(0, 20);
      }
    }
    return clone;
  } catch {
    return undefined;
  }
}
